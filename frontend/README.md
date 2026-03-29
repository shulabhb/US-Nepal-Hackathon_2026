# Burnout Radar — Frontend (Next.js)

UI for onboarding, recommendations, and the support dashboard (overview, chat, plans, burnout snapshot). It calls the FastAPI backend via **`NEXT_PUBLIC_API_BASE_URL`** only.

## Run locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000  

Ensure the API from `backend/` is running and CORS **`FRONTEND_ORIGIN`** matches this app’s URL (default `http://localhost:3000`).

## Build

```bash
npm run build
npm start
```

## Configuration

| File | Purpose |
|------|---------|
| `.env.local` | `NEXT_PUBLIC_API_BASE_URL` — public API base (no secrets) |
| `backend/.env` | Supabase keys, local AI settings — **server only** |

See the **repository root `README.md`** for end-to-end setup and SQL order.
