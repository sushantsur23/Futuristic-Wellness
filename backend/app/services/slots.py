import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.availability import AvailabilityRule, AvailabilityException, Slot
from backend.app.models.session import SessionType

logger = logging.getLogger("slots_service")

async def generate_slots(
    db: AsyncSession,
    doctor_id: uuid.UUID,
    start_date: date,
    end_date: date
) -> None:
    """
    Materializes slot rows from availability_rules minus availability_exceptions.
    Idempotent: updates capacity, skips already booked slots.
    """
    # Cap end_date at today + 6 months
    max_date = date.today() + timedelta(days=180)
    if end_date > max_date:
        end_date = max_date

    # Fetch all rules and session types
    result_rules = await db.execute(
        select(AvailabilityRule).where(AvailabilityRule.doctor_id == doctor_id)
    )
    rules = result_rules.scalars().all()

    # Pre-fetch active session types for the doctor
    result_types = await db.execute(
        select(SessionType).where(
            (SessionType.doctor_id == doctor_id) & (SessionType.is_active == True)
        )
    )
    session_types = {st.id: st for st in result_types.scalars().all()}

    # Fetch exceptions for this date range
    result_exceptions = await db.execute(
        select(AvailabilityException).where(
            (AvailabilityException.doctor_id == doctor_id) &
            (AvailabilityException.date >= start_date) &
            (AvailabilityException.date <= end_date)
        )
    )
    exceptions = result_exceptions.scalars().all()

    # Index exceptions by date for easier access
    # {(date, session_type_id or None): exception}
    exc_map = {}
    for exc in exceptions:
        exc_map[(exc.date, exc.session_type_id)] = exc

    # Iterate day-by-day
    current_date = start_date
    delta_day = timedelta(days=1)

    added_in_session = set()

    while current_date <= end_date:
        weekday = current_date.weekday()  # 0=Mon, 6=Sun
        
        # Check global exception for this day (session_type_id = None)
        global_blocked = exc_map.get((current_date, None))
        if global_blocked and global_blocked.is_blocked:
            current_date += delta_day
            continue

        # Find rules for this weekday valid on current_date
        day_rules = [
            r for r in rules 
            if r.day_of_week == weekday and r.valid_from <= current_date <= r.valid_to
        ]

        for rule in day_rules:
            session_type = session_types.get(rule.session_type_id)
            if not session_type:
                continue  # Session type not active or doesn't exist
            
            # Check session-type specific exceptions for this date
            specific_exc = exc_map.get((current_date, rule.session_type_id))
            
            if specific_exc and specific_exc.is_blocked:
                continue  # Blocked for this session type
            
            # Determine start and end times for this day
            start_t = rule.start_time
            end_t = rule.end_time

            # Generate slots
            # Build datetime objects in UTC (or local timezone aware - let's use UTC for standard database matching)
            start_dt = datetime.combine(current_date, start_t).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(current_date, end_t).replace(tzinfo=timezone.utc)
            duration = timedelta(minutes=session_type.duration_minutes)

            temp_dt = start_dt
            while temp_dt + duration <= end_dt:
                slot_start = temp_dt
                slot_end = temp_dt + duration
                temp_dt = slot_end

                key = (doctor_id, slot_start, rule.session_type_id)
                if key in added_in_session:
                    continue
                added_in_session.add(key)

                # Check if slot falls inside exception time window
                is_exception_blocked = False
                if specific_exc and specific_exc.start_time and specific_exc.end_time:
                    slot_t = slot_start.time()
                    if specific_exc.start_time <= slot_t < specific_exc.end_time:
                        is_exception_blocked = True

                # Check if slot already exists in DB
                result_slot = await db.execute(
                    select(Slot).where(
                        (Slot.doctor_id == doctor_id) &
                        (Slot.start_at == slot_start) &
                        (Slot.session_type_id == rule.session_type_id)
                    )
                )
                existing_slot = result_slot.scalars().first()

                if existing_slot:
                    # Idempotent check: if slot is not booked, we can update capacity/status
                    if existing_slot.booked_count == 0:
                        existing_slot.capacity = session_type.capacity
                        existing_slot.status = "BLOCKED" if is_exception_blocked else "OPEN"
                else:
                    if not is_exception_blocked:
                        # Create new open slot only if not blocked by exception
                        new_slot = Slot(
                            doctor_id=doctor_id,
                            session_type_id=rule.session_type_id,
                            start_at=slot_start,
                            end_at=slot_end,
                            capacity=session_type.capacity,
                            booked_count=0,
                            status="OPEN"
                        )
                        db.add(new_slot)
                    
        current_date += delta_day

    await db.commit()
    print(f"[Slot Materialization] Generated slots from {start_date} to {end_date} for doctor {doctor_id}")
