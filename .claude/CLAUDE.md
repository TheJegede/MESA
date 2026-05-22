# CLAUDE.md
# MESA — Mines Enterprise Support & Advising Agent
# Claude Code Configuration — Taiwo Luwah-Mihani

---

## 0. SESSION INITIALIZATION (run every session, no exceptions)

On every new session start, execute these in order before anything else:

1. **Read `MEMORY.md`** — surface last session's decisions, in-progress items, next priorities. Never contradict a logged decision without flagging it first.
2. **Read `ERRORS.md`** — before suggesting any approach, check if it failed before.
3. **Activate caveman mode** — compress all output. Drop filler, articles, pleasantries, hedges. Keep full meaning. Apply for entire session unless explicitly told otherwise.
4. **Activate grill mode** — whenever Taiwo makes architectural propositions, specific suggestions, or logical assumptions: stress-test them. Expose flaws. Never accept initial propositions at face value. Ask one sharp challenge question before proceeding.
5. **Print session header:**

```
SESSION START
Project: MESA — Mines Enterprise Support & Advising Agent
Stack: FastAPI + React + SQLite + Gemini Flash + Ollama Llama 3.1:8b
Last decisions: [pull from MEMORY.md]
Errors to avoid: [pull from ERRORS.md]
```

---

## 1. WHO TAIWO IS — CALIBRATE TO THIS, ALWAYS

- **Role:** AI Engineer + Senior Data Analyst
- **Degree:** MS in AI/ML (Computer Science)
- **Strong in:** RAG pipelines, LLM fine-tuning (Llama-3), AWS serverless, data viz
- **Current project:** MESA — three-agent AI system for Colorado School of Mines

**Calibration rules:**
- Never over-explain ML fundamentals, RAG concepts, or LLM inference basics
- Never under-explain MESA-specific integration points — always provide full context
- Skip analogies unless architecture is genuinely novel
- Match depth to task: infra wiring = full detail, standard Python patterns = minimal commentary

---

## 2. MESA PROJECT CONTEXT (permanent — apply every session)

### System Overview
MESA is a three-agent AI operations platform. One FastAPI backend. One React frontend. Three agents with distinct LLM choices for privacy reasons.

### Agent Registry
| Agent | File | LLM | Trigger | Privacy Boundary |
|---|---|---|---|---|
| Agent 1 — Help Desk Triage | `backend/agents/agent1_helpdesk.py` | Gemini Flash 2.0 (API) | User ticket submission | Low-sensitivity operational text |
| Agent 2 — Data Dictionary | `backend/agents/agent2_dictionary.py` | Ollama Llama 3.1:8b (local) | Pattern detector threshold OR manual admin trigger | Schema files mirror real institutional data |
| Agent 3 — Student Distress | `backend/agents/agent3_distress.py` | Ollama Llama 3.1:8b (local) | APScheduler every 60s | FERPA-class student signal data |

### Privacy Architecture — NEVER VIOLATE THIS
- Agents 2 and 3 MUST use Ollama local inference. No exceptions.
- No student signal data (canvas_signals.json fields) ever leaves the machine.
- No schema file contents ever hit an external API.
- If any task would route FERPA-sensitive data to Gemini: STOP. Flag. Wait for confirmation.

### Cascade Trigger Chain (critical — understand before touching pattern_detector.py)
```
User submits ticket
  → agent1_helpdesk.py classifies + extracts tags
  → tags written to ticket_tags table
  → pattern_detector.py runs: GROUP BY system_affected, COUNT
  → if count >= threshold AND agent2_triggered = false
    → cluster row updated: threshold_hit=True, agent2_triggered=True
    → frontend Dashboard polls /clusters every 10s → Panel 2 activates
  → faculty uploads schema → agent2_dictionary.py fires
  → APScheduler fires agent3_distress.py every 60s (independent chain)
  → flags written to distress_flags table
  → advisor approves in dashboard → email sends
```

### Database Tables (SQLite — never drop, never rename columns mid-session)
```
tickets          — id, text, category, system_affected, severity, auto_resolved, resolution, created_at
ticket_tags      — id, ticket_id, topic, system, error_type
clusters         — id, topic, system, count, last_seen, threshold_hit, agent2_triggered
dict_jobs        — id, filename, status, artifact_path, triggered_by_cluster, created_at
distress_flags   — id, student_id, risk_score, risk_factors, report_path, status, reviewed_at
email_log        — id, to_addr, subject, sent_at, success, error_msg
```

### Repo Structure (canonical — do not reorganize without explicit instruction)
```
mesa/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── config.py
│   ├── agents/
│   │   ├── agent1_helpdesk.py
│   │   ├── agent2_dictionary.py
│   │   └── agent3_distress.py
│   ├── services/
│   │   ├── email_service.py
│   │   ├── pattern_detector.py
│   │   └── scheduler.py
│   ├── mock_data/
│   │   ├── tickets_seed.json
│   │   ├── canvas_signals.json
│   │   └── sample_schema.csv
│   └── outputs/
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── mockData.js
│       │   └── mesa.js
│       ├── components/
│       ├── layouts/
│       ├── portal/
│       └── admin/
├── docs/
│   ├── MESA_Submission.docx
│   └── architecture_diagram.png
├── CLAUDE.md
├── MEMORY.md
└── ERRORS.md
```

### Routes (FastAPI — backend/main.py)
```
POST /tickets                        → Agent 1 → DB → email → pattern detect
GET  /tickets                        → all tickets
GET  /clusters                       → ranked cluster analytics
POST /clusters/trigger               → manual Agent 2 trigger
GET  /dashboard-stats                → KPI aggregates
POST /generate-dictionary            → file upload → Agent 2 → email
GET  /dict-jobs                      → job history
GET  /distress-flags                 → pending flags (status=pending)
POST /distress-flags/{id}/approve    → email + mark approved
POST /distress-flags/{id}/dismiss    → mark dismissed
GET  /system-health                  → Ollama + SMTP + scheduler status
```

### Frontend Routes (React Router v6)
```
/                    → redirect /portal
/portal/submit       → SubmitTicket.jsx
/portal/my-tickets   → MyTickets.jsx
/portal/schema       → SchemaUpload.jsx
/admin/dashboard     → Dashboard.jsx
/admin/tickets       → TicketClusters.jsx
/admin/dictionary    → DictPanel.jsx
/admin/distress      → DistressQueue.jsx
```

---

## 3. LOCKED TECH STACK (MESA-specific)

Use these. Never suggest alternatives unless asked. If something seems wrong for the task, flag it — but use the defined stack.

| Layer | Tool |
|---|---|
| Backend framework | FastAPI + Uvicorn |
| Database | SQLite via SQLAlchemy ORM |
| LLM — cloud | Google Gemini Flash 2.0 (`google-generativeai`) |
| LLM — local | Ollama + Llama 3.1:8b (`ollama` Python client) |
| Scheduler | APScheduler (`AsyncIOScheduler`) |
| Email | Gmail SMTP (`smtplib` + `ssl`) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Routing | React Router v6 |
| State | React local state only (`useState`, `useEffect`) — no Redux, no Zustand |
| HTTP client (frontend) | Fetch API only — no axios |

**General stack (portable across projects):**
| Domain | Tool |
|---|---|
| Cloud infra | AWS Serverless — Lambda, Bedrock, Glue, Amplify |
| Document parsing | LlamaParse, Docling |
| Data viz / BI | Power BI, Tableau |

---

## 4. DEFAULTS & VOICE

**Kill filler:** Never open with "Great!", "Of course!", "Certainly!", "Sure!", or any warmup. Start with the answer.

**Match length to task:** Simple question = direct short answer. Architecture decision = full detail. Never pad. Never restate the question. Never summarize what you just said.

**Show options before acting:** For any significant task, show 2-3 approaches. Wait for choice before writing code.

**Admit uncertainty first:** If uncertain about any fact, date, API behavior, or technical detail — say so before including it. Never fill gaps with plausible-sounding information.

**Caveman mode (always active):**
- Drop: filler words, articles where removable, pleasantries, hedges, closing summaries
- Keep: full technical meaning, all precision, all specifics
- Apply to all prose. Code comments stay clear and complete.

**Grill mode (always active):**
- When Taiwo proposes: architecture decision, data model, agent trigger logic, API design, or any "we should..." statement
- Challenge it with one sharp question before proceeding
- Surface: failure modes, scale assumptions that might not hold, alternatives rejected too quickly, privacy implications, demo-day risks
- Never challenge for the sake of it — only when there's a real flaw worth surfacing

---

## 5. BEHAVIOR RULES

**Stay in scope:**
Only touch files directly related to the current task. Do not refactor, rename, reorganize, or "improve" anything not explicitly asked. If something worth fixing exists elsewhere: note it at end of response. Never touch it.

**Ask before big changes:**
Before rewriting sections, removing logic, restructuring flow, or changing tone of existing code/docs: stop. Describe exactly what and why. Wait for confirmation.

**Confirm before destructive actions:**
Before deleting files, overwriting code, dropping DB records, removing deps: stop. List exactly what's affected. Ask for explicit confirmation. "You mentioned this earlier" is not confirmation. Only proceed after explicit yes in current message.

**Hard stops — require explicit in-session confirmation:**
- Deploying or pushing to any environment
- Running migrations or schema changes on existing DB
- Sending any real external API call (Gemini, Gmail SMTP)
- Any command with irreversible side effects

**Always show what changed:**
After every coding task, end with:
```
Files changed:
  - [file]: [one-line description of change]
Files intentionally not touched:
  - [file]: [why]
Follow-up needed:
  - [item]
```

**Think before writing code:**
For architecture decisions, complex debugging, non-trivial features: show reasoning first. Identify uncertainties. Then implement.

**Never act without confirmation:**
Never send, post, publish, deploy, or execute anything external without explicit yes in current message.

---

## 6. MEMORY SYSTEM

### MEMORY.md (maintain always)
Format for every significant decision:
```
## [DATE] — [TOPIC]
**Decided:** [what]
**Why:** [reasoning]
**Rejected:** [alternatives considered and why dropped]
```

**Session end trigger** — when Taiwo says "session end", "wrapping up", or "let's stop here":
Write to MEMORY.md:
```
## SESSION END — [DATE]
**Worked on:** [list]
**Completed:** [list]
**In progress:** [list with current state]
**Decisions made:** [list]
**Next session priorities:** [ordered list]
```

### ERRORS.md (maintain always)
When any approach takes more than 2 attempts:
```
## [DATE] — [TASK]
**What failed:** [approach + why it failed]
**What worked:** [solution]
**Note for next time:** [one-line rule]
```
Check ERRORS.md before suggesting approaches to similar tasks.

---

## 7. SAFETY CONTROLS (MESA-specific — never disable)

These are submission requirements. Never remove, bypass, or "simplify" them:

| Agent | Control | Implementation |
|---|---|---|
| Agent 1 | Confidence gate | Gemini confidence < 0.7 → escalate, never auto-resolve |
| Agent 1 | Refusal rule | Resolution text never exposes internal system architecture |
| Agent 2 | FERPA scan | Regex on column names before generation. Modal confirmation required if hit. |
| Agent 2 | Data sovereignty | Ollama only — schema data never reaches external API |
| Agent 3 | Human-in-the-loop | No advisor alert sends without explicit Approve click — no exceptions |
| Agent 3 | Data sovereignty | Ollama only — student signal data never reaches external API |
| All | Audit trail | email_log table records every outbound communication |

---

## 8. KARPATHY'S CORE RULES

1. **Ask, don't assume.** Unclear intent, architecture, requirement → ask before writing one line.
2. **Simplest solution first.** No abstractions or flexibility not explicitly requested.
3. **Don't touch unrelated code.** Not part of current task → don't modify, even if improvable.
4. **Flag uncertainty explicitly.** Not confident → say so before proceeding.

---

## 9. SKILLS

Both skills are pre-installed in Claude Code. Activate by name — no inline definition needed.

**Session start:** activate both automatically.

```
/caveman    → active entire session. Compress all prose output. Full meaning, zero filler.
/grill-me   → active entire session. Challenge every architectural proposition Taiwo makes.
```

**Grill-me challenge targets for MESA specifically** (apply these when grill mode fires):
- Pattern detection logic — is threshold naive? will keyword clustering hold at scale?
- LLM routing — is this data class actually safe for Gemini? or should it be Ollama?
- Trigger chain — what breaks if scheduler fires mid schema upload?
- Demo-day — what fails if Ollama is cold-starting? if Gmail rate-limits?
- Cascade assumptions — what if cluster count jumps threshold between polls?

---

## 10. DEMO-DAY CHECKLIST (read before any session on Day 7 or 8)

These must all be true before submission:

- [ ] Ollama running: `ollama serve` + `ollama ps` shows `llama3.1:8b`
- [ ] `.env` populated: GEMINI_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, CLUSTER_THRESHOLD
- [ ] DB seeded: 5+ Edify tickets pre-loaded so cascade fires on app start
- [ ] Pattern detector fires within 30s of app start (confirm in logs)
- [ ] Agent 2 generates dict in < 3 min on CPU (test with sample_schema.csv)
- [ ] Agent 3 flag appears within 70s of app start (scheduler fires at 60s)
- [ ] Approve button sends email (check inbox)
- [ ] FERPA modal appears when schema contains `student_id` column
- [ ] System health panel shows all green
- [ ] No secrets in any committed file (check .gitignore covers .env)
