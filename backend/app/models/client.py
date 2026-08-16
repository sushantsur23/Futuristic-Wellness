import uuid
from sqlalchemy import String, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base
from datetime import date

class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    alternate_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    medical_history_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="client_profile")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="client", cascade="all, delete-orphan")
