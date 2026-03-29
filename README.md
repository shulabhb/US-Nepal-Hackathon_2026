# Burnout Radar

Anonymous check-in flow, a support-oriented dashboard, and AI-assisted planning that runs against a **local** model server (e.g. Ollama)—no bundled cloud LLM keys. Persistence uses **Supabase** (Postgres + REST).

If you are **reviewing** or **forking** this repo, the shortest path is: configure Supabase + env files, apply the SQL in order, run the API, then the Next.js app.

## Prerequisites

- **Python** 3.11+ (3.12 is fine)
- **Node** 20+ (matches current Next.js)
- A **Supabase** project (free tier is enough) **or** a local Supabase stack if you prefer not to use hosted Postgres
- **Optional:** [Ollama](https://ollama.com/) (or any HTTP-compatible local server) for `/ai/plan/generate` and `/ai/chat/reply`

## Database (SQL)

The app talks to Postgres through Supabase’s API. Create a project, open **SQL** → **New query**, and run scripts from `backend/sql/` **in this order**:

1. **`init_checkins.sql`** — `checkins` table and indexes  
2. **`alter_checkins_add_payloads.sql`** — only if you created `checkins` before those columns existed (safe to re-run)  
3. **`alter_checkins_add_additional_context.sql`** — optional top-level text column (app also stores context in JSON)  
4. **`init_plans.sql`** — `plans` table for saved plans  
5. **`alter_plans_add_plan_meta.sql`** — optional `plan_meta` JSON for generation metadata  
6. **`alter_plans_add_completion_support.sql`** — comments only; checklist completion is stored inside `checklist_items` JSON (no schema change required)

Use the **service role** key in the backend `.env` for inserts, or configure **RLS** if you use the anon key (hints are in the SQL comments).

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: SUPABASE_URL, SUPABASE_KEY, and optionally LOCAL_AI_* (see backend/README.md)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://127.0.0.1:8000  
- OpenAPI: http://127.0.0.1:8000/docs  

## Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL to match the API (default http://127.0.0.1:8000)
npm run dev
```

App: http://localhost:3000  

## More detail

- **`backend/README.md`** — environment variables, routes, and API examples  
- **`frontend/.env.local.example`** — browser-safe API URL only; keep Supabase secrets on the server  

This project is a prototype: no authentication, no clinical claims; planning output is for support only.
