# Futuristic Wellness App (Build spec)


name: futuristic-wellness-platform-builder
description: Full-stack implementation playbook for building "Futuristic Wellness" (Phase 1 MVP) — a React (frontend) + Python/FastAPI (backend) web application connecting patients with a single doctor for appointment booking, physiotherapy/yoga sessions, and conference sessions, plus digital prescription management. Use this skill any time the user asks to scaffold, build, extend, debug, or review code for this platform, its database schema, its API, its email notifications, its branded/positive UI, or any of its core features (client booking with dual notifications, prescription history/download from a fixed sample template, 1-hour cancellation rule, 6-month doctor availability per category, physio/yoga/conference session types, template-based prescription generation, phone+email based auth). Also trigger on generic requests like "build the booking backend," "add the prescription PDF endpoint," "create the availability calendar UI," "style the dashboard," or "set up the database models" if the surrounding project matches this platform.
---

# Futuristic Wellness — Build Skill

Acts as a full-stack developer's playbook for this project. Read this whole file before writing code for any feature below — the data model and cross-feature rules (dual notifications, slot locking, cancellation cutoff, 6-month availability, single-doctor constraint) are shared across features and must stay consistent.

## 0. Brand

- **App name**: **Futuristic Wellness**. Use it consistently — page titles, email subject lines, PDF headers/footers, navbar logo text, `README`, `package.json` `name` field (`futuristic-wellness`), API title in FastAPI (`title="Futuristic Wellness API"`).
- Suggested tagline for landing/auth pages: "Care that fits your life." (placeholder — swap freely, just keep tone calm/positive, not clinical/cold).

## 1. Product Summary

Phase 1 MVP, two roles, **exactly one doctor account** in this phase:

- **Client (patient)**: registers with email + phone, books an Appointment / Session / Conference, gets an email confirmation (doctor also notified), views/downloads past prescriptions as PDF rendered from a fixed sample template, cancels only if ≥ 1 hour remains before start (doctor also notified on cancellation).
- **Admin/Doctor** (single account, seeded — not self-registerable in this phase): sets availability per category (Appointment / Session / Conference) up to **6 months** from today, creates session types (Physiotherapy, Yoga, Conference — group-capable — plus standard Appointment/Consultation), and generates prescriptions from the fixed sample template, savable as a personal reusable template.

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) + TypeScript | React Router, React Query (TanStack Query) for server state, React Hook Form + Zod for forms/validation |
| Backend | Python, **FastAPI** | Async, automatic OpenAPI docs, pydantic v2 for schemas |
| ORM / DB | SQLAlchemy 2.0 (async) + Alembic migrations | PostgreSQL (use `TIMESTAMPTZ` everywhere — never naive datetimes) |
| Auth | JWT (access + refresh) via `fastapi-users` or hand-rolled with `python-jose` + `passlib[bcrypt]` | Roles: `CLIENT`, `DOCTOR`. Login and password reset both work by **email or phone** (see §5) |
| Background jobs | APScheduler (in-process) for MVP; Celery + Redis if scale requires it | Used for: slot pre-generation, reminder emails, hold-expiry cleanup |
| Email | `fastapi-mail` or direct SMTP via a transactional provider (SendGrid/SES/Postmark) | Every booking, cancellation, and onboarding event sends to **both** parties — never send only one side (see §7.2/§7.3/§7.7) |
| PDF generation | WeasyPrint (HTML/Jinja2 → PDF) | Template is derived from the user-supplied sample — see §7.6, do **not** invent a different layout |
| File storage | S3-compatible bucket (or local disk volume for local dev) | Store prescription PDFs, doctor signature image, the source sample prescription asset |
| Testing | Pytest + httpx (backend), Vitest + React Testing Library (frontend) | |

## 3. Repository Layout

```
repo/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          # config, security, deps
│   │   ├── db/             # session, base, alembic env, seed_doctor.py (see §5.1)
│   │   ├── models/         # SQLAlchemy models (one file per entity, see §4)
│   │   ├── schemas/        # pydantic request/response models
│   │   ├── api/v1/         # routers, one file per resource (see §6)
│   │   ├── services/       # business logic: availability generator, booking, cancellation, prescription pdf, notifications
│   │   ├── jobs/           # APScheduler jobs (slot generation, reminders)
│   │   └── templates/      # Jinja2 HTML prescription template, reverse-engineered from the sample (see §7.6)
│   ├── alembic/
│   ├── tests/
│   └── pyproject.toml
└── frontend/
    ├── src/
    │   ├── pages/           # Landing, Auth, Home (3-option dashboard), BookAppointment, BookSession, BookConference,
    │   │                     # MyAppointments, MyPrescriptions, DoctorAvailability, DoctorSessions, PrescriptionEditor
    │   ├── components/
    │   ├── theme/            # design tokens — see §8
    │   ├── api/              # typed API client (generated or hand-written from OpenAPI)
    │   ├── hooks/
    │   └── routes.tsx
    └── package.json
```

## 4. Database Schema

Design once, reuse everywhere. Use UUID as the DB primary key on every table (for stable FK integrity), but see §5 for how `email`/`phone` are used as the real-world identifying keys on top of that.

### 4.1 `users` (shared base for auth)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | internal key, used for all FKs |
| email | citext, **unique, not null** | login identifier #1, password-reset channel #1 |
| phone | text, **unique, not null** | login identifier #2, password-reset channel #2 (E.164 format, validate + normalize on input) |
| hashed_password | text | |
| role | enum(`CLIENT`,`DOCTOR`) | |
| full_name | text | |
| is_active | bool default true | |

> Both `email` and `phone` have a `UNIQUE NOT NULL` constraint and are indexed — treat them as **alternate keys**: registration must reject a duplicate on either field individually, login accepts either as the identifier, and password reset can be initiated from either (email link or SMS OTP — pick one channel per attempt, but both must be wired up since either can be the identifier the user remembers).

### 4.2 `doctor_profiles` (1:1 with `users` where role=DOCTOR)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | FK → users.id, unique | |
| specialization | text | |
| registration_number | text | shown on prescriptions |
| signature_url | text, nullable | image asset for prescription PDF |
| bio | text, nullable | |

**Single-doctor constraint (Phase 1):** enforce at three layers, not just one — (a) there is no public "register as doctor" endpoint; the only doctor account is created by a seed script (§5.1); (b) add a service-layer guard that raises if a second `doctor_profiles` row would be created; (c) add a DB-level partial safeguard if your migration tooling supports it (e.g., a check via a trigger, or simply document that this is enforced in application code and revisit if/when multi-doctor support is added).

### 4.3 `client_profiles` (1:1 with `users` where role=CLIENT)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | FK → users.id, unique | |
| date_of_birth | date, nullable | |
| gender | text, nullable | |
| address | text, nullable | |
| medical_history_summary | text, nullable | free text, editable by client |

### 4.4 `session_types`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| doctor_id | FK → doctor_profiles.id | |
| name | text | e.g. "Evening Physiotherapy" |
| category | enum(`APPOINTMENT`,`SESSION_PHYSIOTHERAPY`,`SESSION_YOGA`,`CONFERENCE`) | drives which of the 3 client-facing entry points it appears under (Appointment / Session / Conference — see §7.5) and default capacity |
| duration_minutes | int | |
| capacity | int default 1 | 1 = one-on-one (Appointment/Physiotherapy); >1 = group (Yoga/Conference), doctor-editable |
| description | text, nullable | |
| is_active | bool default true | deactivating hides from new bookings, keeps history |

### 4.5 `availability_rules` (recurring weekly pattern, source of truth for generation)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| doctor_id | FK → doctor_profiles.id | |
| day_of_week | int (0=Mon..6=Sun) | |
| start_time | time | |
| end_time | time | |
| session_type_id | FK → session_types.id | **required** — availability is always set per category/session type, so the doctor can offer different days/times for Appointments vs. Sessions vs. Conferences (§7.5) |
| valid_from | date | defaults to today |
| valid_to | date | **must be ≤ valid_from + 6 months**; enforce in service layer |

### 4.6 `availability_exceptions` (single-date overrides: block a day, add an extra day, change hours)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| doctor_id | FK → doctor_profiles.id | |
| session_type_id | FK → session_types.id, nullable | null = applies across all categories that date (e.g. doctor is off entirely) |
| date | date | |
| is_blocked | bool | true = doctor unavailable entire day (for this category, or all if session_type_id is null) |
| start_time / end_time | time, nullable | used when overriding hours instead of full block |

### 4.7 `slots` (materialized bookable units — generated from rules + exceptions, see §7.1)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| doctor_id | FK | |
| session_type_id | FK | |
| start_at | TIMESTAMPTZ | |
| end_at | TIMESTAMPTZ | |
| capacity | int | copied from session_type at generation time |
| booked_count | int default 0 | incremented on booking, decremented on cancellation |
| status | enum(`OPEN`,`FULL`,`BLOCKED`) | derived/cached for fast querying |

Unique constraint: `(doctor_id, start_at, session_type_id)`.

### 4.8 `appointments`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| slot_id | FK → slots.id | |
| client_id | FK → client_profiles.id | |
| status | enum(`BOOKED`,`CANCELLED`,`COMPLETED`,`NO_SHOW`) | |
| notes_from_client | text, nullable | symptoms etc. |
| cancellation_reason | text, nullable | |
| booked_at | TIMESTAMPTZ | |
| cancelled_at | TIMESTAMPTZ, nullable | |

### 4.9 `prescription_templates`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| doctor_id | FK → doctor_profiles.id | |
| name | text | e.g. "Standard Cold & Flu" |
| content | JSONB | structured shape must mirror the fields found in the user-supplied sample, see §7.6 |
| is_favorite | bool default false | |

### 4.10 `prescriptions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| appointment_id | FK → appointments.id, nullable | nullable to allow ad-hoc issuance |
| client_id | FK | |
| doctor_id | FK | |
| template_id | FK → prescription_templates.id, nullable | template this was generated from, if any |
| diagnosis | text | |
| content | JSONB | finalized structured content — same shape as the sample template, see §7.6 |
| version | int default 1 | amendments create a new row with version+1, never overwrite |
| pdf_url | text, nullable | set once finalized |
| status | enum(`DRAFT`,`FINALIZED`) | only FINALIZED is visible to the client |
| issued_at | TIMESTAMPTZ, nullable | |

### 4.11 `notifications` (audit log of what was sent)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | FK → users.id | who received it (client and doctor each get their own row per event — see §7.7) |
| type | enum(`WELCOME`,`BOOKING_CONFIRMATION`,`CANCELLATION`,`REMINDER_24H`,`REMINDER_1H`,`PRESCRIPTION_ISSUED`) | |
| channel | enum(`EMAIL`,`PUSH`,`SMS`) | MVP: EMAIL only |
| payload | JSONB | |
| status | enum(`QUEUED`,`SENT`,`FAILED`) | |
| sent_at | TIMESTAMPTZ, nullable | |

## 5. Auth, Identity & Password Reset

- **Identifiers**: a user can log in with *either* `email` or `phone` + password. The login request body should accept a single `identifier` field; the backend looks it up against both columns.
- **Registration**: `POST /auth/register` is CLIENT-only in this phase (see §5.1 for the doctor). Reject if either `email` or `phone` already exists — return field-specific errors so the frontend can highlight which one collided.
- **Password reset**:
  - `POST /auth/password-reset/request` accepts an `identifier` (email or phone). If it matches an email, send a reset link by email; if it matches a phone, send an OTP by SMS (stub this as a logged/console OTP in local dev if no SMS provider is configured yet — build the interface so swapping in a real provider later is a one-line change).
  - `POST /auth/password-reset/confirm` accepts the token/OTP + new password.
- On successful register, immediately fire the onboarding email described in §7.7.

### 5.1 Seeding the single doctor account
- Add `backend/app/db/seed_doctor.py`, run once via a management command / on first migration.
- Use a clearly-marked placeholder identity, e.g.:
  - email: `doctor@futuristicwellness.example`
  - phone: `+10000000000`
  - name: `Dr. Jane Doe`
  - a random generated password, printed once to the console/logs at seed time (never hardcode a real password in source).
- Comment in the seed script: `# PLACEHOLDER — replace with the real doctor's credentials before production launch.`

## 6. API Surface (v1)

```
POST   /auth/register                      # CLIENT only
POST   /auth/login                         # body: { identifier, password } — identifier = email or phone
POST   /auth/refresh
POST   /auth/password-reset/request        # body: { identifier }
POST   /auth/password-reset/confirm        # body: { token, new_password }

GET    /doctor                              # single-doctor profile (no {id} needed — there is exactly one)
GET    /doctor/session-types?category=      # filter by APPOINTMENT | SESSION_PHYSIOTHERAPY | SESSION_YOGA | CONFERENCE
GET    /doctor/slots?session_type_id=&from=&to=   # open slots only

POST   /doctor/session-types                # DOCTOR
PATCH  /doctor/session-types/{id}           # DOCTOR
POST   /doctor/availability-rules           # DOCTOR — validated against 6-month window, always scoped to a session_type_id
POST   /doctor/availability-exceptions      # DOCTOR
GET    /doctor/availability?category=       # DOCTOR — calendar view per category: open/booked/blocked

POST   /appointments                        # CLIENT — books a slot (see §7.2)
GET    /appointments/me                     # CLIENT — upcoming + past
DELETE /appointments/{id}                   # CLIENT — cancel (server enforces 1-hour rule, see §7.3)

POST   /prescription-templates              # DOCTOR
GET    /prescription-templates?mine=true    # DOCTOR
POST   /prescriptions                       # DOCTOR — generate (optionally from template_id)
PATCH  /prescriptions/{id}/finalize          # DOCTOR — locks, renders PDF, notifies client
GET    /prescriptions/me                    # CLIENT — history
GET    /prescriptions/{id}/download         # CLIENT & issuing DOCTOR — signed PDF URL
```

## 7. Feature Implementation Notes

### 7.1 Doctor Availability — 6 months from current date, per category
- Doctor submits a **weekly recurring pattern** per `availability_rules`, always tied to one `session_type_id` — so the doctor can run a completely different weekly schedule for Appointments vs. Physiotherapy/Yoga Sessions vs. Conferences. Service layer sets `valid_to = min(submitted_valid_to, today + 6 months)` — never allow generation past that window.
- A background job (`jobs/generate_slots.py`, run nightly + on-demand when rules change) materializes `slots` rows from `availability_rules` minus `availability_exceptions`, split into `duration_minutes` chunks per session type.
- Re-running generation must be **idempotent**: upsert on `(doctor_id, start_at, session_type_id)`, and never touch a slot that already has `booked_count > 0`.
- Editing a rule only affects future, unbooked slots; booked slots are untouched (surface a warning in the UI if an edit would conflict with existing bookings).
- UI: doctor dashboard has **3 tabs — Appointment / Session / Conference** — matching the client's 3 entry points (§7.5); each tab has its own calendar (month grid or week list, color-coded Open / Booked / Blocked) and its own weekly-pattern editor + per-date exception picker.

### 7.2 Booking + Dual Email Notification
- Booking is a DB transaction: `SELECT ... FOR UPDATE` the slot row, check `booked_count < capacity`, insert the `appointments` row, increment `booked_count`, update `status` to `FULL` if capacity reached — all atomic to prevent double-booking/overbooking on concurrent requests.
- After commit, enqueue **two** email jobs, one per party — never just one:
  - to the **client**: doctor name, category (Appointment/Session/Conference), date/time, cancellation link/reminder of the 1-hour cutoff.
  - to the **doctor**: client name, category, date/time, client's notes if provided.
- Also schedule two reminder jobs (24h-before, 1h-before) tied to the appointment; cancel these jobs if the appointment is cancelled.

### 7.3 Cancellation — 1 hour advance rule, dual notification
- Client-side: disable the Cancel button when `slot.start_at - now() < 60 minutes` (for UX only).
- **Server-side is authoritative**: `DELETE /appointments/{id}` recomputes `slot.start_at - now()` at request time; reject with `409` and a clear message if < 60 minutes remain. Never trust a client-sent flag.
- On success: set `appointments.status = CANCELLED`, `cancelled_at = now()`, decrement `slots.booked_count`, flip `slots.status` back to `OPEN` if it was `FULL`, cancel pending reminder jobs, and send a cancellation email to **both the client and the doctor** (same dual-send pattern as §7.2 — one `notifications` row per recipient).

### 7.4 Session Types — Physiotherapy / Yoga / Conference
- `category` drives sensible defaults in the UI (Yoga/Conference default `capacity` to a doctor-editable number > 1; Appointment/Physiotherapy default to 1) but the doctor can override capacity per session.
- Group sessions (`capacity > 1`) show remaining spots to clients (`capacity - booked_count`) instead of a strict open/closed toggle.
- Deactivating a session type (`is_active = false`) hides it from new bookings but must not cascade-delete historical `slots`/`appointments`.

### 7.5 Client Home — 3-Option Dashboard
Immediately after login, the client's home page shows **three large, clearly-labelled option cards** (not a dense menu):
1. **Book Appointment** — standard 1:1 consultation with the doctor (`category = APPOINTMENT`).
2. **Book a Session** — physiotherapy or yoga (`category = SESSION_PHYSIOTHERAPY` / `SESSION_YOGA`); selecting this shows a secondary choice between the two before landing on the slot picker.
3. **Schedule a Conference** — group conference session with the doctor (`category = CONFERENCE`).

Each card routes to a slot picker filtered to that category's open slots (`GET /doctor/slots?session_type_id=...`). Since there's only one doctor in this phase, skip any "choose a doctor" step entirely — go straight from category choice to slot picker.

### 7.6 Prescription Generation From a Fixed Sample Template
The user will supply a sample prescription (`prescription.md` or `prescription.jpg`) that defines the **exact** target layout and field set. Treat that sample as the spec, not just inspiration:
1. **Ingest the sample** first: if it's Markdown, read its structure directly; if it's an image, inspect it visually (headings, letterhead placement, field labels, medicine table columns, signature/stamp position, any footer disclaimer text) before writing any template code.
2. **Derive the `content` JSON shape** (used by both `prescription_templates.content` and `prescriptions.content`) so it captures every field present in the sample — don't default to a generic shape if the sample has different or additional fields (e.g., it might include patient age/weight, allergy notes, follow-up date, clinic address block, or a different medicines-table column order). A reasonable starting point to adapt once the sample is available:
   ```json
   {
     "vitals": {"bp": "", "pulse": "", "temp": "", "weight": ""},
     "diagnosis": "",
     "medicines": [
       {"name": "", "dosage": "", "frequency": "", "duration": "", "instructions": ""}
     ],
     "general_instructions": "",
     "follow_up": ""
   }
   ```
3. **Build the Jinja2 HTML + CSS template** (`backend/app/templates/prescription.html`) to visually match the sample as closely as practical — same section order, same header/letterhead style, same table layout — then render through WeasyPrint. Keep the app's brand colors (§8) confined to accents (e.g. a header rule or footer line); the clinical body of the prescription should stay clean/high-contrast and printable, not "styled" like a marketing page.
4. If the sample is later replaced/updated, the template and the `content` schema should be revisited together — treat them as versioned in lockstep, not independent.
- Doctor flow: pick a base template or a previously saved favorite → prefilled form matching the derived shape → edit → **Save as Draft** (status `DRAFT`, editable) or **Finalize**.
- Finalize is a one-way transition: render `content` + doctor signature + clinic header through the template with WeasyPrint → upload PDF → set `pdf_url`, `status = FINALIZED`, `issued_at = now()` → send `PRESCRIPTION_ISSUED` email to the client.
- Amending a finalized prescription **never overwrites**: create a new `prescriptions` row with `version = previous.version + 1`, same `appointment_id`; keep the old row for audit history.
- "Save as personal template" simply copies the current `content` into a new `prescription_templates` row scoped to `doctor_id`.

### 7.7 Onboarding, Booking, and Cancellation Notifications — Always Dual-Send
This is a cross-cutting rule, not a per-feature detail — implement it once in `services/notifications.py` and call it everywhere:
- **Onboarding**: when a client registers, send a `WELCOME` email to the client *and* a "new client registered" `WELCOME`-type notification email to the doctor. (The doctor's own seeded account doesn't trigger this — only client registrations do.)
- **Booking**: `BOOKING_CONFIRMATION` to client + doctor (§7.2).
- **Cancellation**: `CANCELLATION` to client + doctor (§7.3).
- **Prescription issued**: stays single-recipient (client only) — the doctor is the actor here, not a second recipient.
- Implement as a small helper, e.g. `notify(event_type, *, client_user, doctor_user, context)` that always writes one `notifications` row per recipient and enqueues one email per recipient, so it's structurally impossible to forget the doctor's copy for booking/cancellation/onboarding.

### 7.8 Client Prescription History & Download
- `GET /prescriptions/me` returns only `status = FINALIZED` prescriptions, newest first, with doctor name + issued_at + diagnosis summary for the list view.
- `GET /prescriptions/{id}/download` verifies `current_user.client_profile.id == prescription.client_id` (or the issuing doctor) before returning a signed/short-lived URL to the stored PDF — never serve other users' files.

## 8. Design & UI Guidelines — Make Every Page Look Attractive and Positive

This app is about wellness, not paperwork — the UI should feel calm, warm, and encouraging on every screen, including empty states, forms, and error messages.

- **Consult the `frontend-design` skill** before building any React page or component — follow its guidance on typography, spacing, and avoiding templated-looking defaults; don't rely on unstyled default browser/Tailwind components.
- **Color & tone**: use a soft, wellness-appropriate palette (e.g. calming teals/greens or soft blues paired with a warm accent) rather than sterile clinical white/grey/red. Keep strong contrast for accessibility (WCAG AA), but express it through the accent and text colors, not harsh saturation.
- **Typography**: pair a friendly, rounded or humanist sans-serif for headings with a highly legible body font; generous line-height and whitespace so pages feel uncluttered.
- **Tone of copy**: microcopy should be warm and reassuring — e.g. an empty "My Appointments" state says something like "No appointments yet — book your first session whenever you're ready," not "No records found." Error states should stay calm and solution-oriented ("That slot just got booked — here are other times") rather than alarming.
- **The 3-option home cards** (§7.5) are the single most important screen to get right first: large tappable cards, a short friendly description under each, a relevant icon/illustration per category (Appointment / Session / Conference), and a light hover/press animation.
- **Doctor dashboard** can be slightly more information-dense (it's a working tool) but should still use the same color system, iconography, and rounded card language as the client side — it shouldn't look like a different, plainer app bolted on.
- **Prescription PDF is the one exception**: keep it clean/print-appropriate per §7.6, not "styled" like the marketing pages — a small brand header/footer is enough.
- Add a lightweight `theme/tokens.ts` (or Tailwind config extension) early — colors, radii, shadows, spacing scale — so every page pulls from the same design tokens instead of one-off styling per component.

## 9. Build Order (suggested milestones)

1. **Scaffold + brand**: repo layout, FastAPI app boots (titled "Futuristic Wellness API"), Postgres + Alembic wired, React app boots with base theme tokens (§8), CI runs lint+tests.
2. **Auth**: client register/login by email-or-phone (§5), password reset via either channel, JWT middleware, role guard dependency, single-doctor seed script (§5.1).
3. **Onboarding notifications**: wire the dual-send `notify()` helper (§7.7) and the `WELCOME` email first, since booking/cancellation reuse the same helper.
4. **Doctor setup**: `session_types` (with the 4 categories) + `availability_rules`/`exceptions` CRUD scoped per category, slot-generation job, 3-tab doctor availability calendar UI.
5. **Client home + booking**: 3-option dashboard (§7.5), category-filtered slot picker, booking transaction (§7.2) with dual email, "My Appointments" UI.
6. **Cancellation**: server-enforced 1-hour rule (§7.3) with dual email, UI state for the disabled window.
7. **Prescription template intake**: ingest the user-supplied `prescription.md`/`.jpg` sample, derive the `content` schema and Jinja2/WeasyPrint template (§7.6) — do this before building the prescription editor UI so the form fields match the real shape.
8. **Prescriptions**: templates CRUD, generation/finalize flow, PDF rendering against the derived template, client history + download.
9. **Reminders**: 24h/1h reminder jobs.
10. **Design pass**: apply §8 across every page, including empty/error states — don't leave this for "later," treat it as part of each page's definition of done.
11. **Hardening**: concurrency test for double-booking, auth boundary tests (a client can't hit doctor-only routes; a client can't download another client's prescription; only one doctor account can ever exist), load-test slot listing endpoint.

## 10. Acceptance Checklist (map back to requirements)

- [ ] Registering a new client sends a welcome email to the client **and** a notification email to the doctor.
- [ ] Client books an appointment/session/conference → confirmation email is received by **both** the client and the doctor.
- [ ] Client (or the system, on the client's behalf) cancels a booking → cancellation email is received by **both** parties.
- [ ] Two clients cannot book the same 1-capacity slot concurrently (verify with a concurrency test).
- [ ] Client sees "Cancel" disabled inside the 1-hour window even if they refresh; server also rejects a forced request in that window with `409`.
- [ ] Doctor can define availability, independently, for Appointment / Session / Conference, generating bookable slots up to but not beyond `today + 6 months` in each.
- [ ] Doctor can create Physiotherapy (capacity 1), Yoga (capacity N), and Conference (capacity N) session types independently of standard Appointments.
- [ ] A user can log in and reset their password using either their email or their phone number.
- [ ] Attempting to register a second doctor account is rejected.
- [ ] After login, the client sees exactly 3 clearly-labelled options (Book Appointment / Book a Session / Schedule a Conference), each on its own attractive, welcoming card.
- [ ] The generated prescription PDF matches the structure/fields of the supplied `prescription.md`/`.jpg` sample, not a generic placeholder layout.
- [ ] Doctor can save a finalized prescription's content as a new personal template for future reuse.
- [ ] Every page — including empty states and error messages — follows the calm/positive design language in §8, not default unstyled components.
