# MEMORY.md — MESA Project Decisions Log

## FORMAT
```
## [DATE] — [TOPIC]
**Decided:** [what]
**Why:** [reasoning]
**Rejected:** [alternatives considered and why dropped]
```

---

## 2026-05-21 — Full Scaffold

**Decided:** Scaffold entire MESA codebase in one session. Backend (FastAPI + SQLAlchemy + 3 agents + 3 services) + Frontend (Vite + React Router + migrated admin JSX + new portal pages).
**Why:** Project initialized from spec. No prior code existed except prototype admin JSX in MESA Frontend/.
**Rejected:** Keeping HTML prototype as main frontend — too static, no real backend connection.

## 2026-05-21 — DistressFlag Schema

**Decided:** DistressFlag model includes `risk_level` and `recommended_action` columns beyond what CLAUDE.md table spec listed.
**Why:** Agent 3 and frontend DistressQueue require both fields for meaningful advisor workflow.
**Rejected:** Omitting them — would require frontend to derive risk_level from score and lose recommended_action entirely.

## 2026-05-21 — APScheduler Mode

**Decided:** Use `BackgroundScheduler` (thread-based) not `AsyncIOScheduler`.
**Why:** FastAPI app uses sync SQLAlchemy session. BackgroundScheduler runs in thread — matches sync DB access pattern. AsyncIOScheduler would require async session wiring.
**Rejected:** AsyncIOScheduler — wrong event loop context for sync SQLAlchemy calls.

## 2026-05-21 — Cluster Upsert Key

**Decided:** Cluster upsert lookup uses `filter_by(system=system, topic=topic)` composite key.
**Why:** Single-system with multiple topics (e.g. Edify auth + Edify pipeline) would collapse to one row if keyed on system alone.
**Rejected:** filter_by(system=system) only — spec reviewer caught this bug before it shipped.

## SESSION END — 2026-05-21

**Worked on:** Full MESA scaffold — backend + frontend
**Completed:**
- Task 1: requirements.txt, .env.example, __init__ files, .gitignore
- Task 2: config.py
- Task 3: database.py (6 models, seed loader)
- Task 4: Mock data (50 tickets, 10 students, sample schema)
- Task 5: email_service.py (Gmail SMTP)
- Task 6: pattern_detector.py (TDD, 5 tests)
- Task 7: agent1_helpdesk.py (Gemini Flash 2.0)
- Task 8: agent2_dictionary.py (Ollama + FERPA scan)
- Task 9: agent3_distress.py (Ollama student risk)
- Task 10: scheduler.py (APScheduler 60s)
- Task 11: main.py (11 routes, lifespan, integration tests)
- Task 12: Frontend Vite + Tailwind scaffold
- Task 13: api/mesa.js + mockData.js
- Task 14: Admin JSX migration (Dashboard, TicketClusters, DictPanel, DistressQueue, AdminLayout)
- Task 15: Portal components (SubmitTicket, MyTickets, SchemaUpload)
- Task 16: App.jsx + React Router v6
- Task 17: README.md, MEMORY.md, final verification

**In progress:** None — all tasks complete.
**Decisions made:** See entries above.
**Next session priorities:**
1. Run full demo with live Ollama + Gemini API keys
2. Verify FERPA modal triggers on sample_schema.csv upload
3. Verify Agent 3 distress flags appear within 70s
4. Verify Approve button sends email (check inbox)
5. Demo-day checklist (CLAUDE.md Section 10)
