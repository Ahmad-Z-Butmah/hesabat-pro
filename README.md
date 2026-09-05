# Hesabat Pro

Hesabat Pro is a project and finance management system built for tracking projects, customers, business parties, units, payments, and cheques in one place. The interface is Arabic-first and supports right-to-left (RTL) layouts.

## What the system does

Users sign in, open the projects dashboard, and manage each project from its own workspace. Project data and financial activity stay organized by project, while the navigation makes it easy to move between the different sections.

The application currently supports several project types, including real estate, restaurants, shops, and cafes. Real-estate projects include the following sections:

- **Overview:** A quick summary of the project's status and key figures.
- **Finance:** Create and review incoming and outgoing financial transactions.
- **Buildings and Parking:** Manage units, parking spots, and their current status.
- **Customers:** Store customer information and review their activity.
- **Parties:** Manage customers, suppliers, contractors, and other related parties.
- **Cheques:** Track cheques, due dates, and payment status.
- **Reports:** View financial summaries and project reports.

## Typical workflow

1. The user signs in.
2. The projects dashboard displays existing projects and allows new ones to be created.
3. The user opens a project to access its workspace.
4. Project data and financial activity are managed through the relevant sections.
5. The frontend communicates with the backend API to create, update, delete, and retrieve data.

## Tech stack

- **Frontend:** React and Vite
- **Backend:** FastAPI and PostgreSQL
- **Database:** SQLAlchemy and Alembic
- **Authentication:** JWT

## Project structure

```text
hesabat-app/
├── backend/           FastAPI application and database layer
│   ├── app/            Application code, routers, models, and schemas
│   ├── alembic/        Database migrations
│   ├── uploads/        Locally stored uploaded files
│   ├── requirements.txt
│   └── .env.example
├── frontend/           React application
│   ├── src/            Pages, components, hooks, utilities, and styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── README.md
└── RUN.md
```

## Running the frontend

From the project root, run:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown in the terminal. It is usually:
`http://localhost:5173`

## Running the backend

The backend requires PostgreSQL. You can start the database with Docker, then follow the detailed setup instructions in [backend/README.md](backend/README.md).

The basic setup is:

```bash
cd backend
docker compose up -d
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

- API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

## Useful commands

```bash
cd frontend
npm run build      # Create a production build
npm run preview    # Preview the production build locally
```

For additional setup details, see [RUN.md](RUN.md).
