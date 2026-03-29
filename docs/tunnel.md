# Sharing a local demo (ngrok + password)

Use this when a teammate should open **one HTTPS URL** (your machine) and use the full app: Next.js UI + FastAPI, without exposing two separate tunnels.

## How it works

1. **FastAPI** runs on your machine (default `http://127.0.0.1:8000`).
2. **Next.js** runs on port **3000** and proxies `/burnout-api/*` to that backend (`next.config.mjs` rewrites).
3. The browser uses **`NEXT_PUBLIC_API_BASE_URL=/burnout-api`** so all API calls stay **same-origin** with the Next app.
4. **ngrok** exposes **only port 3000** with **HTTP Basic Auth** so random people cannot load the page without the password.

Backend CORS stays simple: the browser never talks to FastAPI directly during this demo (only to Next).

## One-time setup

1. Install [ngrok](https://ngrok.com) (e.g. `brew install ngrok/ngrok/ngrok`).
2. **Create a free account** and install your authtoken (required for any tunnel):
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```
   Get the token from [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
3. In `frontend/.env.local`, use the same-origin proxy (required for one tunnel):
   ```bash
   NEXT_PUBLIC_API_BASE_URL=/burnout-api
   ```
4. Restart the Next dev server after changing env (`Ctrl+C`, then `npm run dev` again).

## Run the stack

Terminal 1 — backend (from repo root):

```bash
cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — frontend:

```bash
cd frontend && npm run dev
```

Terminal 3 — tunnel with password (pick a strong password):

```bash
export TUNNEL_HTTP_PASSWORD='your-strong-secret'
./scripts/ngrok-tunnel.sh
```

Share the **https://…ngrok…** URL plus the username/password (`TUNNEL_HTTP_USER` defaults to `burndemo`, or set it yourself). Your teammate opens the ngrok URL, enters basic auth **once**, then uses the app.

Avoid `ngrok http 3000 --basic-auth …` with Next **dev** — it often causes a [repeated login loop](#repeated-username--password-prompts-nextjs-npm-run-dev). Use the script above instead.

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_BASE_URL` | Local: `http://127.0.0.1:8000`. Tunnel demo: `/burnout-api`. |
| `BACKEND_PROXY_URL` | Optional. Where Next proxies `/burnout-api` (default `http://127.0.0.1:8000`). |

## After the demo

- Stop ngrok (Ctrl+C).
- Restore `frontend/.env.local` to direct API if you prefer:

  ```bash
  NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
  ```

- Restart `npm run dev`.

## Repeated username / password prompts (Next.js `npm run dev`)

With **`ngrok http 3000 --basic-auth "user:pass"`**, the browser can **keep asking** for the login. That happens because **Next.js dev** loads many assets under **`/_next/*`** (including the **HMR WebSocket**). Those requests often **do not reuse** the same Basic Auth session the same way as the first document, so ngrok returns **401** again and the prompt repeats.

**Fix:** use the repo script (recommended) — it applies Basic Auth **only to paths that are not** under `/_next`, via ngrok **Traffic Policy**:

```bash
export TUNNEL_HTTP_PASSWORD='your-password'
./scripts/ngrok-tunnel.sh
```

Do **not** use the deprecated global `--basic-auth` flag for Next dev if you see the loop.

**Trade-off:** `/_next` static chunks are reachable **without** Basic Auth if someone guesses URLs (usually fine for a short internal demo). The **HTML page** and **API routes** (`/`, `/burnout-api`, etc.) still require auth.

## Notes

- The tunnel URL changes on free ngrok unless you use a reserved domain (paid).
- Treat the URL + password like temporary credentials; rotate the password if you share widely.
- Keep Ollama / local AI running if you use plan generation or chat AI features.
