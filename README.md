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

---

## 🚦 Getting Started

### Initial Setup (First Time Only)

#### 1. Backend Setup
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
4. Copy the environment template to `.env` and adjust settings if needed:
   ```bash
   cp .env.example .env
   ```
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

#### 2. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```

---

## 🏃 Running Locally

Once your environment is set up, run both servers in separate terminal windows:

### Terminal 1: Backend Server
```bash
cd backend
# Activate virtual environment (if not already active)
.\venv\Scripts\Activate.ps1   # PowerShell
# source venv/bin/activate    # Linux/macOS

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Interactive API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Frontend Server
```bash
cd frontend

# Start Vite development server
npm run dev
```
- **Frontend App**: [http://localhost:5173](http://localhost:5173)

---

## 🐙 Pushing to GitHub

If you haven't connected your local repository to GitHub yet:

1. Create a repository on [GitHub](https://github.com/new) (e.g., `futuristic-wellness`).
2. Run the following commands in your project root:
   ```bash
   git remote add origin https://github.com/sushantsur23/YOUR_REPOSITORY_NAME.git
   git push -u origin main
   ```

---

## 🐳 Docker Setup & Deployment

The application features a **multi-stage minimal Docker build** (`Dockerfile`) that compiles the React frontend, packages Python dependencies in a slim environment, and serves both via Uvicorn in a lightweight production container.

### 1. Build Docker Image Locally
```bash
docker build -t sushantsur23/futuristic-wellness:latest .
```

### 2. Run Container Locally
Using Docker run:
```bash
docker run -d -p 8000:8000 --name futuristic_wellness sushantsur23/futuristic-wellness:latest
```

Using Docker Compose:
```bash
docker compose up -d
```
Access the application at [http://localhost:8000](http://localhost:8000).

### 3. Push Image to Docker Repository (Docker Hub)
```bash
# Login to Docker Hub
docker login

# Push image to your Docker Hub repository
docker push sushantsur23/futuristic-wellness:latest
```

### 4. Pull and Run from Docker Repository on any machine
```bash
docker pull sushantsur23/futuristic-wellness:latest
docker run -d -p 8000:8000 sushantsur23/futuristic-wellness:latest
```

---

## 📄 License

This project is released under the MIT License.
