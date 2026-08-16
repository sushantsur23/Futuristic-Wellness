# Futuristic Wellness

A modern web application built with FastAPI (Python) on the backend and React + TypeScript + Vite on the frontend.

## 🚀 Features

- **FastAPI Backend**: Async REST API with SQLAlchemy 2, Alembic migrations, JWT authentication, and Pydantic validation.
- **PDF Generation**: Prescription and report PDF generation via Jinja2 & WeasyPrint / xhtml2pdf.
- **React Frontend**: Powered by React 19, TypeScript, Vite, React Query, React Hook Form, Zod, and Lucide icons.
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
└── README.md
```

---

## 🚦 Getting Started

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
5. Run migrations & start server:
   ```bash
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

---

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

---

## 📄 License

This project is released under the MIT License.
