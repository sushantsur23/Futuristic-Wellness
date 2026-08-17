# Futuristic Wellness

A modern web application built with FastAPI (Python) on the backend and React + TypeScript + Vite on the frontend.

## 🚀 Features

- **FastAPI Backend**: Async REST API with SQLAlchemy 2, Alembic migrations, JWT authentication, and Pydantic validation.
- **PDF Generation**: Prescription and report PDF generation via Jinja2 & WeasyPrint / xhtml2pdf.
- **React Frontend**: Powered by React 19, TypeScript, Vite, React Query, React Hook Form, Zod, and Lucide icons.
- **Single-Image Container**: Unified Nginx + Uvicorn architecture running via Supervisor for simple 1-command deployment.
- **Async Scheduler**: Background task scheduling using APScheduler.

---

## 🛠️ Project Structure

```text
Futuristic Wellness/
├── backend/            # FastAPI Application & Alembic Migrations
│   ├── app/            # API Routes, Models, Schemas, & Services
│   ├── alembic/        # Database Migration Scripts
│   ├── tests/          # Pytest Suite
│   └── requirements.txt
├── frontend/           # React + TypeScript + Vite Application
│   ├── src/            # Components, Views, and Hooks
│   └── package.json
├── nginx.conf          # Nginx reverse proxy and SPA router config
├── supervisord.conf    # Supervisor process manager config
├── Dockerfile          # Multi-stage production Docker build
├── docker-compose.yml  # Docker Compose orchestration
└── README.md
```

---

## 🔑 Test Credentials

Use these pre-configured accounts to test the application:

### 🩺 1. Doctor (Admin) Portal
- **Email / Identifier**: `doctor@futuristicwellness.example`
- **Password**: `DoctorPass123!`
- **Role**: `DOCTOR` (Dr. Swandha Majumdar)
- **Features**: Doctor Dashboard, Patient Prescriptions Generator (PDFs), Schedule & Availability Rules, Appointment Consultations, and Reviews overview.

### 👤 2. Patient (Client) Portal
- **Email / Identifier**: `patient123@example.com`
- **Password**: `ClientPass123!`
- **Role**: `CLIENT` (Test Patient)
- **Features**: Book Consultations, View Real-Time Slot Availability, Access Prescriptions & Therapy Plans, and Leave Reviews.

> 💡 **Tip:** You can also register a brand new patient account directly by clicking **"Sign Up"** / **"Register"** on the home page.

---

## 🐳 Quick Start with Docker (Recommended)

You can download and run the pre-built, production-ready container without needing Python or Node.js installed locally.

### 1. Download (Pull) Image from Docker Hub
```bash
docker pull p838683132/futuristic-wellness:latest
```

### 2. Run the Container Locally
```bash
docker run -d -p 8000:80 --name futuristic_wellness p838683132/futuristic-wellness:latest
```

*(Alternatively, if you cloned this repo, run: `docker compose up -d`)*

### 3. Open in Browser
- 🌐 **Web App (Frontend + Login + All Portals)**: [http://localhost:8000](http://localhost:8000)
- ⚙️ **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🩺 **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🛠️ Building & Pushing the Docker Image

### Build Locally
```bash
docker build -t p838683132/futuristic-wellness:latest .
```

### Push to Docker Hub
```bash
docker login
docker push p838683132/futuristic-wellness:latest
```

---

## 🚦 Local Development Setup (Without Docker)

### Prerequisites

- **Python**: `^3.10`
- **Node.js**: `^18.0` or `^20.0`
- **Git**

---

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and set your credentials:
   ```bash
   cp .env.example .env
   ```
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start backend development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

### Frontend Setup

1. Open a second terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start frontend development server:
   ```bash
   npm run dev
   ```
4. Access the frontend app at [http://localhost:5173](http://localhost:5173).

---

## 📄 License

This project is released under the MIT License.
