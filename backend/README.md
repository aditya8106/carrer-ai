# Backend (FastAPI)

This directory contains the Python FastAPI backend that replaces the Supabase Edge Functions for:

- `POST /api/chat`
- `POST /api/job-suggestions`
- `POST /api/resume-analyze`
- `POST /api/scam-detect`

Supabase remains the source of truth for authentication/database/storage.

## Environment variables

Copy `.env.example` to `.env` and set:

- `LOVABLE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `FRONTEND_ORIGINS` (comma-separated origins allowed for CORS)

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend integration

Set frontend `.env`:

```bash
VITE_API_URL=http://localhost:8000
```

The frontend sends Supabase access tokens as `Authorization: ******
The backend validates that JWT against Supabase Auth (`/auth/v1/user`) and does not trust user IDs from request payloads.

## Docker

```bash
cd backend
docker build -t carrer-ai-backend .
docker run --env-file .env -p 8000:8000 carrer-ai-backend
```

## Legacy Edge Functions

The original Supabase Edge Functions under `/supabase/functions` are intentionally retained as legacy during migration/cutover.
