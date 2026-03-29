# Deploy: Vercel (frontend) + Render (backend)

This guide assumes the repo is on **GitHub** (or GitLab/Bitbucket) so both platforms can pull from the same branch.

## Architecture

| Piece | Host | Role |
| ----- | ---- | ---- |
| Next.js app | **Vercel** | Serves the UI. Proxies `/burnout-api/*` to Render using `BACKEND_PROXY_URL`. |
| FastAPI API | **Render** | REST API, Supabase, calls to an Ollama-compatible URL (`LOCAL_AI_*`). |

The browser uses **`NEXT_PUBLIC_API_BASE_URL=/burnout-api`** so API calls stay **same-origin** on your Vercel domain (no CORS issues for normal app traffic). You still set **`FRONTEND_ORIGIN`** on Render for tools, direct API access, or if you ever point the browser at the API URL.

---

## 1. Prerequisites

1. **Supabase** project with SQL from `backend/sql/` applied in order (see root `README.md`).
2. **Git remote** with this branch pushed.
3. **Ollama / local AI** does **not** run inside Render by default. For hosted AI you need a reachable **Ollama-compatible HTTP base URL** (e.g. another server, tunnel, or a different inference provider you wire in later). Until then, plan/chat AI routes may fail—check `LOCAL_AI_*` in Render.

---

## 2. Deploy the backend (Render)

### Option A — Blueprint (`render.yaml`)

1. In [Render Dashboard](https://dashboard.render.com), **New** → **Blueprint**.
2. Connect the repository and select the branch you want to deploy.
3. Render reads `render.yaml` at the repo root and creates **burnout-radar-api** with `rootDir: backend`.

### Option B — Web Service manually

1. **New** → **Web Service** → connect the repo.
2. **Root Directory:** `backend`
3. **Runtime:** Python 3
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Health Check Path:** `/health`

### Environment variables (Render)

Set these in the service **Environment** tab (use your real values):

| Key | Example / notes |
| --- | ---------------- |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_KEY` | Service role or key allowed to insert (see `backend/README.md`) |
| `FRONTEND_ORIGIN` | Your Vercel URL(s), comma-separated. Example: `https://burnout-radar.vercel.app,https://burnout-radar-git-main-team.vercel.app` |
| `LOCAL_AI_BASE_URL` | Must be reachable **from Render’s network** (not `http://127.0.0.1:11434`). |
| `LOCAL_AI_MODEL` | e.g. `phi4-mini` |
| `LOCAL_AI_TIMEOUT_SECONDS` | e.g. `120` for slow models |

**Note:** Free web services **spin down** after idle time; the first request after sleep can take **30–60+ seconds**. Upgrade or use a paid instance for always-on.

4. Deploy and wait until the service is **Live**. Copy the public URL, e.g. `https://burnout-radar-api.onrender.com`.

5. Sanity check: open `https://YOUR-API.onrender.com/health` — you should see JSON with `"status": "ok"`.

---

## 3. Deploy the frontend (Vercel)

1. Go to [Vercel](https://vercel.com) → **Add New** → **Project** → import the same Git repository.
2. **Root Directory:** set to **`frontend`** (monorepo).
3. **Framework Preset:** Next.js (auto-detected).
4. **Build Command:** `npm run build` (default).
5. **Output:** Next default (no change).

### Environment variables (Vercel)

Add **Production** (and **Preview** if you want previews to hit the same API):

| Key | Value |
| --- | ----- |
| `NEXT_PUBLIC_API_BASE_URL` | `/burnout-api` |
| `BACKEND_PROXY_URL` | `https://YOUR-SERVICE.onrender.com` — **no trailing slash** |

`BACKEND_PROXY_URL` is read at **build time** by `next.config.mjs` rewrites. After changing it, **redeploy** the Vercel project.

6. Deploy. Open your Vercel URL and exercise check-ins / plans.

### Preview deployments

Each Vercel preview has its own hostname. Either:

- Add preview URLs to **`FRONTEND_ORIGIN`** on Render (comma-separated), **or**
- Rely on same-origin `/burnout-api` only (browser never calls Render directly; CORS rarely needed for the app). Still set at least your **production** Vercel URL on Render.

---

## 4. Order of operations

1. Deploy **Render** first and confirm `/health`.
2. Set **Vercel** env vars with the Render URL, then deploy **Vercel**.
3. Update **`FRONTEND_ORIGIN`** on Render to match your final Vercel production (and preview) URLs.

---

## 5. Troubleshooting

| Symptom | What to check |
| ------- | ------------- |
| API 502 / timeout on Render | Build logs, `PORT`, start command, Supabase env vars. |
| Frontend “API not configured” | `NEXT_PUBLIC_API_BASE_URL` missing or wrong on Vercel; redeploy after env change. |
| 404 on `/burnout-api/...` | `BACKEND_PROXY_URL` wrong or not set at build time; trailing slash on proxy URL. |
| CORS errors in browser | You pointed `NEXT_PUBLIC_API_BASE_URL` at Render directly; add your Vercel origin to `FRONTEND_ORIGIN` or switch back to `/burnout-api` + `BACKEND_PROXY_URL`. |
| AI routes fail | `LOCAL_AI_BASE_URL` must be reachable from Render, not localhost. |

---

## 6. Local development (unchanged)

Use `frontend/.env.local` and `backend/.env` as in `README.md` — direct `http://127.0.0.1:8000` or same-origin tunnel per `docs/tunnel.md`.
