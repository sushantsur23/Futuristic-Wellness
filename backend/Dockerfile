# =========================================================
# Stage 1: Build Python Virtual Environment
# =========================================================
FROM python:3.11-slim AS builder
WORKDIR /app

# Install C build toolchain for compiling extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install Python requirements
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# =========================================================
# Stage 2: Minimal Production Runtime Image
# =========================================================
FROM python:3.11-slim AS runtime
WORKDIR /app

# Install runtime system libraries required by WeasyPrint for PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libharfbuzz0b \
    pango1.0-tools \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Copy python virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Copy backend application source code and static upload directory
COPY . /app/backend
COPY ../static /app/static 2>/dev/null || true

# Set default production environment variables
ENV PORT=8000
ENV DATABASE_URL="sqlite+aiosqlite:////app/backend/wellness.db"

EXPOSE 8000

# Run Uvicorn server from the workspace root context
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
