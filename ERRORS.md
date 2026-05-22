# ERRORS.md — MESA Failed Approaches Log

## FORMAT
```
## [DATE] — [TASK]
**What failed:** [approach + why it failed]
**What worked:** [solution]
**Note for next time:** [one-line rule]
```

---

## 2026-05-21 — Task 6: pattern_detector cluster upsert

**What failed:** `db.query(Cluster).filter_by(system=system)` — single-key lookup. When two distinct topics share the same system (e.g. "Edify/Auth" and "Edify/Pipeline"), the second group finds and overwrites the first cluster row. Only one cluster per system ever existed; count was that of whichever topic ran last.
**What worked:** `filter_by(system=system, topic=topic)` composite key.
**Note for next time:** Cluster identity is (system, topic) not system alone — always upsert on both keys.

---

## 2026-05-21 — Task 9: agent3 db.commit inside per-student loop

**What failed:** `db.commit()` called after each student's `db.add(flag)` inside the for-loop. If an exception fires mid-loop, flags from earlier iterations are already committed with no rollback possible — partial state in DB, no way to audit which students were processed.
**What worked:** Accumulate all `db.add()` calls in the loop, single `db.commit()` after the loop exits.
**Note for next time:** Never commit inside a loop that processes a batch — batch all adds, single commit at end.

---

## 2026-05-21 — Task 11: naive vs timezone-aware datetime in SQLite comparisons

**What failed:** `datetime.datetime.now(datetime.timezone.utc).date()` → `datetime.datetime.combine(today, time.min)` produces a naive datetime. `datetime.datetime.now(datetime.timezone.utc) - timedelta(days=7)` produces a timezone-aware datetime. SQLite/SQLAlchemy stores naive UTC strings — comparing naive column values against aware datetimes either fails silently or raises depending on dialect version.
**What worked:** `now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)` for all DB comparisons — strips tzinfo to match SQLite's naive storage.
**Note for next time:** SQLite always stores naive datetime strings — strip tzinfo from all Python datetimes before filtering against DB columns.

---

## 2026-05-21 — Task 11: missing except block in generate-dictionary route

**What failed:** No `except Exception` block around the agent2 call in `POST /generate-dictionary`. If `generate_dictionary()` raises (Ollama down, JSON parse error, etc.), the route exits via unhandled exception — FastAPI returns 500, but `job.status` stays `"processing"` in the DB permanently. Dict-jobs panel shows a stuck job with no error.
**What worked:** Added `except HTTPException: raise` (re-raise FastAPI exceptions) + `except Exception as e: job.status = "failed"; db.commit(); raise HTTPException(500, detail=str(e))` before `finally`.
**Note for next time:** Any route that creates a DB record at the start of a try block needs an explicit except to mark that record as failed before propagating.

---

## 2026-05-21 — Task 11: wrong mock patch target in test_post_ticket_mock_gemini

**What failed:** `patch("backend.agents.agent1_helpdesk.classify_ticket", ...)` — patches the function in the module where it's defined, but `main.py` does `from backend.agents.agent1_helpdesk import classify_ticket` which binds the name in `backend.main`'s namespace at import time. The patch never intercepts the actual call; test hit real Gemini API and got `auto_resolved=False` (correct failure).
**What worked:** `patch("backend.main.classify_ticket", ...)` — patch the name in the module that uses it, not where it's defined.
**Note for next time:** Always patch the name in the module that imports and calls it (`backend.main.X`), not the module that defines it (`backend.agents.agent1_helpdesk.X`).

---

## 2026-05-21 — Tasks 13-16: liveStats fetched but not wired to KPI render in Dashboard.jsx

**What failed:** Implementer added `liveStats` state + `getDashboardStats()` fetch in useEffect, but KPI cards still rendered from static `KPIS` constant — `{KPIS.map(...)}` unchanged. Live data was silently ignored; dashboard always showed hardcoded 47/68%/3/4 values.
**What worked:** Derive a `kpis` array from `liveStats` inside the component body: `const kpis = liveStats ? [...live values] : KPIS` — then render `{kpis.map(...)}`.
**Note for next time:** After adding live data state to a migrated component, grep for every place the static constant is rendered and replace with the live state variable.
