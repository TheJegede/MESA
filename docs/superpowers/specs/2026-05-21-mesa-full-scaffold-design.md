# MESA Full Scaffold Design
**Date:** 2026-05-21  
**Status:** Approved

## Goal
Scaffold the complete MESA codebase from CLAUDE.md spec: backend (FastAPI + SQLite + 3 agents) and frontend (Vite + React Router + portal + admin), fully implemented with working code.

## Existing Assets (migrate, don't rewrite)
- `MESA Frontend/src/admin/Dashboard.jsx` → `frontend/src/admin/Dashboard.jsx`
- `MESA Frontend/src/admin/TicketClusters.jsx` → `frontend/src/admin/TicketClusters.jsx`
- `MESA Frontend/src/admin/DictPanel.jsx` → `frontend/src/admin/DictPanel.jsx`
- `MESA Frontend/src/admin/DistressQueue.jsx` → `frontend/src/admin/DistressQueue.jsx`
- `MESA Frontend/src/layouts/AdminLayout.jsx` → `frontend/src/layouts/AdminLayout.jsx`

Migrated components must: remove `window.X =` exports, add React imports, wire fetch calls through `api/mesa.js`.

## Architecture

### Backend (`mesa/backend/`)
| File | Role |
|---|---|
| `main.py` | FastAPI app, all 11 routes, CORS, startup seeder |
| `database.py` | 6 SQLAlchemy models, init_db(), get_db(), seed_tickets() |
| `config.py` | dotenv loader, CLUSTER_THRESHOLD=5 |
| `agents/agent1_helpdesk.py` | Gemini Flash 2.0, classify+tag, confidence < 0.7 → escalate |
| `agents/agent2_dictionary.py` | Ollama llama3.1:8b, FERPA regex scan, CSV+JSON artifact |
| `agents/agent3_distress.py` | Ollama llama3.1:8b, per-student risk scoring, JSON report |
| `services/email_service.py` | Gmail SMTP, send_email() + send_with_attachment() |
| `services/pattern_detector.py` | GROUP BY system_affected, threshold trigger logic |
| `services/scheduler.py` | APScheduler AsyncIOScheduler, 60s distress sweep |
| `mock_data/tickets_seed.json` | 50 tickets across Edify(15), Banner(12), Canvas(9), OneDrive(8), Workday(6) |
| `mock_data/canvas_signals.json` | 10 students, 3 with risk_score >= 70 |
| `mock_data/sample_schema.csv` | 20 cols, 3 tables, includes FERPA-sensitive fields |
| `outputs/` | Empty dir — artifact destination |
| `.env.example` | GEMINI_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, CLUSTER_THRESHOLD, OLLAMA_BASE_URL |
| `requirements.txt` | fastapi, uvicorn, sqlalchemy, apscheduler, google-generativeai, ollama, python-dotenv, aiofiles |

### Frontend (`mesa/frontend/`)
| File | Role |
|---|---|
| `src/App.jsx` | React Router v6: / → /portal, /portal/* → portal layout, /admin/* → admin layout |
| `src/portal/SubmitTicket.jsx` | Ticket submission form → POST /tickets |
| `src/portal/MyTickets.jsx` | GET /tickets filtered by session context |
| `src/portal/SchemaUpload.jsx` | File upload → POST /generate-dictionary, FERPA modal |
| `src/admin/Dashboard.jsx` | Migrated + wired to GET /dashboard-stats, GET /clusters |
| `src/admin/TicketClusters.jsx` | Migrated + wired to GET /clusters, POST /clusters/trigger |
| `src/admin/DictPanel.jsx` | Migrated + wired to GET /dict-jobs |
| `src/admin/DistressQueue.jsx` | Migrated + wired to GET /distress-flags, POST approve/dismiss |
| `src/layouts/AdminLayout.jsx` | Migrated from prototype |
| `src/api/mesa.js` | All fetch() calls to FastAPI (BASE_URL = http://localhost:8000) |
| `src/api/mockData.js` | Fallback mock data for offline dev |
| `index.html` | Vite entry point |
| `vite.config.js` | Proxy /api → localhost:8000 |
| `package.json` | react, react-dom, react-router-dom, vite, tailwindcss |

## Privacy Constraints (non-negotiable)
- Agents 2 + 3: Ollama only. No external API calls.
- canvas_signals.json data never sent outside machine.
- schema file contents never sent to Gemini.

## Safety Controls (non-negotiable)
- Agent 1: confidence < 0.7 → auto_resolved = false, escalate
- Agent 2: FERPA regex on column names → modal confirmation before generation
- Agent 3: status = pending until advisor explicit Approve click

## Routes
```
POST /tickets                        → Agent 1 → DB → email → pattern detect
GET  /tickets                        → all tickets
GET  /clusters                       → ranked cluster analytics
POST /clusters/trigger               → manual Agent 2 trigger
GET  /dashboard-stats                → KPI aggregates
POST /generate-dictionary            → file upload → Agent 2 → email
GET  /dict-jobs                      → job history
GET  /distress-flags                 → pending flags
POST /distress-flags/{id}/approve    → email + mark approved
POST /distress-flags/{id}/dismiss    → mark dismissed
GET  /system-health                  → Ollama + SMTP + scheduler status
```

## Success Criteria
- `uvicorn backend.main:app` starts, DB seeds, scheduler fires
- `npm run dev` renders /portal and /admin routes
- POST /tickets → agent1 classifies → pattern_detector fires
- POST /generate-dictionary → agent2 generates artifact in /outputs/
- GET /distress-flags returns flags after scheduler runs (60s)
- POST /distress-flags/{id}/approve sends email
