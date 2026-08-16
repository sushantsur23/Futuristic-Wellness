# Futuristic Wellness MVP Implementation Plan

This plan outlines the design, architecture, and step-by-step implementation for the **Futuristic Wellness** application. The platform connects patients (Clients) with a single Doctor for booking appointments/sessions/conferences, managing prescriptions using a customized layout, and automated dual-party email notifications.

## User Review Required

> [!IMPORTANT]
> - **WeasyPrint Dependency**: WeasyPrint requires external system libraries (GTK+ on Windows). We will provide a local setup guide for GTK+ in the backend documentation, and implement a mock/console fallback in the Python backend if WeasyPrint fails to load or render, to ensure development is smooth.
> - **Database Connection**: We will configure PostgreSQL as the database. Please ensure you have a running PostgreSQL database or Docker instance, or we can set up a local PostgreSQL instance via Docker Compose if preferred. We will default to a database named `futuristic_wellness`.
> - **Email Notifications**: We will configure SMTP for sending emails. For local development, we will write emails to the backend terminal console or local files if no SMTP credentials are provided in the `.env` file.

## Open Questions

- *Do you want us to set up a `docker-compose.yml` to spin up PostgreSQL and/or local mailhog/mailcatcher containers for easy local database/email testing?*

---

## Proposed Changes

We will build the application in stages as described below:

### 1. Database Schema & Models
We will create SQLAlchemy models for PostgreSQL in `backend/app/models/`. All datetime fields will use `TIMESTAMPTZ` (aware datetimes).

- **`users`**: Base auth table containing `email`, `phone`, `hashed_password`, `role` (CLIENT, DOCTOR), `full_name`, and `is_active`.
- **`doctor_profiles`**: 1:1 with `users`. Contains `specialization`, `registration_number` (`REG NO. 2010/05/PT/000486`), `signature_url`, `bio`.
- **`client_profiles`**: 1:1 with `users`. Contains `date_of_birth`, `gender`, `address`, `medical_history_summary`.
- **`session_types`**: Stores session templates (category: `APPOINTMENT`, `SESSION_PHYSIOTHERAPY`, `SESSION_YOGA`, `CONFERENCE`), standard duration, default capacity, and description.
- **`availability_rules`**: Weekly recurring slots for the doctor, scoped to a specific `session_type_id`.
- **`availability_exceptions`**: Doctor-defined single-date block/hours overrides.
- **`slots`**: Materialized bookable slots generated from rules + exceptions.
- **`appointments`**: Bookings mapping clients to slots. Statuses: `BOOKED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`.
- **`prescription_templates`**: Reusable prescription shapes saved by the doctor.
- **`prescriptions`**: Patient prescriptions containing vitals, diagnosis, medicines (JSONB), general instructions, and PDF URLs. Statuses: `DRAFT`, `FINALIZED`.
- **`notifications`**: Log of sent communications (email/SMS).

#### [NEW] [user.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/user.py)
#### [NEW] [doctor.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/doctor.py)
#### [NEW] [client.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/client.py)
#### [NEW] [session.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/session.py)
#### [NEW] [availability.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/availability.py)
#### [NEW] [appointment.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/appointment.py)
#### [NEW] [prescription.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/prescription.py)
#### [NEW] [notification.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/models/notification.py)

---

### 2. Backend API & Services (FastAPI)
We will implement the endpoints using FastAPI in `backend/app/api/v1/` and core services.

- **Authentication Service**: Custom email or phone authentication using JWT.
- **Single Doctor Guard**: Middleware or dependency that ensures only one doctor account can be seeded and no new doctor accounts can register.
- **Doctor Seed Command**: Python script to seed the single doctor account (`doctor@futuristicwellness.example`, phone `+10000000000`) and print a random password.
- **Availability Slot Materialization**: Background task using APScheduler that generates slots up to 6 months in advance.
- **Atomic Booking Service**: Double-booking prevention via PostgreSQL `SELECT FOR UPDATE` transaction.
- **Dual-Send Notification Service**: Helper that enqueues welcome, booking, and cancellation emails to *both* client and doctor.
- **PDF Prescription Renderer**: WeasyPrint engine using a Jinja2 template structured identically to `prescription.md`.

#### [NEW] [main.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/main.py)
#### [NEW] [seed_doctor.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/db/seed_doctor.py)
#### [NEW] [notifications.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/services/notifications.py)
#### [NEW] [prescription_pdf.py](file:///d:/Documents/BLog/Futuristic%20Wellness/backend/app/services/prescription_pdf.py)

---

### 3. Frontend App (React + TS + Vite)
We will create a Vite React app in the `frontend` folder using modern design tokens (calming greens/teals and warm accents, rounded cards).

- **Branded Design System**: Setup custom theme tokens in CSS variables.
- **Client Home**: 3 large option cards (Book Appointment, Book Session, Schedule Conference).
- **Slot Picker**: Calendar selector fetching open slots for the selected category.
- **My Appointments / History**: View upcoming and past appointments, cancel bookings if ≥ 1 hour remains.
- **My Prescriptions**: Access finalized prescriptions, download PDF directly.
- **Doctor Dashboard**: 
  - Manage weekly availability rules & exceptions.
  - CRUD for session types.
  - Interactive prescription builder (select template, enter vitals, diagnosis, medicines table, save draft, or finalize).

#### [NEW] [index.css](file:///d:/Documents/BLog/Futuristic%20Wellness/frontend/src/index.css)
#### [NEW] [App.tsx](file:///d:/Documents/BLog/Futuristic%20Wellness/frontend/src/App.tsx)
#### [NEW] [routes.tsx](file:///d:/Documents/BLog/Futuristic%20Wellness/frontend/src/routes.tsx)

---

## Verification Plan

### Automated Tests
- Unit tests for booking transaction logic and concurrency checks to prevent double booking.
- Unit tests for the 1-hour cancellation rule.
- Integration tests checking that registering a client or canceling/booking triggers exactly 2 notification records.

### Manual Verification
- Launch backend with `uvicorn` and open Swagger docs (`/docs`) to test endpoints.
- Seed doctor database and verify console password output.
- Run frontend dev server, register a client, log in, navigate the 3-option home card layout.
- Book a session, check local simulated emails, then cancel and verify cancellation is locked inside the 1-hour window.
- Log in as the seeded doctor, edit availability, generate slots, write a prescription, finalize it, and download the generated PDF to confirm visual accuracy with the prescription spec.
