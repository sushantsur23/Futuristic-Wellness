from pydantic import BaseModel
from typing import Optional
import uuid

class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    registration_number: Optional[str] = None
    picture_url: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    trustpilot_url: Optional[str] = None
    show_social_links: Optional[bool] = None
    show_linkedin: Optional[bool] = None
    show_instagram: Optional[bool] = None
    show_facebook: Optional[bool] = None
    show_youtube: Optional[bool] = None
    show_trustpilot: Optional[bool] = None

class DoctorProfileOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str
    specialization: str
    registration_number: str
    signature_url: Optional[str] = None
    picture_url: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    trustpilot_url: Optional[str] = None
    show_social_links: bool = True
    show_linkedin: bool = True
    show_instagram: bool = True
    show_facebook: bool = True
    show_youtube: bool = True
    show_trustpilot: bool = True

    class Config:
        from_attributes = True
