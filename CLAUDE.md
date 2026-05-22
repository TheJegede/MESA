# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Full project spec, behavioral rules, grill/caveman modes, and demo-day checklist: `.claude/CLAUDE.md`

---

## Commands

### Backend

```bash
# Start backend (from project root)
uvicorn backend.main:app --reload

# Run all tests
pytest tests/ -v

# Run single test
pytest tests/test_pattern_detector.py::test_threshold_triggers -v

# Run a test file
pytest tests/test_main.py -v
```

### Frontend

```bash
cd frontend

npm install        # first time only
npm run dev        # dev server → http://localhost:5173
npm run build      # production build (use to verify no errors)
```

### Required services before running

```bash
ollama serve                    # separate terminal
ollama pull llama3.1:8b         # first time only
cp .env.example .env            # then fill in API keys
```

---

## Architecture

### Two-process system

Backend (`uvicorn backend.main:app`) and frontend (`npm run dev`) run independently. Frontend proxies `/api/*` to `http://localhost:8000` but `src/api/mesa.js` calls `http://localhost:8000` directly (no proxy prefix).

### Backend package layout

```
backend/
  main.py           ← FastAPI app, 11 routes, lifespan startup
  database.py       ← 6 SQLAlchemy models (sync), get_db(), seed_tickets_if_empty()
  config.py         ← dotenv loader, exports GEMINI_API_KEY, CLUSTER_THRESHOLD, OUTPUTS_DIR, etc.
  agents/
    agent1_helpdesk.py    ← Gemini Flash 2.0; classify_ticket() → dict with confidence gate
    agent2_dictionary.py  ← Ollama llama3.1:8b; FERPA regex scan first, then dict generation
    agent3_distress.py    ← Ollama llama3.1:8b; scan_students(db) reads canvas_signals.json
  services/
    email_service.py      ← Gmail SMTP; send_email() + send_with_attachment()
    pattern_detector.py   ← run_pattern_detection(db); GROUP BY (system, topic), upserts Cluster rows
    scheduler.py          ← APScheduler BackgroundScheduler; fires _distress_sweep every 60s
```

### Cascade trigger chain

```
POST /tickets
  → agent1_helpdesk.classify_ticket()        [Gemini Flash 2.0]
  → Ticket + TicketTag written to DB
  → pattern_detector.run_pattern_detection() [GROUP BY system/topic]
  → if count >= CLUSTER_THRESHOLD and not threshold_hit:
      cluster.threshold_hit = True           [admin dashboard activates]
  → APScheduler fires scan_students() every 60s [independent, Ollama only]
      → DistressFlag rows written (status="pending")
      → advisor clicks Approve → email sends
```

### Privacy boundaries — enforced in agent files, never bypass

| Data | Allowed LLM |
|---|---|
| Ticket text | Gemini Flash 2.0 (agent1) |
| Schema files | Ollama only (agent2) — never Gemini |
| Student signals (canvas_signals.json) | Ollama only (agent3) — never leaves machine |

### Frontend routes

```
/portal/submit       → SubmitTicket.jsx    (POST /tickets)
/portal/my-tickets   → MyTickets.jsx       (GET /tickets)
/portal/schema       → SchemaUpload.jsx    (POST /generate-dictionary + FERPA modal)
/admin/dashboard     → Dashboard.jsx       (polls /dashboard-stats, /clusters, /system-health every 10s)
/admin/tickets       → TicketClusters.jsx  (polls /clusters, /tickets every 10s)
/admin/dictionary    → DictPanel.jsx       (GET /dict-jobs on mount)
/admin/distress      → DistressQueue.jsx   (polls /distress-flags every 10s)
```

### Database (SQLite — `mesa.db` at project root)

`database.py` seeds 50 tickets on first startup via `seed_tickets_if_empty()`. This pre-populates clusters so the cascade is visible immediately. DB file is gitignored.

### Safety controls (submission requirements — never remove)

- Agent 1: `confidence < 0.7` → `auto_resolved=False, tier=2`, escalation message
- Agent 2: FERPA regex on column names → `ferpa_flag=True` response → frontend shows confirmation modal; `generate_dictionary_confirmed()` bypasses scan only after explicit user confirm
- Agent 3: `DistressFlag.status = "pending"` until advisor clicks Approve; email fires only in `POST /distress-flags/{id}/approve`
- All outbound email: recorded in `EmailLog` table
