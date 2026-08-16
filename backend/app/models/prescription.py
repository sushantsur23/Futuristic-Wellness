import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base

class PrescriptionTemplate(Base):
    __tablename__ = "prescription_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("client_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    template_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prescription_templates.id", ondelete="SET NULL"), nullable=True)
    diagnosis: Mapped[str] = mapped_column(String(1000), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)  # "DRAFT", "FINALIZED"
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    appointment: Mapped["Appointment"] = relationship(back_populates="prescriptions")
    client: Mapped["ClientProfile"] = relationship(back_populates="prescriptions")
    doctor: Mapped["DoctorProfile"] = relationship(back_populates="prescriptions")
