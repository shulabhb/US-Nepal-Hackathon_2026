<<<<<<< HEAD
<div align="center">
  <h1>🔋 Burnout Radar By Team All Nighters</h1>
  <p><strong>Check your strain before you make your next plans. 100% Anonymous.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Frontend-Next.js_16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/AI-Ollama_(phi4--mini)-blue?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama Local AI" />
  </p>
</div>

---

## 📖 Project Description

**Burnout Radar** is a privacy-first web application designed for students and career seekers to track their mental load and pace their tasks responsibly. A structured check-in (stress, energy, symptoms) gives you an illustrative snapshot of your strain before you organize your day or week. 

Use your private, anonymous workspace to adjust tasks, follow tailored checklists, and get contextual support chat—powered by purely local AI models to guarantee ultimate privacy. **We never ask for your real name or number.**

### ✨ Key Features
- 🛡️ **100% Anonymous Check-ins:** Track your energy and stress without compromising identity.
- 📊 **Strain Visualizations:** Illustrative rings show your current burnout risk instantly.
- 🤖 **Local AI Support Chat:** Talk through your tasks with a private, locally-hosted LLM (`phi4-mini`) that understands your current strain context.
- 📋 **Mastery Plans:** Actionable short-term to-do lists engineered to avoid overloading your mental capacity.

---

## 🚀 Installation & Setup Guide

This project is split into a **Next.js Frontend** and a **FastAPI Backend**. Follow these steps to get everything running locally on your machine.

### 📋 Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.10 or higher)
- [Supabase Account](https://supabase.com/) (or local Supabase instance)
- [Ollama](https://ollama.com/) (for running the local AI model)

---

### 🧠 1. Setup Local AI (Ollama)
Because Burnout Radar guarantees absolute privacy, we use **Ollama** to run the AI completely localized on your machine.

1. Download and install Ollama from [ollama.com](https://ollama.com)
2. Open a terminal and pull the required model:
   ```bash
   ollama pull phi4-mini
   ```
3. Keep the Ollama application running in the background.

---

### ⚙️ 2. Backend Setup (FastAPI)
The backend manages the database connections and proxies requests to the local LLM.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # MacOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   
   # Windows
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up Environment Variables:
   - Copy the example `.env` file: `cp .env.example .env`
   - Open `.env` and add your Supabase credentials:
     ```env
     SUPABASE_URL="your-supabase-url"
     SUPABASE_KEY="your-supabase-anon-key"
     OLLAMA_BASE_URL="http://127.0.0.1:11434"
     ```
5. Start the backend server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *The API will now be listening on `http://127.0.0.1:8000`*

---

### 🖥️ 3. Frontend Setup (Next.js)
The frontend is built with Next.js App Router, TailwindCSS v4, and Shadcn UI.

1. Open a **new terminal tab** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Set up Environment Variables:
   - Create a `.env.local` or `.env` file in the frontend directory based on your backend configs:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:8000
     NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
     NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
     ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

---

## 🎉 You're All Set!

Open your browser and navigate to:
**👉 [http://localhost:3000](http://localhost:3000)**

You can now use Burnout Radar seamlessly! Data will flow from your browser, through FastAPI, query your privacy-secured Supabase, and interface with your localized `phi4-mini` AI.

=======
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
>>>>>>> main
