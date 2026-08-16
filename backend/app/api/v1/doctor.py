import uuid
from datetime import date, datetime, timedelta, time, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.deps import get_db, is_doctor
from backend.app.models.user import User
from backend.app.models.doctor import DoctorProfile
from backend.app.models.client import ClientProfile
from backend.app.models.session import SessionType
from backend.app.models.availability import AvailabilityRule, AvailabilityException, Slot
from backend.app.models.appointment import Appointment
from backend.app.models.review import Review
from backend.app.schemas.session import SessionTypeCreate, SessionTypeUpdate, SessionTypeOut
from backend.app.schemas.availability import AvailabilityRuleCreate, BulkAvailabilityRuleCreate, AvailabilityRuleOut, AvailabilityExceptionCreate, AvailabilityExceptionOut, SlotOut
from backend.app.schemas.prescription import RegisteredClientOut, ClientDetailUpdate
from backend.app.schemas.doctor import DoctorProfileUpdate
from backend.app.services.slots import generate_slots

router = APIRouter()

@router.get("", response_model=dict)
async def get_doctor_profile(db: AsyncSession = Depends(get_db)):
    """
    Returns the single doctor's profile.
    """
    result = await db.execute(
        select(DoctorProfile, User.full_name, User.email, User.phone)
        .join(User, DoctorProfile.user_id == User.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found. Run the seed script."
        )
    doc, name, email, phone = row
    return {
        "id": doc.id,
        "full_name": name,
        "email": email,
        "phone": phone,
        "specialization": doc.specialization,
        "registration_number": doc.registration_number,
        "signature_url": doc.signature_url,
        "picture_url": doc.picture_url or "/static/uploads/doctor_default.png",
        "bio": doc.bio,
        "linkedin_url": doc.linkedin_url,
        "instagram_url": doc.instagram_url,
        "facebook_url": doc.facebook_url,
        "youtube_url": getattr(doc, "youtube_url", None),
        "trustpilot_url": getattr(doc, "trustpilot_url", None),
        "show_social_links": doc.show_social_links,
        "show_linkedin": getattr(doc, "show_linkedin", True),
        "show_instagram": getattr(doc, "show_instagram", True),
        "show_facebook": getattr(doc, "show_facebook", True),
        "show_youtube": getattr(doc, "show_youtube", True),
        "show_trustpilot": getattr(doc, "show_trustpilot", True)
    }

@router.patch("/profile", response_model=dict)
async def update_doctor_profile(
    data: DoctorProfileUpdate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Update doctor's profile details including social media links and client display toggle.
    """
    result = await db.execute(
        select(DoctorProfile, User)
        .join(User, DoctorProfile.user_id == User.id)
        .where(DoctorProfile.user_id == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    doc, user_obj = row

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(doc, field):
            setattr(doc, field, value)

    await db.commit()
    await db.refresh(doc)

    return {
        "id": doc.id,
        "full_name": user_obj.full_name,
        "email": user_obj.email,
        "phone": user_obj.phone,
        "specialization": doc.specialization,
        "registration_number": doc.registration_number,
        "signature_url": doc.signature_url,
        "picture_url": doc.picture_url or "/static/uploads/doctor_default.png",
        "bio": doc.bio,
        "linkedin_url": doc.linkedin_url,
        "instagram_url": doc.instagram_url,
        "facebook_url": doc.facebook_url,
        "youtube_url": getattr(doc, "youtube_url", None),
        "trustpilot_url": getattr(doc, "trustpilot_url", None),
        "show_social_links": doc.show_social_links,
        "show_linkedin": getattr(doc, "show_linkedin", True),
        "show_instagram": getattr(doc, "show_instagram", True),
        "show_facebook": getattr(doc, "show_facebook", True),
        "show_youtube": getattr(doc, "show_youtube", True),
        "show_trustpilot": getattr(doc, "show_trustpilot", True)
    }

@router.get("/session-types", response_model=List[SessionTypeOut])
async def get_session_types(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active session types, optionally filtered by category.
    """
    query = select(SessionType).where(SessionType.is_active == True)
    if category:
        query = query.where(SessionType.category == category)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/session-types", response_model=SessionTypeOut)
async def create_session_type(
    data: SessionTypeCreate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new session type (Doctor only).
    """
    # Get doctor profile
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    new_type = SessionType(
        doctor_id=doc.id,
        name=data.name,
        category=data.category,
        duration_minutes=data.duration_minutes,
        capacity=data.capacity,
        description=data.description,
        is_active=data.is_active
    )
    db.add(new_type)
    await db.commit()
    await db.refresh(new_type)
    return new_type

@router.patch("/session-types/{id}", response_model=SessionTypeOut)
async def update_session_type(
    id: uuid.UUID,
    data: SessionTypeUpdate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Update session type (Doctor only).
    Does not delete historical appointments.
    """
    result = await db.execute(select(SessionType).where(SessionType.id == id))
    session_type = result.scalars().first()
    if not session_type:
        raise HTTPException(status_code=404, detail="Session type not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(session_type, field, value)

    await db.commit()
    await db.refresh(session_type)
    return session_type

@router.delete("/session-types/{id}", response_model=dict)
async def delete_session_type(
    id: uuid.UUID,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific session type / service created by doctor.
    Prevents deletion if there are active booked slots.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    st_res = await db.execute(
        select(SessionType).where(
            (SessionType.id == id) & (SessionType.doctor_id == doc.id)
        )
    )
    session_type = st_res.scalars().first()
    if not session_type:
        raise HTTPException(status_code=404, detail="Service type not found")

    # Check for booked slots
    booked_slots = await db.execute(
        select(Slot).where(
            (Slot.session_type_id == id) & (Slot.booked_count > 0)
        )
    )
    if booked_slots.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete service with active client bookings. Please cancel client bookings first."
        )

    await db.delete(session_type)
    await db.commit()
    return {"message": f"Service '{session_type.name}' deleted successfully."}

@router.delete("/session-types", response_model=dict)
async def delete_all_session_types(
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Shortcut action: Delete all existing services created by doctor.
    Services with active client bookings are preserved.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    st_res = await db.execute(
        select(SessionType).where(SessionType.doctor_id == doc.id)
    )
    all_session_types = st_res.scalars().all()

    deleted_count = 0
    skipped_count = 0

    for st in all_session_types:
        booked_check = await db.execute(
            select(Slot).where(
                (Slot.session_type_id == st.id) & (Slot.booked_count > 0)
            )
        )
        if booked_check.scalars().first():
            skipped_count += 1
        else:
            await db.delete(st)
            deleted_count += 1

    await db.commit()

    msg = f"Deleted {deleted_count} existing service(s)."
    if skipped_count > 0:
        msg += f" {skipped_count} service(s) preserved due to active client bookings."

    return {
        "deleted_count": deleted_count,
        "skipped_count": skipped_count,
        "message": msg
    }

@router.get("/availability-rules", response_model=List[AvailabilityRuleOut])
async def get_availability_rules(
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    List all availability rules for the doctor.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    rules_res = await db.execute(
        select(AvailabilityRule).where(AvailabilityRule.doctor_id == doc.id).order_by(AvailabilityRule.day_of_week.asc())
    )
    return rules_res.scalars().all()

@router.delete("/availability-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an availability rule.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    rule_res = await db.execute(
        select(AvailabilityRule).where(
            (AvailabilityRule.id == rule_id) & (AvailabilityRule.doctor_id == doc.id)
        )
    )
    rule = rule_res.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await db.delete(rule)
    await db.commit()
    
    # Re-trigger slot materialization for doctor profile
    today = date.today()
    six_months = today + timedelta(days=180)
    await generate_slots(db, doc.id, today, six_months)
    return None

@router.post("/availability/cancel-all", response_model=dict)
async def cancel_all_availability(
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Shortcut action: Cancel all current active availability rules and unbooked open slots.
    STRICT REQUIREMENT: Preserves any availability slot where a client has booked their time slot (booked_count > 0).
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    # 1. Delete all AvailabilityRules for this doctor
    rules_res = await db.execute(
        select(AvailabilityRule).where(AvailabilityRule.doctor_id == doc.id)
    )
    rules = rules_res.scalars().all()
    rules_cancelled_count = len(rules)
    for r in rules:
        await db.delete(r)

    # 2. Query all slots for doctor
    slots_res = await db.execute(
        select(Slot).where(Slot.doctor_id == doc.id)
    )
    slots = slots_res.scalars().all()

    slots_cancelled_count = 0
    booked_preserved_count = 0

    for s in slots:
        if s.booked_count > 0:
            booked_preserved_count += 1
        else:
            await db.delete(s)
            slots_cancelled_count += 1

    await db.commit()

    msg = f"Successfully cancelled {rules_cancelled_count} active rule(s) and {slots_cancelled_count} unbooked open slot(s)."
    if booked_preserved_count > 0:
        msg += f" Preserved {booked_preserved_count} time slot(s) booked by clients."

    return {
        "cancelled_rules": rules_cancelled_count,
        "cancelled_slots": slots_cancelled_count,
        "preserved_booked_slots": booked_preserved_count,
        "message": msg
    }

@router.post("/availability-rules", response_model=AvailabilityRuleOut)
async def create_availability_rule(
    data: AvailabilityRuleCreate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a recurring weekly availability rule (Doctor only).
    Enforces maximum 6-month valid_to range.
    Triggers slot generation immediately.
    """
    if data.valid_to > data.valid_from + timedelta(days=180):
        data.valid_to = data.valid_from + timedelta(days=180)

    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    # Verify session type exists
    st_res = await db.execute(select(SessionType).where(SessionType.id == data.session_type_id))
    if not st_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid session type ID")

    new_rule = AvailabilityRule(
        doctor_id=doc.id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        session_type_id=data.session_type_id,
        valid_from=data.valid_from,
        valid_to=data.valid_to
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)

    # Trigger slot generation immediately
    await generate_slots(db, doc.id, data.valid_from, data.valid_to)

    return new_rule

@router.post("/availability-rules/bulk", response_model=List[AvailabilityRuleOut])
async def create_bulk_availability_rules(
    data: BulkAvailabilityRuleCreate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Create availability rules in bulk for multiple days (Doctor only).
    Enforces a minimum 6-hour advance notice rule for same-day availability configuration.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    st_res = await db.execute(select(SessionType).where(SessionType.id == data.session_type_id))
    if not st_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid session type ID")

    today = date.today()
    start_d = data.valid_from or today
    max_d = data.valid_to or (today + timedelta(days=180))

    # Enforce 6-hour lead time check if configuring same-day start
    if start_d == today:
        now_utc = datetime.now(timezone.utc)
        min_time = (now_utc + timedelta(hours=6)).time()
        if data.start_time < min_time:
            raise HTTPException(
                status_code=400,
                detail="Availability updates require a minimum 6-hour advance notice."
            )

    created_rules = []
    for day in data.days_of_week:
        new_rule = AvailabilityRule(
            doctor_id=doc.id,
            day_of_week=day,
            start_time=data.start_time,
            end_time=data.end_time,
            session_type_id=data.session_type_id,
            valid_from=start_d,
            valid_to=max_d
        )
        db.add(new_rule)
        created_rules.append(new_rule)

    await db.commit()

    for r in created_rules:
        await db.refresh(r)

    # Trigger slot generation immediately
    await generate_slots(db, doc.id, start_d, max_d)

    return created_rules

@router.post("/availability-exceptions", response_model=AvailabilityExceptionOut)
async def create_availability_exception(
    data: AvailabilityExceptionCreate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Create availability exception (Doctor only).
    Triggers slot generation override immediately.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    new_exc = AvailabilityException(
        doctor_id=doc.id,
        session_type_id=data.session_type_id,
        date=data.date,
        is_blocked=data.is_blocked,
        start_time=data.start_time,
        end_time=data.end_time
    )
    db.add(new_exc)
    await db.commit()
    await db.refresh(new_exc)

    # Re-trigger slot generation for this day to apply exceptions
    await generate_slots(db, doc.id, data.date, data.date)

    return new_exc

@router.get("/availability", response_model=List[SlotOut])
async def get_doctor_slots_calendar(
    category: Optional[str] = None,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all slots (calendar view) for the doctor. Includes open, full, blocked.
    """
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    query = select(Slot).where(Slot.doctor_id == doc.id)
    if category:
        query = query.join(SessionType).where(SessionType.category == category)
    
    # Limit to next 6 months
    today = date.today()
    six_months_later = today + timedelta(days=180)
    query = query.where(
        (Slot.start_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc)) &
        (Slot.start_at <= datetime.combine(six_months_later, time.max).replace(tzinfo=timezone.utc))
    )

    result_slots = await db.execute(query.order_by(Slot.start_at.asc()))
    return result_slots.scalars().all()

@router.get("/slots", response_model=List[SlotOut])
async def get_open_slots(
    session_type_id: uuid.UUID = Query(...),
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Get open, bookable slots for clients in a date range.
    Enforces maximum 1-month window (30 days) and minimum 3-hour lead time from current datetime.
    """
    today = date.today()
    max_allowed = today + timedelta(days=30)
    if to_date > max_allowed:
        to_date = max_allowed

    now_utc = datetime.now(timezone.utc)
    min_lead_time = now_utc + timedelta(hours=3)

    requested_from_dt = datetime.combine(from_date, time.min).replace(tzinfo=timezone.utc)
    from_dt = max(requested_from_dt, min_lead_time)
    to_dt = datetime.combine(to_date, time.max).replace(tzinfo=timezone.utc)

    # Fetch slots where booked_count < capacity, status is OPEN, and start_at >= min_lead_time
    result = await db.execute(
        select(Slot).where(
            (Slot.session_type_id == session_type_id) &
            (Slot.start_at >= from_dt) &
            (Slot.start_at <= to_dt) &
            (Slot.status == "OPEN") &
            (Slot.booked_count < Slot.capacity)
        ).order_by(Slot.start_at.asc())
    )
    return result.scalars().all()

@router.get("/clients", response_model=List[RegisteredClientOut])
async def get_registered_clients(
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    List all registered patients/clients for prescription assignment and patient management (Doctor only).
    """
    result = await db.execute(
        select(ClientProfile, User)
        .join(User, ClientProfile.user_id == User.id)
    )
    rows = result.all()
    client_list = []
    for client_profile, user in rows:
        client_list.append(RegisteredClientOut(
            id=client_profile.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            alternate_phone=client_profile.alternate_phone,
            date_of_birth=client_profile.date_of_birth,
            gender=client_profile.gender,
            address=client_profile.address,
            medical_history_summary=client_profile.medical_history_summary
        ))
    return client_list

@router.patch("/clients/{client_id}", response_model=RegisteredClientOut)
async def update_client_details(
    client_id: uuid.UUID,
    data: ClientDetailUpdate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Alter/update specific patient/client details (Doctor only).
    Updates database records for User and ClientProfile immediately.
    """
    result = await db.execute(
        select(ClientProfile, User)
        .join(User, ClientProfile.user_id == User.id)
        .where(ClientProfile.id == client_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient record not found")

    client_profile, user = row

    # Update User model fields
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        user.email = data.email.strip().lower()
    if data.phone is not None:
        user.phone = data.phone.strip()

    # Update ClientProfile model fields
    if data.alternate_phone is not None:
        client_profile.alternate_phone = data.alternate_phone.strip() if data.alternate_phone else None
    if data.date_of_birth is not None:
        client_profile.date_of_birth = data.date_of_birth
    if data.gender is not None:
        client_profile.gender = data.gender
    if data.address is not None:
        client_profile.address = data.address
    if data.medical_history_summary is not None:
        client_profile.medical_history_summary = data.medical_history_summary

    await db.commit()
    await db.refresh(user)
    await db.refresh(client_profile)

    return RegisteredClientOut(
        id=client_profile.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        alternate_phone=client_profile.alternate_phone,
        date_of_birth=client_profile.date_of_birth,
        gender=client_profile.gender,
        address=client_profile.address,
        medical_history_summary=client_profile.medical_history_summary
    )

@router.get("/metrics", response_model=dict)
async def get_doctor_metrics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns visual growth metrics for doctor:
    1. Bookings split into online vs offline (total + daily timeline).
    2. Customer satisfaction breakdown (Happy: 4-5 stars, Neutral: 3 stars, Unhappy: 1-2 stars).
    """
    doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc_profile = doc_res.scalars().first()
    if not doc_profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Date range parsing
    now = datetime.now(timezone.utc)
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            start_dt = now - timedelta(days=30)
    else:
        start_dt = now - timedelta(days=30)

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            end_dt = now
    else:
        end_dt = now

    # Fetch appointments for this doctor in date range
    app_query = (
        select(Appointment, Slot)
        .join(Slot, Appointment.slot_id == Slot.id)
        .where(
            (Slot.doctor_id == doc_profile.id) &
            (Appointment.booked_at >= start_dt) &
            (Appointment.booked_at <= end_dt)
        )
        .order_by(Appointment.booked_at.asc())
    )
    app_res = await db.execute(app_query)
    rows = app_res.all()

    online_count = 0
    offline_count = 0
    daily_map = {}

    for app_obj, slot_obj in rows:
        mode = getattr(app_obj, "mode", "ONLINE") or "ONLINE"
        mode_upper = mode.upper()
        if mode_upper == "OFFLINE":
            offline_count += 1
        else:
            online_count += 1

        day_str = app_obj.booked_at.strftime("%Y-%m-%d")
        if day_str not in daily_map:
            daily_map[day_str] = {"date": day_str, "online": 0, "offline": 0, "total": 0}
        
        if mode_upper == "OFFLINE":
            daily_map[day_str]["offline"] += 1
        else:
            daily_map[day_str]["online"] += 1
        daily_map[day_str]["total"] += 1

    total_bookings = online_count + offline_count
    daily_breakdown = list(daily_map.values())

    # Fetch reviews for doctor in date range
    rev_query = (
        select(Review)
        .where(
            (Review.doctor_id == doc_profile.id) &
            (Review.created_at >= start_dt) &
            (Review.created_at <= end_dt)
        )
    )
    rev_res = await db.execute(rev_query)
    reviews = rev_res.scalars().all()

    happy_count = 0
    neutral_count = 0
    unhappy_count = 0
    rating_distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    total_stars = 0

    for r in reviews:
        stars = r.rating
        if stars in rating_distribution:
            rating_distribution[stars] += 1
        total_stars += stars

        if stars >= 4:
            happy_count += 1
        elif stars == 3:
            neutral_count += 1
        else:
            unhappy_count += 1

    total_reviews = len(reviews)
    avg_rating = round(total_stars / total_reviews, 2) if total_reviews > 0 else 0.0

    return {
        "date_range": {
            "start_date": start_dt.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d")
        },
        "bookings_metrics": {
            "total_bookings": total_bookings,
            "online_count": online_count,
            "offline_count": offline_count,
            "online_percentage": round((online_count / total_bookings * 100), 1) if total_bookings > 0 else 0.0,
            "offline_percentage": round((offline_count / total_bookings * 100), 1) if total_bookings > 0 else 0.0,
            "daily_breakdown": daily_breakdown
        },
        "customer_feedback_metrics": {
            "total_reviews": total_reviews,
            "average_rating": avg_rating,
            "happy_count": happy_count,
            "happy_percentage": round((happy_count / total_reviews * 100), 1) if total_reviews > 0 else 0.0,
            "neutral_count": neutral_count,
            "neutral_percentage": round((neutral_count / total_reviews * 100), 1) if total_reviews > 0 else 0.0,
            "unhappy_count": unhappy_count,
            "unhappy_percentage": round((unhappy_count / total_reviews * 100), 1) if total_reviews > 0 else 0.0,
            "rating_distribution": rating_distribution
        }
    }
