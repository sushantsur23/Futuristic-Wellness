import sys
import os
import pytest
import pytest_asyncio
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from datetime import datetime, timedelta, timezone, date, time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.app.db.base_class import Base
from backend.app.models.user import User
from backend.app.models.doctor import DoctorProfile
from backend.app.models.client import ClientProfile
from backend.app.models.availability import Slot, AvailabilityRule
from backend.app.models.appointment import Appointment
from backend.app.models.session import SessionType

DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_db():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        yield session
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_doctor_profile_social_links(test_db):
    db = test_db
    doc_user = User(
        email="doctor_social@example.com",
        phone="+19999",
        hashed_password="hash",
        role="DOCTOR",
        full_name="Dr. Social",
        is_active=True
    )
    db.add(doc_user)
    await db.flush()

    doc_profile = DoctorProfile(
        user_id=doc_user.id,
        specialization="Wellness",
        registration_number="REG123",
        linkedin_url="https://linkedin.com/in/drsocial",
        instagram_url="https://instagram.com/drsocial",
        facebook_url="https://facebook.com/drsocial",
        show_social_links=True
    )
    db.add(doc_profile)
    await db.commit()

    res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == doc_user.id))
    fetched_doc = res.scalars().first()
    assert fetched_doc.linkedin_url == "https://linkedin.com/in/drsocial"
    assert fetched_doc.instagram_url == "https://instagram.com/drsocial"
    assert fetched_doc.facebook_url == "https://facebook.com/drsocial"
    assert fetched_doc.show_social_links is True

@pytest.mark.asyncio
async def test_cancel_all_availability_preserves_booked_slots(test_db):
    db = test_db
    doc_user = User(
        email="doctor_avail@example.com",
        phone="+18888",
        hashed_password="hash",
        role="DOCTOR",
        full_name="Dr. Avail",
        is_active=True
    )
    db.add(doc_user)
    await db.flush()

    doc_profile = DoctorProfile(
        user_id=doc_user.id,
        specialization="Wellness",
        registration_number="REG456"
    )
    db.add(doc_profile)
    await db.flush()

    st = SessionType(
        doctor_id=doc_profile.id,
        name="Therapy",
        category="SESSION_PHYSIOTHERAPY",
        duration_minutes=30,
        capacity=1
    )
    db.add(st)
    await db.flush()

    rule = AvailabilityRule(
        doctor_id=doc_profile.id,
        day_of_week=0,
        start_time=time(9, 0),
        end_time=time(12, 0),
        session_type_id=st.id,
        valid_from=date.today(),
        valid_to=date.today() + timedelta(days=30)
    )
    db.add(rule)

    now = datetime.now(timezone.utc) + timedelta(days=1)
    slot_open = Slot(
        doctor_id=doc_profile.id,
        session_type_id=st.id,
        start_at=now,
        end_at=now + timedelta(minutes=30),
        capacity=1,
        booked_count=0,
        status="OPEN"
    )
    slot_booked = Slot(
        doctor_id=doc_profile.id,
        session_type_id=st.id,
        start_at=now + timedelta(hours=1),
        end_at=now + timedelta(hours=1, minutes=30),
        capacity=1,
        booked_count=1,
        status="FULL"
    )
    db.add(slot_open)
    db.add(slot_booked)
    await db.commit()

    # Simulate cancel all availability action
    rules_res = await db.execute(select(AvailabilityRule).where(AvailabilityRule.doctor_id == doc_profile.id))
    for r in rules_res.scalars().all():
        await db.delete(r)

    slots_res = await db.execute(select(Slot).where(Slot.doctor_id == doc_profile.id))
    for s in slots_res.scalars().all():
        if s.booked_count == 0:
            await db.delete(s)

    await db.commit()

    # Check remaining slots: open slot should be deleted, booked slot must remain
    res_slots = await db.execute(select(Slot).where(Slot.doctor_id == doc_profile.id))
    remaining = res_slots.scalars().all()
    assert len(remaining) == 1
    assert remaining[0].id == slot_booked.id
    assert remaining[0].booked_count == 1
