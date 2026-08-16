from datetime import date
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid

class UserBase(BaseModel):
    email: EmailStr
    phone: str
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class ClientRegister(UserCreate):
    alternate_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    medical_history_summary: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str  # Can be email or phone
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: uuid.UUID
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class PasswordResetRequest(BaseModel):
    identifier: str
    channel: Optional[str] = "email"  # "email" or "phone"

class PasswordResetConfirm(BaseModel):
    identifier: Optional[str] = None
    token: Optional[str] = None  # Accepts either token or otp
    otp: Optional[str] = None
    new_password: str = Field(..., min_length=6)

