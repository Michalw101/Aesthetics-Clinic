# Aesthetics Clinic

A full-stack web application for an aesthetics clinic: product consultation, treatment information, appointment booking UI, store, blog, and an AI assistant powered by Google Gemini. Data persistence for chat and contact forms uses **Supabase** via a **FastAPI** backend. The frontend is a **React** SPA built with **Vite** and **TypeScript**.

## Architecture

```
┌─────────────────┐      POST /api/chat       ┌─────────────────┐      Gemini API
│  React (Vite)   │ ────────────────────────► │  FastAPI        │ ─────────────────►
│  Port 3000*     │      POST /add_data     │  Port 3000      │
└─────────────────┘                         └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │  Supabase       │
                                            │  (PostgreSQL)   │
                                            └─────────────────┘
```

\* In development, the Vite dev server defaults to port **3000**. Run the backend on another port (e.g. **8000**) or change `vite.config` / scripts to avoid a port clash.

| Layer | Tech | Role |
|-------|------|------|
| Frontend | React 19, Vite, Tailwind CSS | UI, in-browser clinic demo data (appointments, cart, etc.) |
| Backend | FastAPI, Uvicorn | Gemini proxy, Supabase writes (API keys stay on server) |
| Database | Supabase | Stores chat logs and consultation form submissions |
| AI | Google Gemini (`gemini-2.5-flash` by default) | Virtual beauty assistant (Hebrew) |

### API endpoints (backend)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/chat` | Sends chat history to Gemini; saves Q&A to Supabase `data_table`; returns `{ "reply": "..." }` |
| `POST` | `/add_data` | Saves name + message to Supabase `user_inputs` |
| `GET` | `/api/products` | List all products from Supabase |
| `GET` | `/api/products/search?q=...&category=...` | Search products by name, brand, or category (Supabase `search_products` RPC) |

## Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+
- A [Supabase](https://supabase.com/) project
- A [Google AI](https://aistudio.google.com/) API key (Gemini)

### Supabase tables

Create these tables in the Supabase SQL editor (adjust names/types if you already use different schemas):

```sql
-- Chat history (used by POST /api/chat)
create table if not exists public.data_table (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  created_at timestamptz default now()
);

-- Consultation contact form (used by POST /add_data)
create table if not exists public.user_inputs (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  content text not null,
  created_at timestamptz default now()
);
```

**Products + search** (user story: Search products) — **פעם אחת** בפרויקט המשותף: הריצו [`backend/sql/products_search.sql`](backend/sql/products_search.sql) ב-Supabase SQL Editor (יוצר טבלת `products`, פונקציית חיפוש, ו-4 מוצרי דוגמה). אחרי זה כל מי שמחובר לאותו `SUPABASE_URL` רואה את אותם מוצרים.

Enable Row Level Security policies as needed for your environment, or restrict access so only the backend service role key can write (recommended for production).

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "Aesthetics Clinic"
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
```

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

**macOS / Linux:**

```bash
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
# Optional:
# GEMINI_MODEL=gemini-2.5-flash
```

Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend setup

Open a **second** terminal:

```bash
cd frontend
npm install
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

Edit `frontend/.env` (copy from `.env.example`):

```env
VITE_BACKEND_URL=http://localhost:3000
```

> **פיתוח מקומי (`npm run dev`):** אין צורך לשנות את `VITE_BACKEND_URL`. Vite מנתב אוטומטית את `/api` לבקאנד על פורט **8000**. הריצו: `uvicorn main:app --reload --port 8000`.
>
> **Docker:** `VITE_BACKEND_URL=http://localhost:3000` נכון — הבקאנד בקונטיינר על 3000.

Start the dev server:

```bash
npm run dev
```

Open the URL shown in the terminal (default: [http://localhost:3000](http://localhost:3000)).

> **Port note:** Vite uses port **3000** by default; the sample backend command above uses **8000**. Keep `VITE_BACKEND_URL` in sync with the port where Uvicorn is listening.

### 4. Docker (optional)

From the project root, configure `backend/.env` first, then:

```bash
docker compose up --build
```
## Running Tests

### Frontend Tests
The frontend includes a test suite located in the `frontend/src/tests` (or `frontend/tests`) directory. To run the tests, open your terminal and navigate to the frontend folder:

```bash
cd frontend
npm run test
```

| Service | URL |
|---------|-----|
| Frontend (nginx) | [http://localhost:8080](http://localhost:8080) |
| Backend | [http://localhost:3000](http://localhost:3000) |

For Docker builds, set `VITE_BACKEND_URL` to the URL the **browser** will use to reach the API (e.g. `http://localhost:3000`) before `npm run build`, or add a build-arg in the frontend Dockerfile if you deploy to another host.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase API key (anon or service role) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Model id (default: `gemini-2.5-flash`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | Yes | Base URL of the FastAPI server |

Never commit `.env` files. Use `.env.example` as a template.

## Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn main:app --reload --port 8000` | Run API with hot reload |
| `python main.py` | Run on port 3000 (see `main.py`) |

## Project structure

```
Aesthetics Clinic/
├── backend/
│   ├── main.py              # FastAPI app, Gemini + Supabase
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main UI shell & routing
│   │   ├── pages/           # Page components (e.g. StorePage + product search)
│   │   ├── components/      # Reusable UI (e.g. SearchBar)
│   │   ├── hooks/           # Auth & clinic state
│   │   └── lib/             # API client, utilities
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Security notes

- Gemini and Supabase secrets belong **only** in `backend/.env`.
- The frontend calls the backend; it does not embed API keys.
- Tighten CORS in `backend/main.py` (`allow_origins`) before production.
- Rotate any keys that were ever committed or shared.

## License

Private / educational use unless otherwise specified by the repository owner.
