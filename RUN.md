# Running Hesabat Pro

## Frontend

Open a terminal in the project root and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend.

Useful frontend commands:

```bash
npm run build
npm run preview
```

## Backend

The backend requires Python and PostgreSQL. Docker can be used to start PostgreSQL:

```bash
cd backend
docker compose up -d
```

Create the Python environment and install the dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Run the database migrations and start FastAPI:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000`.

- Swagger docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
