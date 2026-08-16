import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.deps import get_db, get_current_active_user, is_client, is_doctor
from backend.app.models.user import User
from backend.app.models.client import ClientProfile
from backend.app.models.doctor import DoctorProfile
from backend.app.models.appointment import Appointment
from backend.app.models.availability import Slot
from backend.app.models.session import SessionType
from backend.app.models.review import Review
from backend.app.schemas.review import ReviewCreate, ReviewTogglePublished, ReviewOut

router = APIRouter()

async def build_review_out(review: Review, db: AsyncSession) -> ReviewOut:
    # Fetch client user for patient name
    client_res = await db.execute(
        select(User).join(ClientProfile, ClientProfile.user_id == User.id).where(ClientProfile.id == review.client_id)
    )
    client_user = client_res.scalars().first()

    # Fetch appointment & slot & session type
    app_res = await db.execute(select(Appointment).where(Appointment.id == review.appointment_id))
    app = app_res.scalars().first()

    slot_date_str = ""
    session_name = "Consultation"
    if app:
        slot_res = await db.execute(select(Slot).where(Slot.id == app.slot_id))
        slot = slot_res.scalars().first()
        if slot:
            slot_date_str = slot.start_at.strftime("%Y-%m-%d %I:%M %p UTC")
            st_res = await db.execute(select(SessionType).where(SessionType.id == slot.session_type_id))
            st = st_res.scalars().first()
            if st:
                session_name = st.name

    return ReviewOut(
        id=review.id,
        appointment_id=review.appointment_id,
        client_id=review.client_id,
        doctor_id=review.doctor_id,
        rating=review.rating,
        comment=review.comment,
        is_published=review.is_published,
        created_at=review.created_at,
        client_name=client_user.full_name if client_user else "Patient",
        appointment_date=slot_date_str,
        session_type_name=session_name
    )

@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_or_update_review(
    data: ReviewCreate,
    current_user: User = Depends(is_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Patient submits or updates an optional rating/review for an appointment.
    """
    # Verify client profile
    client_res = await db.execute(select(ClientProfile).where(ClientProfile.user_id == current_user.id))
    client_profile = client_res.scalars().first()
    if not client_profile:
        raise HTTPException(status_code=400, detail="Client profile not found")

    # Verify appointment belongs to client
    app_res = await db.execute(select(Appointment).where(Appointment.id == data.appointment_id))
    app = app_res.scalars().first()
    if not app or app.client_id != client_profile.id:
        raise HTTPException(status_code=404, detail="Appointment not found for this client")

    # Get doctor ID from slot
    slot_res = await db.execute(select(Slot).where(Slot.id == app.slot_id))
    slot = slot_res.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Check if review already exists for this appointment
    rev_res = await db.execute(select(Review).where(Review.appointment_id == data.appointment_id))
    existing_review = rev_res.scalars().first()

    if existing_review:
        existing_review.rating = data.rating
        existing_review.comment = data.comment
        existing_review.created_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing_review)
        return await build_review_out(existing_review, db)
    else:
        new_review = Review(
            appointment_id=app.id,
            client_id=client_profile.id,
            doctor_id=slot.doctor_id,
            rating=data.rating,
            comment=data.comment,
            is_published=False,  # Doctor toggles visibility
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_review)
        await db.commit()
        await db.refresh(new_review)
        return await build_review_out(new_review, db)

@router.get("/me", response_model=List[ReviewOut])
async def get_my_reviews(
    current_user: User = Depends(is_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Get reviews submitted by current client.
    """
    client_res = await db.execute(select(ClientProfile).where(ClientProfile.user_id == current_user.id))
    client_profile = client_res.scalars().first()
    if not client_profile:
        return []

    res = await db.execute(
        select(Review).where(Review.client_id == client_profile.id).order_by(Review.created_at.desc())
    )
    reviews = res.scalars().all()
    return [await build_review_out(r, db) for r in reviews]

@router.get("/doctor", response_model=List[ReviewOut])
async def get_doctor_reviews(
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor views all reviews submitted by patients with patient name and datetime.
    """
    doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc_profile = doc_res.scalars().first()
    if not doc_profile:
        return []

    res = await db.execute(
        select(Review).where(Review.doctor_id == doc_profile.id).order_by(Review.created_at.desc())
    )
    reviews = res.scalars().all()
    return [await build_review_out(r, db) for r in reviews]

@router.patch("/{id}/publish", response_model=ReviewOut)
async def toggle_review_published(
    id: uuid.UUID,
    data: ReviewTogglePublished,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor toggles review visibility for showcase on the landing/login page for existing and new customers.
    """
    doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc_profile = doc_res.scalars().first()
    if not doc_profile:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    res = await db.execute(select(Review).where((Review.id == id) & (Review.doctor_id == doc_profile.id)))
    review = res.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.is_published = data.is_published
    await db.commit()
    await db.refresh(review)

    return await build_review_out(review, db)

@router.get("/public", response_model=List[ReviewOut])
async def get_public_reviews(
    db: AsyncSession = Depends(get_db)
):
    """
    Public endpoint to fetch published reviews selected by the doctor for display on the landing page.
    """
    res = await db.execute(
        select(Review).where(Review.is_published == True).order_by(Review.created_at.desc())
    )
    reviews = res.scalars().all()
    return [await build_review_out(r, db) for r in reviews]
