import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.app.schemas.availability import SlotOut
from backend.app.schemas.session import SessionTypeOut

class AppointmentCreate(BaseModel):
    slot_id: uuid.UUID
    notes_from_client: Optional[str] = None
    mode: Optional[str] = "ONLINE"  # "ONLINE" or "OFFLINE"

class AppointmentCancel(BaseModel):
    cancellation_reason: Optional[str] = None

class AppointmentMeetingUpdate(BaseModel):
    meeting_link: Optional[str] = None
    meeting_provider: Optional[str] = None

class AppointmentModeUpdate(BaseModel):
    mode: str  # "ONLINE" or "OFFLINE"

class AppointmentOut(BaseModel):
    id: uuid.UUID
    slot_id: uuid.UUID
    client_id: uuid.UUID
    status: str  # "BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"
    notes_from_client: Optional[str] = None
    cancellation_reason: Optional[str] = None
    meeting_link: Optional[str] = None
    meeting_provider: Optional[str] = None
    mode: str = "ONLINE"
    booked_at: datetime
    cancelled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Extended response for frontend mapping
class AppointmentDetailsOut(AppointmentOut):
    slot: SlotOut
    session_type: SessionTypeOut
    doctor_name: str
    client_name: str
    client_email: str
    client_phone: str

    class Config:
        from_attributes = True
