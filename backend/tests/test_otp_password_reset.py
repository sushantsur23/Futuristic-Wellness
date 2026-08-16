import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.app.main import app
from backend.app.db.base_class import Base
from backend.app.models.user import User
from backend.app.core.security import get_password_hash
from backend.app.core.deps import get_db

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
        # Seed test patient user
        user_client = User(
            email="patient@example.com",
            phone="+19876543210",
            hashed_password=get_password_hash("oldpass123"),
            role="CLIENT",
            full_name="Test Patient",
            is_active=True
        )
        # Seed test doctor user
        user_doctor = User(
            email="doctor@wellness.com",
            phone="+11234567890",
            hashed_password=get_password_hash("docoldpass123"),
            role="DOCTOR",
            full_name="Dr. Smith",
            is_active=True
        )
        session.add(user_client)
        session.add(user_doctor)
        await session.commit()
    
    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    
    yield async_session
    
    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_email_otp_password_reset(test_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Request OTP via Email
        req_res = await ac.post("/api/v1/auth/password-reset/request", json={
            "identifier": "patient@example.com",
            "channel": "email"
        })
        assert req_res.status_code == 200
        req_data = req_res.json()
        assert "reset_code" in req_data
        otp_code = req_data["reset_code"]
        assert len(otp_code) == 6

        # 2. Confirm password reset with 6-digit OTP
        new_pw = "newsecurepass123"
        confirm_res = await ac.post("/api/v1/auth/password-reset/confirm", json={
            "identifier": "patient@example.com",
            "otp": otp_code,
            "new_password": new_pw
        })
        assert confirm_res.status_code == 200
        assert "successful" in confirm_res.json()["message"].lower()

        # 3. Verify login with new password
        login_res = await ac.post("/api/v1/auth/login", json={
            "identifier": "patient@example.com",
            "password": new_pw
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()


@pytest.mark.asyncio
async def test_phone_sms_otp_password_reset(test_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Request OTP via Phone SMS
        req_res = await ac.post("/api/v1/auth/password-reset/request", json={
            "identifier": "+11234567890",
            "channel": "phone"
        })
        assert req_res.status_code == 200
        req_data = req_res.json()
        assert "reset_code" in req_data
        otp_code = req_data["reset_code"]
        assert len(otp_code) == 6
        assert req_data["channel"] == "phone"

        # 2. Confirm password reset with 6-digit OTP
        new_pw = "docnewpassword456"
        confirm_res = await ac.post("/api/v1/auth/password-reset/confirm", json={
            "identifier": "+11234567890",
            "otp": otp_code,
            "new_password": new_pw
        })
        assert confirm_res.status_code == 200

        # 3. Verify login with new password via phone
        login_res = await ac.post("/api/v1/auth/login", json={
            "identifier": "+11234567890",
            "password": new_pw
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()
