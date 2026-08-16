import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    appointment_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewTogglePublished(BaseModel):
    is_published: bool

class ReviewOut(BaseModel):
    id: uuid.UUID
    appointment_id: uuid.UUID
    client_id: uuid.UUID
    doctor_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    is_published: bool
    created_at: datetime
    client_name: str
    appointment_date: str
    session_type_name: str

    class Config:
        from_attributes = True
