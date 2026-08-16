import uuid
from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base_class import Base

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialization: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), nullable=False)
    signature_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    picture_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    trustpilot_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    show_social_links: Mapped[bool] = mapped_column(default=True, nullable=False)
    show_linkedin: Mapped[bool] = mapped_column(default=True, nullable=False)
    show_instagram: Mapped[bool] = mapped_column(default=True, nullable=False)
    show_facebook: Mapped[bool] = mapped_column(default=True, nullable=False)
    show_youtube: Mapped[bool] = mapped_column(default=True, nullable=False)
    show_trustpilot: Mapped[bool] = mapped_column(default=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="doctor_profile")
    session_types: Mapped[list["SessionType"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")
    slots: Mapped[list["Slot"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")
