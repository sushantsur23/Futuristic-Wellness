# =========================================================
# Stage 1: Build Frontend (React + TypeScript + Vite)
# =========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# =========================================================
# Stage 2: Build Python Virtual Environment
# =========================================================
FROM python:3.11-slim AS backend-builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# =========================================================
# Stage 3: Single Production Image (Nginx + Uvicorn)
# =========================================================
FROM python:3.11-slim AS runtime
WORKDIR /app

# Install Nginx, Supervisor, and WeasyPrint runtime libraries in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    libpango-1.0-0 \
    libharfbuzz0b \
    pango1.0-tools \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && rm /etc/nginx/sites-enabled/default

# Copy Python virtual environment from builder
COPY --from=backend-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Copy built frontend static assets
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend source code and static uploads
COPY backend /app/backend
COPY static /app/static
COPY .env.example /app/.env.example

# Copy Nginx and Supervisor configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create required directories
RUN mkdir -p /app/static/uploads /var/log/supervisor

# Default environment variables
ENV DATABASE_URL="sqlite+aiosqlite:////app/backend/wellness.db"

# Expose single port for the entire application
EXPOSE 80

# Start both Nginx and Uvicorn via Supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
