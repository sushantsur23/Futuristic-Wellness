import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.deps import get_db, get_current_active_user, is_client, is_doctor
from backend.app.models.user import User
from backend.app.models.client import ClientProfile
from backend.app.models.doctor import DoctorProfile
from backend.app.models.availability import Slot
from backend.app.models.appointment import Appointment
from backend.app.models.session import SessionType
from backend.app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentDetailsOut, AppointmentCancel, AppointmentMeetingUpdate, AppointmentModeUpdate
from backend.app.services.notifications import notify

router = APIRouter()

@router.post("", response_model=AppointmentDetailsOut, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(is_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Client books an open slot.
    Uses SELECT FOR UPDATE to prevent race conditions and overbooking.
    Sends dual-party notifications.
    """
    # Get client profile
    client_res = await db.execute(
        select(ClientProfile).where(ClientProfile.user_id == current_user.id)
    )
    client_profile = client_res.scalars().first()
    if not client_profile:
        raise HTTPException(status_code=400, detail="Client profile not found")

    # Acquire slot with lock to prevent concurrency double-booking
    slot_res = await db.execute(
        select(Slot)
        .where(Slot.id == data.slot_id)
        .with_for_update()
    )
    slot = slot_res.scalars().first()

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if slot.status == "BLOCKED" or slot.booked_count >= slot.capacity:
        raise HTTPException(status_code=400, detail="Slot is no longer available for booking")

    # Double check if client already booked this slot
    existing_booking = await db.execute(
        select(Appointment).where(
            (Appointment.slot_id == slot.id) &
            (Appointment.client_id == client_profile.id) &
            (Appointment.status == "BOOKED")
        )
    )
    if existing_booking.scalars().first():
        raise HTTPException(status_code=400, detail="You have already booked this slot")

    # Increment booked count and update status
    slot.booked_count += 1
    if slot.booked_count >= slot.capacity:
        slot.status = "FULL"

    # Create appointment
    appointment = Appointment(
        slot_id=slot.id,
        client_id=client_profile.id,
        status="BOOKED",
        notes_from_client=data.notes_from_client,
        mode=getattr(data, "mode", "ONLINE") or "ONLINE",
        booked_at=datetime.now(timezone.utc)
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    # Fetch details for response and notifications
    # Join with Doctor profile, User, etc.
    st_res = await db.execute(
        select(SessionType).where(SessionType.id == slot.session_type_id)
    )
    session_type = st_res.scalars().first()

    doc_res = await db.execute(
        select(User).join(DoctorProfile).where(DoctorProfile.id == slot.doctor_id)
    )
    doctor_user = doc_res.scalars().first()

    # Send confirmation notifications (Dual-Send)
    if doctor_user:
        start_time_str = slot.start_at.strftime("%Y-%m-%d %I:%M %p UTC")
        context = {
            "start_time": start_time_str,
            "category_name": session_type.name if session_type else "Session",
            "notes": data.notes_from_client or "None",
            "cancel_url": f"http://localhost:5173/my-appointments"
        }
        try:
            await notify(
                db,
                "BOOKING_CONFIRMATION",
                client=current_user,
                doctor=doctor_user,
                context=context
            )
        except Exception as e:
            print(f"Error sending booking emails: {e}")

    # Format output response
    return AppointmentDetailsOut(
        id=appointment.id,
        slot_id=appointment.slot_id,
        client_id=appointment.client_id,
        status=appointment.status,
        notes_from_client=appointment.notes_from_client,
        cancellation_reason=appointment.cancellation_reason,
        meeting_link=appointment.meeting_link,
        meeting_provider=appointment.meeting_provider,
        mode=getattr(appointment, "mode", "ONLINE") or "ONLINE",
        booked_at=appointment.booked_at,
        cancelled_at=appointment.cancelled_at,
        slot=slot,
        session_type=session_type,
        doctor_name=doctor_user.full_name if doctor_user else "Doctor",
        client_name=current_user.full_name,
        client_email=current_user.email,
        client_phone=current_user.phone
    )

@router.get("/me", response_model=List[AppointmentDetailsOut])
async def get_my_appointments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's appointments.
    If CLIENT: gets their personal bookings.
    If DOCTOR: gets all bookings.
    """
    query = select(Appointment).join(Slot, Appointment.slot_id == Slot.id)

    if current_user.role == "CLIENT":
        # Get client profile
        client_res = await db.execute(
            select(ClientProfile).where(ClientProfile.user_id == current_user.id)
        )
        client_profile = client_res.scalars().first()
        if not client_profile:
            return []
        query = query.where(Appointment.client_id == client_profile.id)
    elif current_user.role == "DOCTOR":
        # Get doctor profile
        doc_res = await db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        )
        doc_profile = doc_res.scalars().first()
        if not doc_profile:
            return []
        query = query.where(Slot.doctor_id == doc_profile.id)

    # Order by slot time
    query = query.order_by(Slot.start_at.desc())
    result = await db.execute(query)
    appointments = result.scalars().all()

    # Build response list with details
    output = []
    for app in appointments:
        # Load slot and session type details
        slot_res = await db.execute(select(Slot).where(Slot.id == app.slot_id))
        slot = slot_res.scalars().first()

        st_res = await db.execute(select(SessionType).where(SessionType.id == slot.session_type_id))
        session_type = st_res.scalars().first()

        # Load client details
        client_res = await db.execute(
            select(User).join(ClientProfile).where(ClientProfile.id == app.client_id)
        )
        client_u = client_res.scalars().first()

        # Load doctor details
        doc_user_res = await db.execute(
            select(User).join(DoctorProfile).where(DoctorProfile.id == slot.doctor_id)
        )
        doc_u = doc_user_res.scalars().first()

        output.append(
            AppointmentDetailsOut(
                id=app.id,
                slot_id=app.slot_id,
                client_id=app.client_id,
                status=app.status,
                notes_from_client=app.notes_from_client,
                cancellation_reason=app.cancellation_reason,
                meeting_link=app.meeting_link,
                meeting_provider=app.meeting_provider,
                mode=getattr(app, "mode", "ONLINE") or "ONLINE",
                booked_at=app.booked_at,
                cancelled_at=app.cancelled_at,
                slot=slot,
                session_type=session_type,
                doctor_name=doc_u.full_name if doc_u else "Doctor",
                client_name=client_u.full_name if client_u else "Client",
                client_email=client_u.email if client_u else "",
                client_phone=client_u.phone if client_u else ""
            )
        )
    return output

@router.patch("/{id}/meeting", response_model=AppointmentDetailsOut)
async def update_appointment_meeting(
    id: uuid.UUID,
    data: AppointmentMeetingUpdate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor sets or updates meeting link (Zoom, Google Meet, MS Teams, Custom) for an appointment.
    """
    res = await db.execute(
        select(Appointment).where(Appointment.id == id)
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Appointment not found")

    app.meeting_link = data.meeting_link
    app.meeting_provider = data.meeting_provider

    await db.commit()
    await db.refresh(app)

    # Load details for response
    slot_res = await db.execute(select(Slot).where(Slot.id == app.slot_id))
    slot = slot_res.scalars().first()

    st_res = await db.execute(select(SessionType).where(SessionType.id == slot.session_type_id))
    session_type = st_res.scalars().first()

    client_res = await db.execute(
        select(User).join(ClientProfile).where(ClientProfile.id == app.client_id)
    )
    client_u = client_res.scalars().first()

    doc_user_res = await db.execute(
        select(User).join(DoctorProfile).where(DoctorProfile.id == slot.doctor_id)
    )
    doc_u = doc_user_res.scalars().first()

    return AppointmentDetailsOut(
        id=app.id,
        slot_id=app.slot_id,
        client_id=app.client_id,
        status=app.status,
        notes_from_client=app.notes_from_client,
        cancellation_reason=app.cancellation_reason,
        meeting_link=app.meeting_link,
        meeting_provider=app.meeting_provider,
        mode=getattr(app, "mode", "ONLINE") or "ONLINE",
        booked_at=app.booked_at,
        cancelled_at=app.cancelled_at,
        slot=slot,
        session_type=session_type,
        doctor_name=doc_u.full_name if doc_u else "Doctor",
        client_name=client_u.full_name if client_u else "Client",
        client_email=client_u.email if client_u else "",
        client_phone=client_u.phone if client_u else ""
    )

@router.patch("/{id}/mode", response_model=AppointmentDetailsOut)
async def update_appointment_mode(
    id: uuid.UUID,
    data: AppointmentModeUpdate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor converts an appointment mode (e.g. OFFLINE to ONLINE or vice-versa).
    """
    res = await db.execute(select(Appointment).where(Appointment.id == id))
    app = res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Appointment not found")

    new_mode = data.mode.upper()
    if new_mode not in ["ONLINE", "OFFLINE"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be ONLINE or OFFLINE")

    app.mode = new_mode
    await db.commit()
    await db.refresh(app)

    # Load details for response
    slot_res = await db.execute(select(Slot).where(Slot.id == app.slot_id))
    slot = slot_res.scalars().first()

    st_res = await db.execute(select(SessionType).where(SessionType.id == slot.session_type_id))
    session_type = st_res.scalars().first()

    client_res = await db.execute(
        select(User).join(ClientProfile).where(ClientProfile.id == app.client_id)
    )
    client_u = client_res.scalars().first()

    doc_user_res = await db.execute(
        select(User).join(DoctorProfile).where(DoctorProfile.id == slot.doctor_id)
    )
    doc_u = doc_user_res.scalars().first()

    return AppointmentDetailsOut(
        id=app.id,
        slot_id=app.slot_id,
        client_id=app.client_id,
        status=app.status,
        notes_from_client=app.notes_from_client,
        cancellation_reason=app.cancellation_reason,
        meeting_link=app.meeting_link,
        meeting_provider=app.meeting_provider,
        mode=getattr(app, "mode", "ONLINE") or "ONLINE",
        booked_at=app.booked_at,
        cancelled_at=app.cancelled_at,
        slot=slot,
        session_type=session_type,
        doctor_name=doc_u.full_name if doc_u else "Doctor",
        client_name=client_u.full_name if client_u else "Client",
        client_email=client_u.email if client_u else "",
        client_phone=client_u.phone if client_u else ""
    )

@router.delete("/{id}", response_model=AppointmentOut)
async def cancel_appointment(
    id: uuid.UUID,
    data: AppointmentCancel = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel appointment.
    Enforces 1-hour cutoff.
    Sends dual-party notifications.
    """
    # Fetch appointment with slot
    res = await db.execute(
        select(Appointment).where(Appointment.id == id).with_for_update()
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if app.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")

    slot_res = await db.execute(
        select(Slot).where(Slot.id == app.slot_id).with_for_update()
    )
    slot = slot_res.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Associated slot not found")

    # Enforce 1-hour cutoff policy on server side
    now = datetime.now(timezone.utc)
    if slot.start_at - now < timedelta(hours=1):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot cancel appointment within 1 hour of start time."
        )

    # Perform cancellation
    app.status = "CANCELLED"
    app.cancelled_at = now
    reason = data.cancellation_reason if data else "Cancelled by user"
    app.cancellation_reason = reason

    # Update slot availability
    slot.booked_count = max(0, slot.booked_count - 1)
    if slot.status == "FULL":
        slot.status = "OPEN"

    await db.commit()
    await db.refresh(app)

    # Fetch client and doctor info for notifications
    client_res = await db.execute(
        select(User).join(ClientProfile).where(ClientProfile.id == app.client_id)
    )
    client_user = client_res.scalars().first()

    doc_res = await db.execute(
        select(User).join(DoctorProfile).where(DoctorProfile.id == slot.doctor_id)
    )
    doctor_user = doc_res.scalars().first()

    st_res = await db.execute(select(SessionType).where(SessionType.id == slot.session_type_id))
    session_type = st_res.scalars().first()

    # Send cancellation notifications (Dual-Send)
    if client_user and doctor_user:
        start_time_str = slot.start_at.strftime("%Y-%m-%d %I:%M %p UTC")
        context = {
            "start_time": start_time_str,
            "category_name": session_type.name if session_type else "Session",
            "reason": reason
        }
        try:
            await notify(
                db,
                "CANCELLATION",
                client=client_user,
                doctor=doctor_user,
                context=context
            )
        except Exception as e:
            print(f"Error sending cancellation notifications: {e}")

    return app
