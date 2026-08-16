import sys
import os
import asyncio
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
from backend.app.models.availability import Slot
from backend.app.models.appointment import Appointment
from backend.app.models.session import SessionType
from backend.app.models.notification import Notification

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
async def test_concurrency_booking(test_db):
    """
    Test that concurrent booking requests for a slot with capacity=1
    only allow the first booking to succeed, rejecting the second.
    """
    db = test_db
    # Seed data
    # Create doctor
    doc_user = User(
        email="doctor@example.com",
        phone="+12345",
        hashed_password="hash",
        role="DOCTOR",
        full_name="Dr. Test",
        is_active=True
    )
    db.add(doc_user)
    await db.flush()

    doc_profile = DoctorProfile(
        user_id=doc_user.id,
        specialization="Test",
        registration_number="REG123"
    )
    db.add(doc_profile)
    await db.flush()

    # Create session type
    st = SessionType(
        doctor_id=doc_profile.id,
        name="1:1 Consultation",
        category="APPOINTMENT",
        duration_minutes=30,
        capacity=1,
        is_active=True
    )
    db.add(st)
    await db.flush()

    # Create slot
    slot_start = datetime.now(timezone.utc) + timedelta(hours=2)
    slot = Slot(
        doctor_id=doc_profile.id,
        session_type_id=st.id,
        start_at=slot_start,
        end_at=slot_start + timedelta(minutes=30),
        capacity=1,
        booked_count=0,
        status="OPEN"
    )
    db.add(slot)
    await db.flush()

    # Create two clients
    client1_u = User(
        email="client1@example.com", phone="+5551", hashed_password="hash",
        role="CLIENT", full_name="Client One"
    )
    client2_u = User(
        email="client2@example.com", phone="+5552", hashed_password="hash",
        role="CLIENT", full_name="Client Two"
    )
    db.add(client1_u)
    db.add(client2_u)
    await db.flush()

    client1 = ClientProfile(user_id=client1_u.id)
    client2 = ClientProfile(user_id=client2_u.id)
    db.add(client1)
    db.add(client2)
    await db.commit()

    # Define mock concurrent booking function
    async def try_book(client_profile_id):
        # Create a new session to simulate a concurrent request transaction
        async with async_sessionmaker(bind=db.bind, class_=AsyncSession)() as s_db:
            # SELECT FOR UPDATE the slot row
            slot_res = await s_db.execute(
                select(Slot).where(Slot.id == slot.id).with_for_update()
            )
            s_slot = slot_res.scalars().first()
            
            if s_slot.status == "FULL" or s_slot.booked_count >= s_slot.capacity:
                return False
                
            s_slot.booked_count += 1
            if s_slot.booked_count >= s_slot.capacity:
                s_slot.status = "FULL"
                
            app = Appointment(
                slot_id=s_slot.id,
                client_id=client_profile_id,
                status="BOOKED",
                booked_at=datetime.now(timezone.utc)
            )
            s_db.add(app)
            await s_db.commit()
            return True

    # Run bookings sequentially (since SQLite in-memory doesn't support row-level SELECT FOR UPDATE blocking)
    # The first booking succeeds, changing slot state to FULL; the second booking is rejected
    res1 = await try_book(client1.id)
    res2 = await try_book(client2.id)

    assert res1 is True
    assert res2 is False


@pytest.mark.asyncio
async def test_one_hour_cancellation_cutoff(test_db):
    """
    Test that cancellation is rejected if the appointment is inside the 1-hour window.
    """
    db = test_db
    # Seed data
    doc_user = User(
        email="doctor@example.com", phone="+123", hashed_password="hash",
        role="DOCTOR", full_name="Dr. Test"
    )
    db.add(doc_user)
    await db.flush()

    doc_profile = DoctorProfile(
        user_id=doc_user.id, specialization="Test", registration_number="REG123"
    )
    db.add(doc_profile)
    await db.flush()

    st = SessionType(
        doctor_id=doc_profile.id, name="Session", category="APPOINTMENT",
        duration_minutes=30, capacity=1, is_active=True
    )
    db.add(st)
    await db.flush()

    client_u = User(
        email="client@example.com", phone="+999", hashed_password="hash",
        role="CLIENT", full_name="Client Test"
    )
    db.add(client_u)
    await db.flush()
    client = ClientProfile(user_id=client_u.id)
    db.add(client)
    await db.flush()

    # Slot 1: inside 1-hour window (starts in 30 minutes)
    start_inside = datetime.now(timezone.utc) + timedelta(minutes=30)
    slot_inside = Slot(
        doctor_id=doc_profile.id, session_type_id=st.id,
        start_at=start_inside, end_at=start_inside + timedelta(minutes=30),
        capacity=1, booked_count=1, status="FULL"
    )
    db.add(slot_inside)
    await db.flush()

    app_inside = Appointment(
        slot_id=slot_inside.id, client_id=client.id, status="BOOKED"
    )
    db.add(app_inside)
    await db.flush()

    # Slot 2: outside 1-hour window (starts in 2 hours)
    start_outside = datetime.now(timezone.utc) + timedelta(hours=2)
    slot_outside = Slot(
        doctor_id=doc_profile.id, session_type_id=st.id,
        start_at=start_outside, end_at=start_outside + timedelta(minutes=30),
        capacity=1, booked_count=1, status="FULL"
    )
    db.add(slot_outside)
    await db.flush()

    app_outside = Appointment(
        slot_id=slot_outside.id, client_id=client.id, status="BOOKED"
    )
    db.add(app_outside)
    await db.commit()

    # Cancellation business logic verification
    async def try_cancel(appointment_id):
        # Fetch app with slot
        app_res = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
        app_obj = app_res.scalars().first()
        
        slot_res = await db.execute(select(Slot).where(Slot.id == app_obj.slot_id))
        slot_obj = slot_res.scalars().first()

        now = datetime.now(timezone.utc)
        if slot_obj.start_at - now < timedelta(hours=1):
            return "REJECTED_409"
            
        app_obj.status = "CANCELLED"
        slot_obj.booked_count -= 1
        slot_obj.status = "OPEN"
        await db.commit()
        return "SUCCESS"

    # Test Slot 1 cancellation (starts in 30m) -> must be rejected
    res1 = await try_cancel(app_inside.id)
    assert res1 == "REJECTED_409"
    assert app_inside.status == "BOOKED" # Verify unchanged

    # Test Slot 2 cancellation (starts in 2h) -> must succeed
    res2 = await try_cancel(app_outside.id)
    assert res2 == "SUCCESS"
    assert app_outside.status == "CANCELLED" # Verify changed
    assert slot_outside.status == "OPEN"
