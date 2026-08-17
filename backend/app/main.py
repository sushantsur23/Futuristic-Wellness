import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.doctor import router as doctor_router
from backend.app.api.v1.appointments import router as appointments_router
from backend.app.api.v1.prescriptions import router as prescriptions_router
from backend.app.api.v1.reviews import router as reviews_router
from backend.app.db.base_class import Base
from backend.app.jobs.scheduler import start_scheduler, shutdown_scheduler, run_slot_generation_job

async def init_db_migrations():
    from backend.app.db.session import engine
    from sqlalchemy import text
    try:
        async with engine.begin() as conn:
            # Create all metadata tables (including reviews) if not exist
            await conn.run_sync(Base.metadata.create_all)

            result = await conn.execute(text("PRAGMA table_info(doctor_profiles)"))
            columns = [row[1] for row in result.fetchall()]
            if "linkedin_url" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN linkedin_url VARCHAR(500)"))
            if "instagram_url" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN instagram_url VARCHAR(500)"))
            if "facebook_url" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN facebook_url VARCHAR(500)"))
            if "youtube_url" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN youtube_url VARCHAR(500)"))
            if "show_social_links" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN show_social_links BOOLEAN DEFAULT 1"))
            if "show_linkedin" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN show_linkedin BOOLEAN DEFAULT 1"))
            if "show_instagram" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN show_instagram BOOLEAN DEFAULT 1"))
            if "show_facebook" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN show_facebook BOOLEAN DEFAULT 1"))
            if "show_youtube" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN show_youtube BOOLEAN DEFAULT 1"))
            if "trustpilot_url" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN trustpilot_url VARCHAR(500)"))
            if "show_trustpilot" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN show_trustpilot BOOLEAN DEFAULT 1"))
            if "picture_url" not in columns:
                await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN picture_url VARCHAR(500)"))

            # Appointments table meeting links migration
            app_result = await conn.execute(text("PRAGMA table_info(appointments)"))
            app_columns = [row[1] for row in app_result.fetchall()]
            if "meeting_link" not in app_columns:
                await conn.execute(text("ALTER TABLE appointments ADD COLUMN meeting_link TEXT"))
            if "meeting_provider" not in app_columns:
                await conn.execute(text("ALTER TABLE appointments ADD COLUMN meeting_provider VARCHAR(50)"))
            if "mode" not in app_columns:
                await conn.execute(text("ALTER TABLE appointments ADD COLUMN mode VARCHAR(20) DEFAULT 'ONLINE'"))

            # Client Profiles table alternate phone migration
            client_result = await conn.execute(text("PRAGMA table_info(client_profiles)"))
            client_columns = [row[1] for row in client_result.fetchall()]
            if "alternate_phone" not in client_columns:
                await conn.execute(text("ALTER TABLE client_profiles ADD COLUMN alternate_phone VARCHAR(50)"))
    except Exception as e:
        print(f"[MIGRATION WARNING] {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure DB columns exist
    await init_db_migrations()
    # Start background tasks scheduler
    start_scheduler()
    # Pre-generate slots for the doctor at startup
    await run_slot_generation_job()
    yield
    # Shutdown background scheduler
    shutdown_scheduler()

app = FastAPI(
    title="Futuristic Wellness API",
    description="Care that fits your life — Phase 1 MVP API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount static files for prescription PDFs and signatures
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(doctor_router, prefix=f"{settings.API_V1_STR}/doctor", tags=["Doctor"])
app.include_router(appointments_router, prefix=f"{settings.API_V1_STR}/appointments", tags=["Appointments"])
app.include_router(prescriptions_router, prefix=f"{settings.API_V1_STR}/prescriptions", tags=["Prescriptions"])
app.include_router(reviews_router, prefix=f"{settings.API_V1_STR}/reviews", tags=["Reviews"])

from fastapi.responses import FileResponse

@app.get("/health")
async def health():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "tagline": "Care that fits your life."
    }

# Mount static frontend build if present (for single container / Docker deployment)
if os.path.exists("frontend/dist"):
    # Mount static assets first (assets, images, JS, CSS)
    if os.path.exists("frontend/dist/assets"):
        app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="frontend-assets")
    
    # Catch-all route to return index.html for React SPA client-side routes (e.g. /login, /doctor, /client)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join("frontend/dist", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("frontend/dist/index.html")
else:
    @app.get("/")
    async def root():
        return {
            "app": settings.PROJECT_NAME,
            "status": "online",
            "tagline": "Care that fits your life."
        }
