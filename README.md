# carrer-ai

Career assistant app with a React + TypeScript frontend and a Python FastAPI backend.

## Architecture

- Frontend: React/Vite (`/src`)
- Backend: FastAPI (`/backend`)
- Supabase: Auth + Database + Storage
- Legacy Supabase Edge Functions: kept under `/supabase/functions` during migration/cutover

## Frontend setup

```bash
npm install
```

Create/update `.env` at repository root:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_API_URL=http://localhost:8000
```

Run frontend:

```bash
npm run dev
```

## Backend setup

See `/backend/README.md` for complete instructions.

Quick start:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API endpoints

- `POST /api/chat`
- `POST /api/job-suggestions`
- `POST /api/resume-analyze`
- `POST /api/scam-detect`

All backend endpoints require `Authorization: ****** using a Supabase access token.
JWTs are validated via Supabase Auth before request processing.
