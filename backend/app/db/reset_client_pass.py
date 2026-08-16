import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from backend.app.db.session import SessionLocal
from backend.app.models.user import User
from backend.app.core.security import get_password_hash
from sqlalchemy import select

async def set_pass():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "patient123@example.com"))
        user = res.scalars().first()
        if user:
            user.hashed_password = get_password_hash("ClientPass123!")
            await db.commit()
            print(f"Client email: {user.email}")
            print("Client password updated to: ClientPass123!")

if __name__ == "__main__":
    asyncio.run(set_pass())
