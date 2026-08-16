from datetime import datetime, date
from typing import List, Optional, Dict, Any
import uuid
from pydantic import BaseModel, Field

class VitalsSchema(BaseModel):
    pulse: Optional[str] = ""
    spo2: Optional[str] = ""
    bp: Optional[str] = ""
    temp: Optional[str] = ""
    weight: Optional[str] = ""

class MedicineSchema(BaseModel):
    name: str
    generic: Optional[str] = ""
    frequency: str
    duration: str
    notes: Optional[str] = ""

class PrescriptionContentSchema(BaseModel):
    vitals: VitalsSchema = Field(default_factory=VitalsSchema)
    symptoms: Optional[str] = ""
    findings: Optional[str] = ""
    notes: Optional[str] = ""
    diagnosis: str
    medicines: List[MedicineSchema] = Field(default_factory=list)
    instructions: List[str] = Field(default_factory=list)

class PrescriptionTemplateCreate(BaseModel):
    name: str
    content: PrescriptionContentSchema
    is_favorite: bool = False

class PrescriptionTemplateOut(BaseModel):
    id: uuid.UUID
    doctor_id: uuid.UUID
    name: str
    content: PrescriptionContentSchema
    is_favorite: bool

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    appointment_id: Optional[uuid.UUID] = None
    client_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    diagnosis: str
    content: PrescriptionContentSchema
    status: str = "DRAFT"  # "DRAFT", "FINALIZED"

class PrescriptionUpdate(BaseModel):
    client_id: Optional[uuid.UUID] = None
    appointment_id: Optional[uuid.UUID] = None
    template_id: Optional[uuid.UUID] = None
    diagnosis: Optional[str] = None
    content: Optional[PrescriptionContentSchema] = None
    status: Optional[str] = None  # "DRAFT", "FINALIZED"

class PrescriptionOut(BaseModel):
    id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    client_id: uuid.UUID
    doctor_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    diagnosis: str
    content: PrescriptionContentSchema
    version: int
    pdf_url: Optional[str] = None
    status: str
    issued_at: Optional[datetime] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None

    class Config:
        from_attributes = True

class RegisteredClientOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    medical_history_summary: Optional[str] = None

    class Config:
        from_attributes = True

class ClientDetailUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    medical_history_summary: Optional[str] = None
