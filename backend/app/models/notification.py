import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base_class import Base

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)  # WELCOME, BOOKING_CONFIRMATION, CANCELLATION, REMINDER_24H, REMINDER_1H, PRESCRIPTION_ISSUED
    channel: Mapped[str] = mapped_column(String(50), default="EMAIL", nullable=False)  # EMAIL, SMS, PUSH
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False)  # QUEUED, SENT, FAILED
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
