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
# Fill in all keys — see .env.example for full list

# 2. Frontend
cd frontend
npm install

# 3. Ollama
ollama serve        # in separate terminal
ollama pull llama3.1:8b
```

### Required `.env` keys

```
GEMINI_API_KEY=        # Google AI Studio key
GMAIL_USER=            # Gmail address for SMTP
GMAIL_APP_PASSWORD=    # Gmail app password (not account password)
CLUSTER_THRESHOLD=5
ADVISOR_EMAIL=         # inbox for distress alert delivery
IT_TEAM_EMAIL=         # inbox for IT escalation alerts
OLLAMA_BASE_URL=http://localhost:11434
```

## Run

```bash
# Terminal 1 — backend (port 8010 required)
uvicorn backend.main:app --reload --port 8010

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Backend: http://localhost:8010
- Frontend: http://localhost:5173
- API docs: http://localhost:8010/docs

On first start, the backend seeds 50 tickets and pre-populates clusters automatically. Run `alembic stamp head` once after the first start to sync migration tracking.

## Demo Walkthrough

1. Open http://localhost:5173/admin/dashboard — clusters and KPIs are pre-populated from seed data
2. Open http://localhost:5173/portal/submit — submit an Edify-related ticket to push the cluster count higher
3. On the dashboard, Edify cluster shows **Trigger Agent 2** — click to go to the clusters panel
4. Go to http://localhost:5173/portal/schema — upload `backend/mock_data/sample_schema.csv` to generate a data dictionary
5. Wait ~60s — distress flags appear at http://localhost:5173/admin/distress
6. Click **Approve & Send Alert** — email sends, flag clears
