import uuid
from typing import Optional
from pydantic import BaseModel, Field

class SessionTypeBase(BaseModel):
    name: str = Field(..., max_length=255)
    category: str  # "APPOINTMENT", "SESSION_PHYSIOTHERAPY", "SESSION_YOGA", "CONFERENCE"
    duration_minutes: int = Field(..., gt=0)
    capacity: int = Field(1, gt=0)
    description: Optional[str] = None
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    is_active: bool = True

class SessionTypeCreate(SessionTypeBase):
    pass

class SessionTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    duration_minutes: Optional[int] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    is_active: Optional[bool] = None

class SessionTypeOut(SessionTypeBase):
    id: uuid.UUID
    doctor_id: uuid.UUID

    class Config:
        from_attributes = True
