# Burnout Radar — Backend (FastAPI)

API for anonymous check-ins. **No auth, login, signup, or profiles yet.**

## Setup

From this `backend/` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

```bash
cp .env.example .env
# or put secrets only in `.env.local` (also loaded when you run uvicorn from `backend/`)
```

Set **`SUPABASE_URL`** and **`SUPABASE_KEY`** (service role key recommended for server-side inserts; if you use the anon key, add RLS policies—see `sql/init_checkins.sql` comments).

### Local AI (optional, for `POST /ai/plan/generate`)

Plan generation calls a **local** HTTP server only (defaults match [Ollama](https://ollama.com/)’s address). No external AI APIs are used.

| Env var | Default | Purpose |
|--------|---------|---------|
| **`LOCAL_AI_BASE_URL`** | `http://127.0.0.1:11434` | Base URL of the local model server |
| **`LOCAL_AI_MODEL`** | `phi4-mini` | Model tag as registered on that server |
| **`LOCAL_AI_TIMEOUT_SECONDS`** | `60` | HTTP timeout for one generation request |

Start your local server (e.g. run Ollama and pull a model such as **`phi4-mini`** or another tag you configure), then start the API. If the server is down, `POST /ai/plan/generate` returns **503** with a clear message.

## Database (Supabase Postgres)

1. In the Supabase dashboard, open **SQL** → **New query**.
2. For a **new** project, run **`sql/init_checkins.sql`** (creates `checkins` including `raw_payload` and `recommendation_snapshot`).
3. If the table **already existed** from an older init, run **`sql/alter_checkins_add_payloads.sql`** if JSON columns are missing. **`sql/alter_checkins_add_additional_context.sql`** is optional: personal free-text is kept in **`raw_payload.step5.additional_context`** (older rows may use **`raw_payload.step4.additional_context`** only); add the column only if you want a top-level SQL field.
4. Confirm table **`public.checkins`** exists with the expected columns.
5. Run **`sql/init_plans.sql`** to create **`public.plans`** for saved AI plans (after check-ins exist). Indexes support listing by **`anonymous_id`**, newest first.

`POST /checkins` **persists** one row per request. If env vars are missing or Supabase errors, the API returns **503** with a plain-text `detail` message (not a fake success).

**Plans:** **`POST /plans`** saves a structured plan; **`GET /plans/{anonymous_id}`** returns up to **10** recent rows for that id. Missing **`plans`** table → **503** from Supabase.

## Run locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API base: **http://127.0.0.1:8000**
- Docs: **http://127.0.0.1:8000/docs**
- Health: **GET** `/health`

## Routes

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| POST | `/checkins` | Validates body, **inserts** into `checkins` |
| GET | `/checkins/{anonymous_id}/history` | Up to **5** most recent rows for that id, newest first (**200** with `[]` if none) |
| GET | `/checkins/{anonymous_id}` | Latest full saved check-in row for that opaque id, or **404** |
| POST | `/ai/plan/generate` | Structured plan JSON via **local** model server |
| POST | `/plans` | Save a generated plan for an **`anonymous_id`** |
| GET | `/plans/{anonymous_id}` | Recent saved plans, newest first (max 10) |

### Example: `POST /plans`

After **`POST /ai/plan/generate`**, persist the **`plan`** object (same shape as in the generate response):

```json
{
  "anonymous_id": "anon_cli_01",
  "source_checkin_id": "550e8400-e29b-41d4-a076-446655440000",
  "plan": {
    "title": "Gentle stress reset",
    "plan_type": "stress_reset",
    "summary": "A few small steps for the next day.",
    "time_horizon": "next 24 hours",
    "checklist_items": [
      {
        "label": "Ten-minute walk",
        "description": "A short walk can loosen tension when stress feels stuck in the body.",
        "time_estimate": "~10 minutes",
        "additional_info": null
      }
    ],
    "notes": ["Not a substitute for professional care."]
  },
  "model": "phi4-mini",
  "source": "local_model"
}
```

Success response includes **`plan_id`**, **`anonymous_id`**, **`status`**, **`message`**.

### Example: `POST /checkins`

Request JSON (field names are **snake_case**, matching the Pydantic schemas):

```json
{
  "anonymous_id": "anon_cli_01",
  "step1": {
    "roles": ["student"],
    "role_other_text": null,
    "pressures": ["academics"],
    "pressure_other_text": null,
    "help_needs": ["sleep_better"],
    "help_other_text": null
  },
  "step2": {
    "symptoms": ["poor_sleep", "overthinking"],
    "stress_level": 7,
    "energy_level": 4
  },
  "step3": {
    "sleep_duration": "h_6_7",
    "sleep_quality": "okay",
    "sleep_consistency": "somewhat_consistent",
    "imported_from_wearable": false
  },
  "step4": {
    "country_of_birth": null,
    "has_migration_history": null,
    "migration_entries": [],
    "migration_context": null
  },
  "step5": {
    "medications": null,
    "medical_conditions": null,
    "additional_context": null,
    "consent_to_sensitive_context": null
  }
}
```

Optional body fields (for analytics / future model context):

- **`raw_payload`** — normalized JSON snapshot (client also sends flattened columns).
- **`recommendation_snapshot`** — JSON of the recommendations the user saw (client-computed).
- **`client_context`** — optional non-secret map; merged into `raw_payload` on insert if present.

Example success response:

```json
{
  "anonymous_id": "anon_cli_01",
  "checkin_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "saved",
  "message": "Check-in saved successfully."
}
```

### Example: `POST /ai/plan/generate`

Requires a running local model server at **`LOCAL_AI_BASE_URL`** (e.g. Ollama on **`http://127.0.0.1:11434`**).

Request body (field names **snake_case**):

```json
{
  "anonymous_id": "anon_cli_01",
  "plan_type": "next_72_hours",
  "user_request": "I'm juggling deadlines and poor sleep.",
  "checkin_context": {
    "stress_level": 7,
    "energy_level": 4,
    "sleep_quality": "poor",
    "summary": "Rule-based snapshot text if you have it."
  }
}
```

Success response (**200**): `plan` matches **`GeneratedPlan`** (title, summary, time_horizon, non-empty **`checklist_items`**, optional **`notes`**), plus **`source`: `"local_model"`** and **`model`**: your configured model name.

Typical errors:

- **503** — cannot connect to the local model server.
- **504** — request timed out (`LOCAL_AI_TIMEOUT_SECONDS`).
- **502** — server returned bad HTTP, non-JSON, or JSON that failed schema validation.

## CORS

`FRONTEND_ORIGIN` (default `http://localhost:3000`) is allowed for local Next.js.

## Frontend (Next.js)

Point the app at this API with **`NEXT_PUBLIC_API_BASE_URL`** (e.g. `http://127.0.0.1:8000`). See `frontend/.env.local.example` — only that public URL belongs in the frontend; keep Supabase keys in `backend/.env` only.

## Out of scope (for now)

- Auth, user accounts, recommendation engine in Python, dashboard/history beyond latest id lookup
- Plan checklist completion sync, editing/deleting saved plans, streaming or multi-model routing
