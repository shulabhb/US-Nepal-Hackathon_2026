# Burnout Radar — Backend (FastAPI)

REST API for anonymous check-ins and saved plans. **No authentication** in this codebase; clients send an opaque `anonymous_id`.

## Install & run

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Fill **`SUPABASE_URL`** and **`SUPABASE_KEY`**. The service role key avoids RLS friction for server-side writes; with the anon key you must add policies (see comments in `sql/init_checkins.sql`).

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| | |
|--|--|
| API | http://127.0.0.1:8000 |
| Docs | http://127.0.0.1:8000/docs |
| Health | `GET /health` |

**CORS:** `FRONTEND_ORIGIN` (default `http://localhost:3000`) must match your Next.js origin.

## Database (SQL)

Scripts live in **`sql/`**. Run them in the Supabase **SQL editor** (or any Postgres client pointed at the same database). **Order matters** on a fresh project—see the numbered list in the **repository root `README.md`**.

Summary:

- **`init_checkins.sql`** — core `checkins` table  
- **`init_plans.sql`** — `plans` for persisted AI plans  
- **`alter_*.sql`** — incremental; safe to run when upgrading an older schema  

If Supabase returns schema cache errors after an `ALTER`, use **Project Settings → API → Reload schema** (wording may vary).

## Local AI (plans & chat)

Plan generation and chat replies use a **local** HTTP server only (defaults align with [Ollama](https://ollama.com/)). There is no OpenAI or other cloud key in this app.

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCAL_AI_BASE_URL` | `http://127.0.0.1:11434` | Chat/completions-compatible base URL |
| `LOCAL_AI_MODEL` | `phi4-mini` | Model name on that server |
| `LOCAL_AI_TIMEOUT_SECONDS` | `60` | Per-request timeout |

Start the model server, pull a model if needed, then call the API. Typical failures: **503** (cannot connect), **504** (timeout), **502** (invalid JSON or schema).

## Routes (overview)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| POST | `/checkins` | Insert check-in |
| GET | `/checkins/{anonymous_id}` | Latest check-in, or **JSON `null`** (HTTP 200) if none |
| GET | `/checkins/{anonymous_id}/history` | Up to **5** rows, newest first |
| DELETE | `/checkins/{anonymous_id}/device-data` | Delete all check-ins and plans for that id |
| POST | `/ai/plan/generate` | Structured plan JSON (local model) |
| POST | `/ai/chat/reply` | Support chat turn (local model + safe fallback) |
| POST | `/plans` | Save a plan |
| GET | `/plans/{anonymous_id}` | Up to **10** plans, newest first |
| PATCH | `/plans/{plan_id}` | Update checklist / metadata (e.g. completion) |
| DELETE | `/plans/{plan_id}?anonymous_id=…` | Remove one plan |

## Frontend

Set the browser env **`NEXT_PUBLIC_API_BASE_URL`** to this API (e.g. `http://127.0.0.1:8000`). See `frontend/.env.local.example`. Do not put Supabase service keys in the frontend.

## Examples

### `POST /checkins`

Request body uses **snake_case** (see `app/schemas/checkin.py`). Success returns `checkin_id`, `status`, `message`.

### `POST /ai/plan/generate`

Requires the local model server. Body includes `plan_type`, `checkin_context`, optional `plan_context`, `user_tasks`, etc. Success returns `plan` (`GeneratedPlan`), `source`, `model`.

### `POST /plans`

Persist the `plan` object from generation plus `anonymous_id` and optional `plan_meta`.

Full field lists are easiest to read in **OpenAPI** (`/docs`) or the Pydantic schemas under `app/schemas/`.
