import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.deps import get_db, get_current_active_user, is_doctor, is_client
from backend.app.models.user import User
from backend.app.models.doctor import DoctorProfile
from backend.app.models.client import ClientProfile
from backend.app.models.prescription import PrescriptionTemplate, Prescription
from backend.app.models.appointment import Appointment
from backend.app.schemas.prescription import (
    PrescriptionTemplateCreate, PrescriptionTemplateOut,
    PrescriptionCreate, PrescriptionUpdate, PrescriptionOut
)
from backend.app.services.prescription_pdf import generate_prescription_pdf, _signature_to_data_uri
from backend.app.services.notifications import notify
from backend.app.core.config import settings

router = APIRouter()
logger = logging.getLogger("prescriptions_router")

# ─────────────────────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/templates", response_model=PrescriptionTemplateOut)
async def create_prescription_template(
    data: PrescriptionTemplateCreate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a reusable prescription template (Doctor only).
    """
    doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc = doc_res.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    new_temp = PrescriptionTemplate(
        doctor_id=doc.id,
        name=data.name,
        content=data.content.model_dump(),
        is_favorite=data.is_favorite
    )
    db.add(new_temp)
    await db.commit()
    await db.refresh(new_temp)
    return new_temp


@router.get("/templates", response_model=List[PrescriptionTemplateOut])
async def get_prescription_templates(
    mine: bool = True,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    List prescription templates (Doctor only).
    """
    doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc = doc_res.scalars().first()
    if not doc:
        return []

    query = select(PrescriptionTemplate).where(PrescriptionTemplate.doctor_id == doc.id)
    result = await db.execute(query)
    return result.scalars().all()


# ─────────────────────────────────────────────────────────────────────────────
# Prescriptions
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=PrescriptionOut)
async def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a prescription in DRAFT status (Doctor only).
    If creating a new version for the same appointment, version is auto-incremented.
    """
    doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc = doc_res.scalars().first()
    if not doc:
        raise HTTPException(status_code=400, detail="Doctor profile not configured")

    # Verify client exists
    client_res = await db.execute(select(ClientProfile).where(ClientProfile.id == data.client_id))
    if not client_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid client ID")

    # Handle version tracking if appointment already has a prescription
    version = 1
    if data.appointment_id:
        existing_res = await db.execute(
            select(Prescription)
            .where(Prescription.appointment_id == data.appointment_id)
            .order_by(Prescription.version.desc())
        )
        existing = existing_res.scalars().first()
        if existing:
            version = existing.version + 1

    new_pres = Prescription(
        appointment_id=data.appointment_id,
        client_id=data.client_id,
        doctor_id=doc.id,
        template_id=data.template_id,
        diagnosis=data.diagnosis,
        content=data.content.model_dump(),
        version=version,
        status="DRAFT"
    )
    db.add(new_pres)
    await db.commit()
    await db.refresh(new_pres)
    return new_pres


@router.patch("/{id}/finalize", response_model=PrescriptionOut)
async def finalize_prescription(
    id: uuid.UUID,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Lock the prescription, render the PDF, store it, and send patient notification.
    """
    # Fetch prescription
    pres_res = await db.execute(select(Prescription).where(Prescription.id == id))
    pres = pres_res.scalars().first()
    if not pres:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if pres.status == "FINALIZED":
        raise HTTPException(status_code=400, detail="Prescription is already finalized")

    # Verify the requesting doctor owns this prescription
    doc_res = await db.execute(
        select(DoctorProfile, User).join(User, DoctorProfile.user_id == User.id)
        .where(DoctorProfile.user_id == current_user.id)
    )
    doc_row = doc_res.first()
    if not doc_row:
        raise HTTPException(status_code=403, detail="Doctor profile not found")
    doc_profile, doc_user = doc_row

    if pres.doctor_id != doc_profile.id:
        raise HTTPException(status_code=403, detail="You are not authorized to finalize this prescription")

    # Fetch client details (profile + user)
    client_res = await db.execute(
        select(ClientProfile, User).join(User, ClientProfile.user_id == User.id)
        .where(ClientProfile.id == pres.client_id)
    )
    client_row = client_res.first()
    if not client_row:
        raise HTTPException(status_code=400, detail="Client user info not found")
    client_profile, client_user = client_row

    # ── Calculate patient age ──────────────────────────────────────────────
    age_str = "N/A"
    if client_profile.date_of_birth:
        today = datetime.today()
        dob = client_profile.date_of_birth
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        age_str = f"{age}y"

    gender_initial = (client_profile.gender[0].upper()
                      if client_profile.gender else "M")
    patient_age_gender = f"{age_str} / {gender_initial}"

    # ── Timestamp ─────────────────────────────────────────────────────────
    issued_now = datetime.now(timezone.utc)
    issued_date_str = issued_now.strftime("%d-%m-%Y %I:%M %p")

    # ── Signature: convert local file path → base64 data URI ──────────────
    signature_data_uri = _signature_to_data_uri(doc_profile.signature_url)

    # ── Build template context dict ────────────────────────────────────────
    # These variable names must exactly match the {{ }} placeholders in
    # backend/app/templates/prescription.html
    pdf_data = {
        "clinic_name": "Futuristic Physio & Wellness Hub",
        "doctor_name": (doc_user.full_name or "").upper(),
        "credentials_1": "BPTH (KEM), MPTH (MSK), MANUAL & MOVEMENT THERAPIST",
        "credentials_2": "ADVANCED REHABILITATION SPECIALIST",
        "reg_no": doc_profile.registration_number or "",
        # ── Patient fields ──────────────────────────────────────────────
        "patient_name": client_user.full_name or "",
        "issued_date": issued_date_str,
        "patient_age_gender": patient_age_gender,
        "patient_mobile": client_user.phone or "—",
        "patient_office_id": f"MP{str(client_profile.id)[:6].upper()}",
        # ── Clinical content ────────────────────────────────────────────
        "symptoms": pres.content.get("symptoms", ""),
        "findings": pres.content.get("findings", ""),
        "notes": pres.content.get("notes", ""),
        "vitals": pres.content.get("vitals", {}),
        "diagnosis": pres.diagnosis,
        "medicines": pres.content.get("medicines", []),
        "instructions": pres.content.get("instructions", []),
        # ── Footer ─────────────────────────────────────────────────────
        "contact_phone": doc_user.phone or "",
        "contact_email": doc_user.email or "",
        "contact_instagram": "@FuturisticPhysio",
        "signature_data_uri": signature_data_uri,
    }

    # ── Generate PDF file ──────────────────────────────────────────────────
    pdf_filename = f"prescription_{pres.id}.pdf"
    pdf_filepath = os.path.join(settings.UPLOAD_DIR, pdf_filename)

    try:
        generate_prescription_pdf(pdf_data, pdf_filepath)
    except Exception as e:
        logger.error(f"[Finalize] PDF generation failed for prescription {pres.id}: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    # ── Persist finalized state ────────────────────────────────────────────
    pres.status = "FINALIZED"
    pres.issued_at = issued_now
    pres.pdf_url = f"/api/v1/prescriptions/{pres.id}/download"
    await db.commit()
    await db.refresh(pres)

    # ── Notify patient ─────────────────────────────────────────────────────
    download_url = "http://localhost:5173/my-prescriptions"
    try:
        await notify(
            db,
            "PRESCRIPTION_ISSUED",
            client=client_user,
            doctor=doc_user,
            context={"download_url": download_url, "diagnosis": pres.diagnosis}
        )
    except Exception as e:
        logger.error(f"[Finalize] Failed to send prescription email: {e}")

    return pres


# ─────────────────────────────────────────────────────────────────────────────
# Doctor / Admin: view prescriptions (patient-wise or all)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/doctor", response_model=List[PrescriptionOut])
async def get_doctor_prescriptions(
    status_filter: Optional[str] = None,  # "DRAFT", "FINALIZED", or None for all
    client_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    List all prescriptions issued for a specific patient or all patients (Doctor/Admin).
    Optionally filter by status=DRAFT or status=FINALIZED, or by client_id.
    """
    query = (
        select(Prescription, User)
        .join(ClientProfile, Prescription.client_id == ClientProfile.id)
        .join(User, ClientProfile.user_id == User.id)
    )

    if current_user.role == "DOCTOR":
        doc_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
        doc = doc_res.scalars().first()
        if doc:
            query = query.where(Prescription.doctor_id == doc.id)

    if client_id:
        query = query.where(Prescription.client_id == client_id)

    if status_filter in ("DRAFT", "FINALIZED"):
        query = query.where(Prescription.status == status_filter)

    query = query.order_by(Prescription.issued_at.desc().nulls_last())

    result = await db.execute(query)
    rows = result.all()

    out = []
    for pres, client_user in rows:
        p_out = PrescriptionOut.model_validate(pres)
        p_out.client_name = client_user.full_name
        p_out.client_phone = client_user.phone
        p_out.client_email = client_user.email
        out.append(p_out)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Get Single Prescription Details
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{id}", response_model=PrescriptionOut)
async def get_prescription_by_id(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get single prescription details by ID.
    """
    query = (
        select(Prescription, User)
        .join(ClientProfile, Prescription.client_id == ClientProfile.id)
        .join(User, ClientProfile.user_id == User.id)
        .where(Prescription.id == id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")

    pres, client_user = row

    authorized = False
    if current_user.role in ("DOCTOR", "ADMIN"):
        authorized = True
    elif current_user.role == "CLIENT":
        client_res = await db.execute(select(ClientProfile).where(ClientProfile.user_id == current_user.id))
        client = client_res.scalars().first()
        if client and pres.client_id == client.id:
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view this prescription")

    p_out = PrescriptionOut.model_validate(pres)
    p_out.client_name = client_user.full_name
    p_out.client_phone = client_user.phone
    p_out.client_email = client_user.email
    return p_out


# ─────────────────────────────────────────────────────────────────────────────
# Doctor/Admin: Edit & Resave Prescription
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/{id}", response_model=PrescriptionOut)
async def update_prescription(
    id: uuid.UUID,
    data: PrescriptionUpdate,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Edit and resave an existing prescription (Doctor/Admin only).
    Updates diagnosis, content, vitals, etc.
    If status is set to FINALIZED, re-renders the PDF and updates pdf_url.
    """
    pres_res = await db.execute(select(Prescription).where(Prescription.id == id))
    pres = pres_res.scalars().first()
    if not pres:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if data.client_id is not None:
        pres.client_id = data.client_id
    if data.appointment_id is not None:
        pres.appointment_id = data.appointment_id
    if data.template_id is not None:
        pres.template_id = data.template_id
    if data.diagnosis is not None:
        pres.diagnosis = data.diagnosis
    if data.content is not None:
        pres.content = data.content.model_dump()

    new_status = data.status if data.status is not None else pres.status

    if new_status == "FINALIZED":
        # Fetch doctor profile & user
        doc_res = await db.execute(
            select(DoctorProfile, User).join(User, DoctorProfile.user_id == User.id)
            .where(DoctorProfile.id == pres.doctor_id)
        )
        doc_row = doc_res.first()
        if not doc_row:
            doc_res = await db.execute(
                select(DoctorProfile, User).join(User, DoctorProfile.user_id == User.id)
                .where(DoctorProfile.user_id == current_user.id)
            )
            doc_row = doc_res.first()

        if doc_row:
            doc_profile, doc_user = doc_row
        else:
            raise HTTPException(status_code=400, detail="Doctor profile not found for PDF rendering")

        # Fetch client details
        client_res = await db.execute(
            select(ClientProfile, User).join(User, ClientProfile.user_id == User.id)
            .where(ClientProfile.id == pres.client_id)
        )
        client_row = client_res.first()
        if not client_row:
            raise HTTPException(status_code=400, detail="Client user info not found")
        client_profile, client_user = client_row

        # Calculate patient age & gender
        age_str = "N/A"
        if client_profile.date_of_birth:
            today = datetime.today()
            dob = client_profile.date_of_birth
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            age_str = f"{age}y"

        gender_initial = (client_profile.gender[0].upper() if client_profile.gender else "M")
        patient_age_gender = f"{age_str} / {gender_initial}"

        issued_now = datetime.now(timezone.utc)
        issued_date_str = issued_now.strftime("%d-%m-%Y %I:%M %p")
        signature_data_uri = _signature_to_data_uri(doc_profile.signature_url)

        pdf_data = {
            "clinic_name": "Futuristic Physio & Wellness Hub",
            "doctor_name": (doc_user.full_name or "").upper(),
            "credentials_1": "BPTH (KEM), MPTH (MSK), MANUAL & MOVEMENT THERAPIST",
            "credentials_2": "ADVANCED REHABILITATION SPECIALIST",
            "reg_no": doc_profile.registration_number or "",
            "patient_name": client_user.full_name or "",
            "issued_date": issued_date_str,
            "patient_age_gender": patient_age_gender,
            "patient_mobile": client_user.phone or "—",
            "patient_office_id": f"MP{str(client_profile.id)[:6].upper()}",
            "symptoms": pres.content.get("symptoms", ""),
            "findings": pres.content.get("findings", ""),
            "notes": pres.content.get("notes", ""),
            "vitals": pres.content.get("vitals", {}),
            "diagnosis": pres.diagnosis,
            "medicines": pres.content.get("medicines", []),
            "instructions": pres.content.get("instructions", []),
            "contact_phone": doc_user.phone or "",
            "contact_email": doc_user.email or "",
            "contact_instagram": "@FuturisticPhysio",
            "signature_data_uri": signature_data_uri,
        }

        pdf_filename = f"prescription_{pres.id}.pdf"
        pdf_filepath = os.path.join(settings.UPLOAD_DIR, pdf_filename)
        try:
            generate_prescription_pdf(pdf_data, pdf_filepath)
        except Exception as e:
            logger.error(f"[Update] PDF generation failed for prescription {pres.id}: {e}")
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

        pres.status = "FINALIZED"
        pres.issued_at = issued_now
        pres.pdf_url = f"/api/v1/prescriptions/{pres.id}/download"
    else:
        pres.status = "DRAFT"

    await db.commit()
    await db.refresh(pres)

    # Fetch client user for metadata response
    client_res = await db.execute(
        select(User).join(ClientProfile, ClientProfile.user_id == User.id)
        .where(ClientProfile.id == pres.client_id)
    )
    client_user = client_res.scalars().first()

    p_out = PrescriptionOut.model_validate(pres)
    if client_user:
        p_out.client_name = client_user.full_name
        p_out.client_phone = client_user.phone
        p_out.client_email = client_user.email
    return p_out


# ─────────────────────────────────────────────────────────────────────────────
# Doctor/Admin: Delete Prescription
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{id}")
async def delete_prescription(
    id: uuid.UUID,
    current_user: User = Depends(is_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a prescription and remove its PDF file from disk (Doctor/Admin only).
    """
    pres_res = await db.execute(select(Prescription).where(Prescription.id == id))
    pres = pres_res.scalars().first()
    if not pres:
        raise HTTPException(status_code=404, detail="Prescription not found")

    pdf_filename = f"prescription_{pres.id}.pdf"
    pdf_filepath = os.path.join(settings.UPLOAD_DIR, pdf_filename)
    if os.path.exists(pdf_filepath):
        try:
            os.remove(pdf_filepath)
        except Exception as e:
            logger.warning(f"Failed to remove PDF file {pdf_filepath}: {e}")

    await db.delete(pres)
    await db.commit()
    return {"message": "Prescription deleted successfully", "id": str(id)}


# ─────────────────────────────────────────────────────────────────────────────
# Client: view own finalized prescriptions
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=List[PrescriptionOut])
async def get_my_prescriptions(
    current_user: User = Depends(is_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Get client's prescription history (FINALIZED only).
    """
    client_res = await db.execute(select(ClientProfile).where(ClientProfile.user_id == current_user.id))
    client_profile = client_res.scalars().first()
    if not client_profile:
        return []

    result = await db.execute(
        select(Prescription)
        .where(
            (Prescription.client_id == client_profile.id) &
            (Prescription.status == "FINALIZED")
        )
        .order_by(Prescription.issued_at.desc())
    )
    return result.scalars().all()


# ─────────────────────────────────────────────────────────────────────────────
# Secure PDF download
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{id}/download")
async def download_prescription_pdf(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Secure PDF download endpoint.
    Verifies the requester is the patient or the doctor/admin.
    """
    pres_res = await db.execute(select(Prescription).where(Prescription.id == id))
    pres = pres_res.scalars().first()
    if not pres:
        raise HTTPException(status_code=404, detail="Prescription not found")

    authorized = False
    if current_user.role in ("DOCTOR", "ADMIN"):
        authorized = True
    elif current_user.role == "CLIENT":
        client_res = await db.execute(select(ClientProfile).where(ClientProfile.user_id == current_user.id))
        client = client_res.scalars().first()
        if client and pres.client_id == client.id:
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to download this prescription."
        )

    pdf_filename = f"prescription_{pres.id}.pdf"
    pdf_filepath = os.path.join(settings.UPLOAD_DIR, pdf_filename)

    if not os.path.exists(pdf_filepath):
        raise HTTPException(
            status_code=404,
            detail="Prescription PDF file not found on disk. It may not have been generated yet."
        )

    return FileResponse(
        path=pdf_filepath,
        filename=pdf_filename,
        media_type="application/pdf"
    )
