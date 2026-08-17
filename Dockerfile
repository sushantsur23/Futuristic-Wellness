# =========================================================
# Stage 1: Build Frontend (React + TypeScript + Vite)
# =========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependency manifests and install packages
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source code and build production bundle
COPY frontend/ ./
RUN npm run build

# =========================================================
# Stage 2: Build Python Virtual Environment
# =========================================================
FROM python:3.11-slim AS backend-builder
WORKDIR /app

# Install build toolchain for C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install python dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# =========================================================
# Stage 3: Minimal Production Runtime Image
# =========================================================
FROM python:3.11-slim AS runtime
WORKDIR /app

# Install runtime system libraries required by WeasyPrint for PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libharfbuzz0b \
    pango1.0-tools \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Copy python virtual environment from backend-builder
COPY --from=backend-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Copy built frontend assets from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend code and static assets
COPY backend /app/backend
COPY static /app/static
COPY .env.example /app/.env.example

# Set default production environment variables
ENV PORT=8000
ENV DATABASE_URL="sqlite+aiosqlite:////app/backend/wellness.db"

# Expose FastAPI application port
EXPOSE 8000

# Start Uvicorn application server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
