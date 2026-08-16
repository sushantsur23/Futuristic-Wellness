from datetime import date, time, datetime
from typing import Optional, List
import uuid
from pydantic import BaseModel, Field

class AvailabilityRuleBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time
    session_type_id: uuid.UUID
    valid_from: date
    valid_to: date

class AvailabilityRuleCreate(AvailabilityRuleBase):
    pass

class BulkAvailabilityRuleCreate(BaseModel):
    days_of_week: List[int]
    start_time: time
    end_time: time
    session_type_id: uuid.UUID
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None

class AvailabilityRuleOut(AvailabilityRuleBase):
    id: uuid.UUID
    doctor_id: uuid.UUID

    class Config:
        from_attributes = True



class AvailabilityExceptionBase(BaseModel):
    session_type_id: Optional[uuid.UUID] = None
    date: date
    is_blocked: bool = False
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class AvailabilityExceptionCreate(AvailabilityExceptionBase):
    pass

class AvailabilityExceptionOut(AvailabilityExceptionBase):
    id: uuid.UUID
    doctor_id: uuid.UUID

    class Config:
        from_attributes = True


class SlotOut(BaseModel):
    id: uuid.UUID
    doctor_id: uuid.UUID
    session_type_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    capacity: int
    booked_count: int
    status: str  # "OPEN", "FULL", "BLOCKED"

    class Config:
        from_attributes = True
