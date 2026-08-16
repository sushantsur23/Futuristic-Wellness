import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("slots.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("client_profiles.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="BOOKED", nullable=False)  # "BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"
    notes_from_client: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "Google Meet", "Zoom", "Microsoft Teams", "Custom"
    mode: Mapped[str] = mapped_column(String(20), default="ONLINE", nullable=False)  # "ONLINE" or "OFFLINE"
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    slot: Mapped["Slot"] = relationship(back_populates="appointments")
    client: Mapped["ClientProfile"] = relationship(back_populates="appointments")
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="appointment")
