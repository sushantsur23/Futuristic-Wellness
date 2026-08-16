import asyncio
import secrets
import string
from sqlalchemy.future import select
from backend.app.db.session import SessionLocal, engine
from backend.app.models.user import User
from backend.app.models.doctor import DoctorProfile
from backend.app.core.security import get_password_hash
from backend.app.core.config import settings

async def seed_doctor():
    # Enforce single doctor at the application level
    async with SessionLocal() as db:
        # Check if doctor user already exists
        result = await db.execute(select(User).where(User.role == "DOCTOR"))
        doctor_user = result.scalars().first()
        
        if doctor_user:
            print("[SEED] Doctor account already exists. Skipping seed.")
            return

        # Generate a secure random password
        alphabet = string.ascii_letters + string.digits
        raw_password = "".join(secrets.choice(alphabet) for _ in range(12))
        hashed_password = get_password_hash(raw_password)

        # Placeholders - replace with real doctor's credentials before production launch.
        new_user = User(
            email=settings.DOCTOR_EMAIL,
            phone=settings.DOCTOR_PHONE,
            hashed_password=hashed_password,
            role="DOCTOR",
            full_name=settings.DOCTOR_NAME,
            is_active=True
        )
        db.add(new_user)
        await db.flush()  # To get new_user.id

        doctor_profile = DoctorProfile(
            user_id=new_user.id,
            specialization=settings.DOCTOR_SPECIALIZATION,
            registration_number=settings.DOCTOR_REG_NUMBER,
            bio="Dedicated to restoring physical well-being through specialized manual and movement therapy."
        )
        db.add(doctor_profile)
        await db.commit()

        print("====================================================")
        print("SEED COMPLETED: SINGLE DOCTOR ACCOUNT CREATED")
        print(f"Email: {settings.DOCTOR_EMAIL}")
        print(f"Phone: {settings.DOCTOR_PHONE}")
        print(f"Password: {raw_password}")
        print("IMPORTANT: Save this password! It will not be printed again.")
        print("====================================================")

if __name__ == "__main__":
    asyncio.run(seed_doctor())
