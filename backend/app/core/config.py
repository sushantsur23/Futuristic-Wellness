import os
from typing import List
from pydantic import AnyHttpUrl, EmailStr, BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def parse_cors_origins(v: str | List[str]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.example", ".env"), env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Futuristic Wellness"
    
    # CORS Origins (comma-separated string or list)
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors_origins)
    ] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/futuristic_wellness"
    JWT_SECRET: str = "SUPER_SECRET_KEY_FOR_JWT_SIGNING_1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # SMTP Configuration
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@futuristicwellness.example"
    EMAILS_FROM_NAME: str = "Futuristic Wellness"

    # Prescription PDFs and Signature uploads
    UPLOAD_DIR: str = "static/uploads"

    # System Doctor details (seeded)
    DOCTOR_EMAIL: str = "doctor@futuristicwellness.example"
    DOCTOR_PHONE: str = "+10000000000"
    DOCTOR_NAME: str = "Dr Swandha Majumdar"
    DOCTOR_SPECIALIZATION: str = "Advanced Rehabilitation Specialist"
    DOCTOR_REG_NUMBER: str = "2010/05/PT/000486"

settings = Settings()
