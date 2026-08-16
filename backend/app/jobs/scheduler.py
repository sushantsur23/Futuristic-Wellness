import logging
import json
from datetime import date, datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from backend.app.db.session import SessionLocal
from backend.app.models.doctor import DoctorProfile
from backend.app.models.appointment import Appointment
from backend.app.models.availability import Slot
from backend.app.models.user import User
from backend.app.models.client import ClientProfile
from backend.app.models.session import SessionType
from backend.app.models.notification import Notification
from backend.app.services.slots import generate_slots
from backend.app.services.notifications import send_email_async

logger = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler()

async def run_slot_generation_job():
    """
    Job that runs nightly to generate slots for all doctors for the next 6 months.
    """
    logger.info("Running nightly slot generation job...")
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(DoctorProfile))
            doctors = result.scalars().all()
            
            start_date = date.today()
            end_date = start_date + timedelta(days=180) # 6 months
            
            for doctor in doctors:
                await generate_slots(db, doctor.id, start_date, end_date)
            logger.info("Nightly slot generation job completed successfully.")
        except Exception as e:
            logger.error(f"Error during slot generation job: {e}")


async def send_appointment_reminders():
    """
    Scans for booked appointments starting in approx 24h or 1h,
    and sends reminder emails to clients if not already sent.
    """
    logger.info("Checking for upcoming appointment reminders...")
    now = datetime.now(timezone.utc)
    
    async with SessionLocal() as db:
        try:
            # 1. Fetch BOOKED appointments in next 25 hours
            one_day_later = now + timedelta(hours=25)
            result = await db.execute(
                select(Appointment)
                .join(Slot, Appointment.slot_id == Slot.id)
                .where(
                    (Appointment.status == "BOOKED") &
                    (Slot.start_at > now) &
                    (Slot.start_at <= one_day_later)
                )
            )
            appointments = result.scalars().all()
            
            for app in appointments:
                # Load slot & session type
                slot_res = await db.execute(select(Slot).where(Slot.id == app.slot_id))
                slot = slot_res.scalars().first()
                if not slot:
                    continue

                st_res = await db.execute(select(SessionType).where(SessionType.id == slot.session_type_id))
                session_type = st_res.scalars().first()
                session_name = session_type.name if session_type else "Session"

                # Load client details
                client_res = await db.execute(
                    select(User).join(ClientProfile).where(ClientProfile.id == app.client_id)
                )
                client_user = client_res.scalars().first()
                if not client_user:
                    continue

                # Load doctor details
                doc_res = await db.execute(
                    select(User).join(DoctorProfile).where(DoctorProfile.id == slot.doctor_id)
                )
                doctor_user = doc_res.scalars().first()
                doctor_name = doctor_user.full_name if doctor_user else "Doctor"

                # Time left in hours
                start_at_utc = slot.start_at.replace(tzinfo=timezone.utc) if slot.start_at.tzinfo is None else slot.start_at
                time_diff = start_at_utc - now
                time_diff_hours = time_diff.total_seconds() / 3600.0
                start_time_str = slot.start_at.strftime("%Y-%m-%d %I:%M %p UTC")

                # A. 24-Hour Reminder (approx 23 to 25 hours before start)
                if 23.0 <= time_diff_hours <= 25.0:
                    # Check if reminder already sent (stateless db check)
                    dup_res = await db.execute(
                        select(Notification).where(
                            (Notification.user_id == client_user.id) &
                            (Notification.type == "REMINDER_24H")
                        )
                    )
                    already_sent = False
                    for note in dup_res.scalars().all():
                        if str(app.id) in json.dumps(note.payload):
                            already_sent = True
                            break

                    if not already_sent:
                        subject = f"Reminder: 24 Hours until your {session_name} with {doctor_name}"
                        body = (
                            f"Hello {client_user.full_name},\n\n"
                            f"This is a reminder that your {session_name} with {doctor_name} is scheduled in 24 hours.\n"
                            f"Time: {start_time_str}\n\n"
                            f"Regards,\n"
                            f"{settings.PROJECT_NAME} Team"
                        )
                        # Save and send
                        n_rec = Notification(
                            user_id=client_user.id,
                            type="REMINDER_24H",
                            channel="EMAIL",
                            payload={"appointment_id": str(app.id), "subject": subject, "body": body},
                            status="QUEUED"
                        )
                        db.add(n_rec)
                        await db.commit()

                        status_email = await send_email_async(subject, client_user.email, body)
                        n_rec.status = "SENT" if "SENT" in status_email else "FAILED"
                        n_rec.sent_at = datetime.now(timezone.utc)
                        await db.commit()

                # B. 1-Hour Reminder (approx 0.7 to 1.5 hours before start)
                elif 0.7 <= time_diff_hours <= 1.5:
                    dup_res = await db.execute(
                        select(Notification).where(
                            (Notification.user_id == client_user.id) &
                            (Notification.type == "REMINDER_1H")
                        )
                    )
                    already_sent = False
                    for note in dup_res.scalars().all():
                        if str(app.id) in json.dumps(note.payload):
                            already_sent = True
                            break

                    if not already_sent:
                        subject = f"Reminder: 1 Hour until your {session_name} with {doctor_name}"
                        body = (
                            f"Hello {client_user.full_name},\n\n"
                            f"This is a reminder that your {session_name} with {doctor_name} starts in 1 hour.\n"
                            f"Time: {start_time_str}\n\n"
                            f"Regards,\n"
                            f"{settings.PROJECT_NAME} Team"
                        )
                        n_rec = Notification(
                            user_id=client_user.id,
                            type="REMINDER_1H",
                            channel="EMAIL",
                            payload={"appointment_id": str(app.id), "subject": subject, "body": body},
                            status="QUEUED"
                        )
                        db.add(n_rec)
                        await db.commit()

                        status_email = await send_email_async(subject, client_user.email, body)
                        n_rec.status = "SENT" if "SENT" in status_email else "FAILED"
                        n_rec.sent_at = datetime.now(timezone.utc)
                        await db.commit()

        except Exception as e:
            logger.error(f"Error during reminder generation job: {e}")


def start_scheduler():
    """
    Starts the scheduler and schedules the nightly slot generation and periodic reminders.
    """
    # Schedule job daily at 00:00 (midnight)
    scheduler.add_job(
        run_slot_generation_job,
        trigger="cron",
        hour=0,
        minute=0,
        id="nightly_slot_generation",
        replace_existing=True
    )
    # Check for reminders every 5 minutes
    scheduler.add_job(
        send_appointment_reminders,
        trigger="interval",
        minutes=5,
        id="appointment_reminders",
        replace_existing=True
    )
    scheduler.start()
    logger.info("APScheduler background scheduler started.")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("APScheduler background scheduler shut down.")
