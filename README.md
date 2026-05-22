# MESA — Mines Enterprise Support & Advising Agent

AI operations platform for Colorado School of Mines. Three agents: IT Help Desk Triage (Gemini Flash 2.0), Edify Data Dictionary (Ollama Llama 3.1:8b), Student Distress Early Warning (Ollama Llama 3.1:8b).

## Prerequisites

- Python 3.11+
- Node 18+
- Ollama installed + `llama3.1:8b` pulled
- Gmail account with App Password enabled

## Setup

```bash
# 1. Backend
pip install -r requirements.txt
cp .env.example .env
# Fill in GEMINI_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD in .env

# 2. Frontend
cd frontend
npm install

# 3. Ollama
ollama serve        # in separate terminal
ollama pull llama3.1:8b
```

## Run

```bash
# Terminal 1 — backend
uvicorn backend.main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

## Demo Walkthrough

1. Open http://localhost:5173/portal/submit — submit an Edify-related ticket
2. Watch http://localhost:5173/admin/dashboard — cluster count updates
3. After 5 Edify tickets: Agent 2 trigger fires, Agent 2 panel activates
4. Go to http://localhost:5173/portal/schema — upload backend/mock_data/sample_schema.csv
5. Wait 60s — distress flags appear at http://localhost:5173/admin/distress
6. Click **Approve & Send Alert** — email sends, flag clears
