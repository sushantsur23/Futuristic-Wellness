import uuid
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base

class SessionType(Base):
    __tablename__ = "session_types"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # "APPOINTMENT", "SESSION_PHYSIOTHERAPY", "SESSION_YOGA", "CONFERENCE"
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    location_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    google_maps_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    doctor: Mapped["DoctorProfile"] = relationship(back_populates="session_types")
    slots: Mapped[list["Slot"]] = relationship(back_populates="session_type", cascade="all, delete-orphan")
    availability_rules: Mapped[list["AvailabilityRule"]] = relationship(back_populates="session_type", cascade="all, delete-orphan")
