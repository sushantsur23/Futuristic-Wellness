import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("client_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5 stars
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Doctor toggles visibility
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False)

    appointment: Mapped["Appointment"] = relationship()
    client: Mapped["ClientProfile"] = relationship()
    doctor: Mapped["DoctorProfile"] = relationship()
