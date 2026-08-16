import sys
import os
import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timezone, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.app.db.base_class import Base
from backend.app.models.user import User
from backend.app.models.doctor import DoctorProfile
from backend.app.models.client import ClientProfile
from backend.app.models.prescription import Prescription
from backend.app.schemas.prescription import PrescriptionContentSchema, VitalsSchema, MedicineSchema, PrescriptionUpdate
from backend.app.api.v1.prescriptions import (
    get_doctor_prescriptions, get_prescription_by_id, update_prescription, delete_prescription
)

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
async def test_prescription_patient_management_flow(test_db):
    db = test_db

    # Seed Doctor
    doc_user = User(
        email="doctor@test.com",
        phone="+1234567890",
        hashed_password="hash",
        role="DOCTOR",
        full_name="Dr. Smith",
        is_active=True
    )
    db.add(doc_user)
    await db.flush()

    doc_profile = DoctorProfile(
        user_id=doc_user.id,
        bio="Test Bio",
        registration_number="REG12345",
        specialization="Physiotherapist"
    )
    db.add(doc_profile)

    # Seed Client 1
    client1_user = User(
        email="patient1@test.com",
        phone="+1987654321",
        hashed_password="hash",
        role="CLIENT",
        full_name="John Patient",
        is_active=True
    )
    db.add(client1_user)
    await db.flush()

    client1_profile = ClientProfile(
        user_id=client1_user.id,
        date_of_birth=date(1990, 5, 15),
        gender="Male"
    )
    db.add(client1_profile)

    # Seed Client 2
    client2_user = User(
        email="patient2@test.com",
        phone="+1987654322",
        hashed_password="hash",
        role="CLIENT",
        full_name="Jane Patient",
        is_active=True
    )
    db.add(client2_user)
    await db.flush()

    client2_profile = ClientProfile(
        user_id=client2_user.id,
        date_of_birth=date(1995, 8, 20),
        gender="Female"
    )
    db.add(client2_profile)
    await db.commit()

    # 1. Create Prescriptions
    p1 = Prescription(
        client_id=client1_profile.id,
        doctor_id=doc_profile.id,
        diagnosis="Lower Back Pain",
        content={
            "vitals": {"pulse": "72", "spo2": "98", "bp": "120/80", "temp": "98.6", "weight": "70"},
            "symptoms": "LBP for 2 weeks",
            "findings": "Lumbar spasm",
            "notes": "Rest & posture control",
            "diagnosis": "Lower Back Pain",
            "medicines": [{"name": "Ibuprofen 400", "generic": "Ibuprofen", "frequency": "1-0-1", "duration": "5 days", "notes": "After food"}],
            "instructions": ["Apply heat pack"]
        },
        version=1,
        status="DRAFT"
    )
    p2 = Prescription(
        client_id=client1_profile.id,
        doctor_id=doc_profile.id,
        diagnosis="Cervical Spondylosis",
        content={
            "vitals": {"pulse": "75", "spo2": "99", "bp": "118/78", "temp": "98.4", "weight": "70"},
            "symptoms": "Neck pain",
            "findings": "Cervical tenderness",
            "notes": "Avoid head bending",
            "diagnosis": "Cervical Spondylosis",
            "medicines": [],
            "instructions": ["Neck isometric exercises"]
        },
        version=2,
        status="FINALIZED",
        issued_at=datetime.now(timezone.utc)
    )
    p3 = Prescription(
        client_id=client2_profile.id,
        doctor_id=doc_profile.id,
        diagnosis="Knee Osteoarthritis",
        content={
            "vitals": {"pulse": "80", "spo2": "97", "bp": "130/85", "temp": "98.6", "weight": "65"},
            "symptoms": "Right knee pain",
            "findings": "Crepitus present",
            "notes": "Quadriceps strengthening",
            "diagnosis": "Knee Osteoarthritis",
            "medicines": [],
            "instructions": []
        },
        version=1,
        status="FINALIZED",
        issued_at=datetime.now(timezone.utc)
    )
    db.add_all([p1, p2, p3])
    await db.commit()

    # 2. Test get_doctor_prescriptions patient-wise for Client 1
    res_client1 = await get_doctor_prescriptions(
        status_filter=None,
        client_id=client1_profile.id,
        current_user=doc_user,
        db=db
    )
    assert len(res_client1) == 2
    assert all(r.client_id == client1_profile.id for r in res_client1)
    assert res_client1[0].client_name == "John Patient"

    # 3. Test get_prescription_by_id
    single_res = await get_prescription_by_id(
        id=p1.id,
        current_user=doc_user,
        db=db
    )
    assert single_res.id == p1.id
    assert single_res.diagnosis == "Lower Back Pain"
    assert single_res.client_name == "John Patient"

    # 4. Test update_prescription (edit & resave draft)
    update_data = PrescriptionUpdate(
        diagnosis="Acute Lower Back Pain with Sciatica",
        content=PrescriptionContentSchema(
            vitals=VitalsSchema(pulse="74", spo2="98", bp="120/80", temp="98.6", weight="71"),
            symptoms="LBP radiating to left leg",
            findings="SLR positive at 50 deg",
            notes="Ergonomic chair suggested",
            diagnosis="Acute Lower Back Pain with Sciatica",
            medicines=[MedicineSchema(name="Paracetamol 650", generic="Acetaminophen", frequency="1-1-1", duration="3 days", notes="If needed")],
            instructions=["Avoid heavy lifting", "Lumbar roll support"]
        ),
        status="DRAFT"
    )
    updated_rx = await update_prescription(
        id=p1.id,
        data=update_data,
        current_user=doc_user,
        db=db
    )
    assert updated_rx.diagnosis == "Acute Lower Back Pain with Sciatica"
    assert updated_rx.content.symptoms == "LBP radiating to left leg"
    assert updated_rx.status == "DRAFT"

    # 5. Test delete_prescription
    delete_res = await delete_prescription(
        id=p3.id,
        current_user=doc_user,
        db=db
    )
    assert delete_res["id"] == str(p3.id)

    # Confirm deletion
    all_res = await get_doctor_prescriptions(
        status_filter=None,
        client_id=None,
        current_user=doc_user,
        db=db
    )
    assert len(all_res) == 2  # p1 and p2 remain
