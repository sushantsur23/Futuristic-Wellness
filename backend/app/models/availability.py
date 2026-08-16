import uuid
from datetime import date, time, datetime
from sqlalchemy import Integer, ForeignKey, Date, Time, Boolean, DateTime, UniqueConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base

class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon, 6=Sun
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    session_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("session_types.id", ondelete="CASCADE"), nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    valid_to: Mapped[date] = mapped_column(Date, nullable=False)

    session_type: Mapped["SessionType"] = relationship(back_populates="availability_rules")


class AvailabilityException(Base):
    __tablename__ = "availability_exceptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    session_type_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_types.id", ondelete="CASCADE"), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)


class Slot(Base):
    __tablename__ = "slots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    session_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("session_types.id", ondelete="CASCADE"), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    booked_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="OPEN", nullable=False)  # "OPEN", "FULL", "BLOCKED"

    doctor: Mapped["DoctorProfile"] = relationship(back_populates="slots")
    session_type: Mapped["SessionType"] = relationship(back_populates="slots")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="slot", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("doctor_id", "start_at", "session_type_id", name="uix_doctor_start_session_type"),
    )
