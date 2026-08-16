import random
from datetime import timedelta
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.deps import get_db, get_current_active_user
from backend.app.core.security import get_password_hash, verify_password, create_access_token
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.client import ClientProfile
from backend.app.schemas.user import ClientRegister, UserLogin, Token, UserOut, PasswordResetRequest, PasswordResetConfirm
from backend.app.services.notifications import notify, send_email_async, send_sms_async

router = APIRouter()
logger = logging.getLogger("auth_router")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_client(
    data: ClientRegister,
    db: AsyncSession = Depends(get_db)
):
    # Normalize inputs
    email = data.email.strip().lower()
    phone = data.phone.strip()

    # Check for existing email
    result_email = await db.execute(select(User).where(User.email == email))
    if result_email.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Check for existing phone
    result_phone = await db.execute(select(User).where(User.phone == phone))
    if result_phone.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this phone number already exists."
        )

    # Create new client user
    hashed_pw = get_password_hash(data.password)
    new_user = User(
        email=email,
        phone=phone,
        hashed_password=hashed_pw,
        role="CLIENT",
        full_name=data.full_name,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    # Create client profile
    client_profile = ClientProfile(
        user_id=new_user.id,
        alternate_phone=data.alternate_phone.strip() if data.alternate_phone else None,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        address=data.address,
        medical_history_summary=data.medical_history_summary
    )
    db.add(client_profile)
    await db.commit()
    await db.refresh(new_user)

    # Send Welcome notifications (Dual-Send)
    # Find seeded doctor account to notify
    result_doc = await db.execute(select(User).where(User.role == "DOCTOR"))
    doctor = result_doc.scalars().first()
    if doctor:
        try:
            await notify(db, "WELCOME", client=new_user, doctor=doctor, context={})
        except Exception as e:
            logger.error(f"Failed to send welcome email notifications: {e}")

    return new_user

@router.post("/login", response_model=Token)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    print(f"[DEBUG LOGIN] Identifier: '{data.identifier}' (len={len(data.identifier)}), Password: '{data.password}' (len={len(data.password)})")
    identifier = data.identifier.strip().lower()

    # Look up by email or phone
    result = await db.execute(
        select(User).where(
            (User.email == identifier) | (User.phone == data.identifier.strip())
        )
    )
    user = result.scalars().first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    # Create JWT access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# Password reset in-memory store for OTP tokens
# Maps OTP code or identifier to metadata dict: {"user_id": ..., "otp": ..., "channel": ..., "email": ..., "phone": ...}
temp_reset_tokens = {}

@router.post("/password-reset/request")
async def request_password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    raw_identifier = data.identifier.strip()
    identifier = raw_identifier.lower()

    result = await db.execute(
        select(User).where(
            (User.email == identifier) | (User.phone == raw_identifier)
        )
    )
    user = result.scalars().first()

    if not user:
        # Security response (prevents account enumeration) while preserving clean flow
        return {
            "message": "If an account matches, a 6-digit OTP code has been sent.",
            "channel": data.channel or "email"
        }

    # Generate 6-digit numeric OTP code
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP metadata
    reset_data = {
        "user_id": user.id,
        "otp": otp_code,
        "email": user.email,
        "phone": user.phone,
        "channel": data.channel or ("phone" if data.channel == "phone" else "email")
    }
    
    temp_reset_tokens[otp_code] = reset_data
    temp_reset_tokens[user.email] = reset_data
    temp_reset_tokens[user.phone] = reset_data

    target_channel = data.channel or ("email" if "@" in raw_identifier else "phone")

    if target_channel == "phone":
        sms_msg = f"Your {settings.PROJECT_NAME} password reset OTP code is: {otp_code}. Valid for 10 minutes."
        await send_sms_async(user.phone, sms_msg)
        delivery_target = user.phone
    else:
        subject = f"[{settings.PROJECT_NAME}] Password Reset Verification Code"
        body = (
            f"Hello {user.full_name},\n\n"
            f"You requested a password reset for your {settings.PROJECT_NAME} account.\n"
            f"Your 6-digit OTP verification code is: {otp_code}\n\n"
            f"This code will expire in 10 minutes.\n"
            f"If you did not request this reset, please ignore this email.\n\n"
            f"Best regards,\n"
            f"{settings.PROJECT_NAME} Team"
        )
        await send_email_async(subject, user.email, body)
        delivery_target = user.email

    return {
        "message": f"6-digit OTP code sent via {target_channel.upper()} to {delivery_target}.",
        "reset_code": otp_code,
        "channel": target_channel,
        "target": delivery_target
    }

@router.post("/password-reset/confirm")
async def confirm_password_reset(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    otp_input = (data.otp or data.token or "").strip()
    identifier_input = (data.identifier or "").strip().lower()

    reset_record = None
    if otp_input in temp_reset_tokens:
        record = temp_reset_tokens[otp_input]
        if isinstance(record, dict):
            reset_record = record
        else:
            reset_record = {"user_id": record, "otp": otp_input}
    elif identifier_input in temp_reset_tokens:
        record = temp_reset_tokens[identifier_input]
        if isinstance(record, dict) and record.get("otp") == otp_input:
            reset_record = record

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP verification code."
        )

    user_id = reset_record["user_id"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account not found."
        )

    user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    
    # Invalidate OTP codes for this user
    keys_to_delete = [k for k, v in list(temp_reset_tokens.items()) if (isinstance(v, dict) and v.get("user_id") == user.id) or k == otp_input]
    for k in keys_to_delete:
        temp_reset_tokens.pop(k, None)

    return {"message": "Password reset successful. You may now log in with your new password."}


@router.get("/me", response_model=UserOut)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current logged in user details and role.
    """
    return current_user

