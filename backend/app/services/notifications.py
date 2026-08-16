import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.core.config import settings
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

logger = logging.getLogger("notifications")

# ConnectionConfig setup for fastapi-mail
mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.EMAILS_FROM_EMAIL,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=settings.SMTP_TLS,
    MAIL_SSL_TLS=settings.SMTP_SSL,
    USE_CREDENTIALS=bool(settings.SMTP_USER),
    VALIDATE_CERTS=False
)

async def send_email_async(subject: str, recipient: str, body: str):
    """
    Sends an email using fastapi-mail. Fallbacks to console print if credentials are missing
    or if sending fails.
    """
    # Print to console for development visibility
    print("\n" + "="*80)
    print(f"SIMULATED EMAIL SENT TO: {recipient}")
    print(f"SUBJECT: {subject}")
    print(f"BODY:\n{body}")
    print("="*80 + "\n")

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return "SENT_SIMULATED"

    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=body,
        subtype=MessageType.plain
    )

    fm = FastMail(mail_config)
    try:
        await fm.send_message(message)
        return "SENT"
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}")
        return "FAILED"


async def send_sms_async(recipient_phone: str, message: str) -> str:
    """
    Sends an SMS notification. Fallbacks to clean console print in dev mode.
    """
    print("\n" + "="*80)
    print(f"📱 SIMULATED SMS SENT TO: {recipient_phone}")
    print(f"MESSAGE: {message}")
    print("="*80 + "\n")
    return "SENT_SIMULATED"


async def notify(
    db: AsyncSession,
    event_type: str,
    client: User,
    doctor: User,
    context: Dict[str, Any]
) -> None:
    """
    Dual-send notification service. Always creates a notification record for both parties
    and sends them emails.
    """
    # 1. Onboarding Notification
    if event_type == "WELCOME":
        client_subject = f"Welcome to {settings.PROJECT_NAME}!"
        client_body = (
            f"Hello {client.full_name},\n\n"
            f"Thank you for registering with {settings.PROJECT_NAME}. "
            f"You can now book appointments, view your sessions, and download your prescriptions.\n\n"
            f"Best regards,\n"
            f"{settings.PROJECT_NAME} Team"
        )

        doctor_subject = f"[Admin] New Client Registered on {settings.PROJECT_NAME}"
        doctor_body = (
            f"Hello {doctor.full_name},\n\n"
            f"A new client has registered on the platform:\n"
            f"Name: {client.full_name}\n"
            f"Email: {client.email}\n"
            f"Phone: {client.phone}\n\n"
            f"Regards,\n"
            f"{settings.PROJECT_NAME} System"
        )

        # Client notification DB record
        n_client = Notification(
            user_id=client.id,
            type="WELCOME",
            channel="EMAIL",
            payload={"subject": client_subject, "body": client_body},
            status="QUEUED"
        )
        # Doctor notification DB record
        n_doctor = Notification(
            user_id=doctor.id,
            type="WELCOME",
            channel="EMAIL",
            payload={"subject": doctor_subject, "body": doctor_body},
            status="QUEUED"
        )
        db.add(n_client)
        db.add(n_doctor)
        await db.commit()

        # Send emails asynchronously
        status_c = await send_email_async(client_subject, client.email, client_body)
        status_d = await send_email_async(doctor_subject, doctor.email, doctor_body)

        n_client.status = "SENT" if "SENT" in status_c else "FAILED"
        n_client.sent_at = datetime.now(timezone.utc)
        n_doctor.status = "SENT" if "SENT" in status_d else "FAILED"
        n_doctor.sent_at = datetime.now(timezone.utc)
        await db.commit()

    # 2. Booking Confirmation
    elif event_type == "BOOKING_CONFIRMATION":
        start_time = context.get("start_time")
        category_name = context.get("category_name", "Appointment")
        cancel_url = context.get("cancel_url", "")

        client_subject = f"Booking Confirmed: {category_name} with {doctor.full_name}"
        client_body = (
            f"Hello {client.full_name},\n\n"
            f"Your booking for a {category_name} with {doctor.full_name} is confirmed.\n"
            f"Time: {start_time}\n\n"
            f"Note: You can cancel this booking free of charge up to 1 hour before the start time.\n"
            f"Cancellation Link: {cancel_url}\n\n"
            f"Thank you,\n"
            f"{settings.PROJECT_NAME} Team"
        )

        doctor_subject = f"New Booking: {category_name} with {client.full_name}"
        doctor_body = (
            f"Hello {doctor.full_name},\n\n"
            f"You have a new booking:\n"
            f"Client: {client.full_name}\n"
            f"Category: {category_name}\n"
            f"Time: {start_time}\n"
            f"Client Notes: {context.get('notes', 'None')}\n\n"
            f"Regards,\n"
            f"{settings.PROJECT_NAME} System"
        )

        n_client = Notification(
            user_id=client.id,
            type="BOOKING_CONFIRMATION",
            channel="EMAIL",
            payload={"subject": client_subject, "body": client_body},
            status="QUEUED"
        )
        n_doctor = Notification(
            user_id=doctor.id,
            type="BOOKING_CONFIRMATION",
            channel="EMAIL",
            payload={"subject": doctor_subject, "body": doctor_body},
            status="QUEUED"
        )
        db.add(n_client)
        db.add(n_doctor)
        await db.commit()

        status_c = await send_email_async(client_subject, client.email, client_body)
        status_d = await send_email_async(doctor_subject, doctor.email, doctor_body)

        n_client.status = "SENT" if "SENT" in status_c else "FAILED"
        n_client.sent_at = datetime.now(timezone.utc)
        n_doctor.status = "SENT" if "SENT" in status_d else "FAILED"
        n_doctor.sent_at = datetime.now(timezone.utc)
        await db.commit()

    # 3. Cancellation
    elif event_type == "CANCELLATION":
        start_time = context.get("start_time")
        category_name = context.get("category_name", "Appointment")
        reason = context.get("reason", "No reason provided")

        client_subject = f"Booking Cancelled: {category_name} with {doctor.full_name}"
        client_body = (
            f"Hello {client.full_name},\n\n"
            f"Your booking for a {category_name} on {start_time} has been cancelled.\n"
            f"Reason: {reason}\n\n"
            f"Feel free to book a different time slot.\n\n"
            f"Best regards,\n"
            f"{settings.PROJECT_NAME} Team"
        )

        doctor_subject = f"Booking Cancelled: {category_name} by {client.full_name}"
        doctor_body = (
            f"Hello {doctor.full_name},\n\n"
            f"The booking on {start_time} has been cancelled by the client.\n"
            f"Client: {client.full_name}\n"
            f"Category: {category_name}\n"
            f"Reason: {reason}\n\n"
            f"This slot is now open for other clients.\n\n"
            f"Regards,\n"
            f"{settings.PROJECT_NAME} System"
        )

        n_client = Notification(
            user_id=client.id,
            type="CANCELLATION",
            channel="EMAIL",
            payload={"subject": client_subject, "body": client_body},
            status="QUEUED"
        )
        n_doctor = Notification(
            user_id=doctor.id,
            type="CANCELLATION",
            channel="EMAIL",
            payload={"subject": doctor_subject, "body": doctor_body},
            status="QUEUED"
        )
        db.add(n_client)
        db.add(n_doctor)
        await db.commit()

        status_c = await send_email_async(client_subject, client.email, client_body)
        status_d = await send_email_async(doctor_subject, doctor.email, doctor_body)

        n_client.status = "SENT" if "SENT" in status_c else "FAILED"
        n_client.sent_at = datetime.now(timezone.utc)
        n_doctor.status = "SENT" if "SENT" in status_d else "FAILED"
        n_doctor.sent_at = datetime.now(timezone.utc)
        await db.commit()

    # 4. Prescription Issued (Single recipient: client only)
    elif event_type == "PRESCRIPTION_ISSUED":
        download_url = context.get("download_url", "")
        diagnosis = context.get("diagnosis", "")

        client_subject = f"New Prescription Issued from {doctor.full_name}"
        client_body = (
            f"Hello {client.full_name},\n\n"
            f"Dr. {doctor.full_name} has finalized a new prescription for you.\n"
            f"Diagnosis: {diagnosis}\n\n"
            f"You can log in to your account and download the PDF here: {download_url}\n\n"
            f"Warm regards,\n"
            f"{settings.PROJECT_NAME} Team"
        )

        n_client = Notification(
            user_id=client.id,
            type="PRESCRIPTION_ISSUED",
            channel="EMAIL",
            payload={"subject": client_subject, "body": client_body},
            status="QUEUED"
        )
        db.add(n_client)
        await db.commit()

        status_c = await send_email_async(client_subject, client.email, client_body)

        n_client.status = "SENT" if "SENT" in status_c else "FAILED"
        n_client.sent_at = datetime.now(timezone.utc)
        await db.commit()
