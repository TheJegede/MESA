**MESA**

Mines Enterprise Support & Advising Agent

Full Architecture & Implementation Plan

*AI Solutions Architect Interview Assignment*

Colorado School of Mines  •  Due May 29, 2026

| Three-Agent AI Ecosystem 🔵 Agent 1: IT Help Desk Triage  →  🟠 Agent 2: Edify Data Dictionary  →  🟢 Agent 3: Student Distress Early Warning |
| ----- |

| SECTION 1 — PROJECT OVERVIEW |
| :---- |

## **System Summary**

| Project Name | MESA — Mines Enterprise Support & Advising Agent |
| :---- | :---- |
| **Submission Due** | Friday, May 29, 2026 — 5:00 PM MT |
| **Target Institution** | Colorado School of Mines |
| **Stack** | Python (FastAPI) \+ React (Vite \+ Tailwind) \+ SQLite |
| **LLMs** | Gemini Flash 2.0 (Agent 1\) \+ Ollama Llama 3.1 8B (Agents 2 & 3\) |
| **Cost** | $0 — all free-tier or open-source tools |
| **Agents** | 3 agents, 6 total automations |
| **Interfaces** | /portal (user-facing) \+ /admin (staff-facing dashboard) |

## **Problem Statement**

Colorado School of Mines faces a $12M structural deficit caused by federal IDC rate cuts (from 52% to 15%), making headcount expansion impossible. Three compounding operational problems emerge simultaneously:

* **IT Help Desk overwhelmed during Banner SaaS \+ TeamDynamix migrations with no staff to hire**

* Tier 1 tickets (password resets, access requests, known errors) consume analyst time that should go to complex work

* Pattern detection is manual — nobody systematically identifies when 15 tickets signal a systemic project need

* **Edify data warehouse requires manual data dictionary creation across 6 platforms (Banner, Workday, Canvas, Slate)**

* Without a dictionary, Tableau dashboards can't be built — analytics are blocked

* Zero data analysts can be hired; existing staff are at capacity

* **Student retention risk goes undetected until advisors are manually contacted**

* 93% retention rate is a flagship metric — early warning systems protect it

* Canvas/LMS signals exist but no automated monitoring layer processes them

## **Users**

| User | Interface | Primary Actions |
| :---- | :---- | :---- |
| IT Staff / Help Desk Analyst | /admin | View tickets, monitor clusters, trigger Agent 2 |
| Faculty / Data Analyst | /portal → /schema | Upload schema files for dictionary generation |
| Academic Advisor | /admin → Distress Queue | Review student flags, approve/dismiss alerts |
| Students / General Staff | /portal → /submit | Submit support tickets, view own ticket status |
| PMO (Craig Dougherty) | /admin → Dashboard | Monitor KPIs, cluster analytics, system health |

## **Success Metrics**

| Metric | Target | How Measured |
| :---- | :---- | :---- |
| Tier 1 Auto-Resolution Rate | \> 60% | auto\_resolved \= true / total tickets |
| Avg Ticket Resolution Time | \< 2 min (vs hours) | resolved\_at \- created\_at in DB |
| Data Dictionary Generation Time | \< 3 min per schema | job\_completed\_at \- job\_started\_at |
| Student Distress Flag Accuracy | \< 20% false positive rate | Advisor dismiss rate over time |
| Pattern Detection Threshold | Configurable (default: 5\) | cluster\_count \>= threshold triggers Agent 2 |
| Email Delivery Success Rate | \> 99% | SMTP delivery confirmation logged |

| SECTION 2 — FULL ARCHITECTURE |
| :---- |

## **Component Map**

| Layer | Component | Tool / Technology | Notes |
| :---- | :---- | :---- | :---- |
| Frontend | User Portal (/portal) | React \+ Vite \+ Tailwind | Ticket submit, status, schema upload |
| Frontend | Admin Dashboard (/admin) | React \+ Vite \+ Tailwind | KPIs, clusters, artifacts, distress queue |
| API | Backend Server | Python FastAPI \+ Uvicorn | All routes, agent orchestration |
| LLM (Cloud) | Agent 1 — Triage | Google Gemini Flash 2.0 | Low-sensitivity ticket classification |
| LLM (Local) | Agents 2 & 3 | Ollama \+ Llama 3.1 8B | Schema \+ student data — FERPA-safe |
| Database | Persistence Layer | SQLite (local file) | Tickets, clusters, flags, artifact log |
| Scheduler | Agent 3 Polling | APScheduler (Python) | Runs distress scan every 60s in demo |
| Email | Notification Service | Gmail SMTP (app password) | Resolution emails, alerts, artifacts |
| File Output | Artifact Storage | Local filesystem /outputs/ | Generated dicts, risk reports |
| Mock Data | Synthetic Dataset | JSON / CSV files | 50 tickets, 10 students, sample schema |

## **Architecture Diagram (Text)**

| REACT FRONTEND ┌─────────────────────┬─────────────────────────────────────┐ │  /portal (Users)    │  /admin (IT Staff \+ Advisors)       │ │  \- Submit ticket    │  Dashboard: KPIs \+ Cluster Charts   │ │  \- My ticket status │  Tickets \+ Pattern Analytics        │ │  \- Schema upload    │  Dict Panel \+ Distress Approval Queue│ └──────────┬──────────┴──────────────────────┬────────────┘            │          HTTP REST API           │              ┌──────────▼─────────────────────────▼────────────┐ │             FASTAPI BACKEND                     │ │  POST /tickets → Agent1 → tag → pattern detect  │ │  GET  /clusters → ranked cluster analytics      │ │  POST /generate-dict → Agent2 → artifact        │ │  GET/POST /distress-flags → Agent3 \+ approval   │ │  GET  /system-health → Ollama \+ SMTP \+ scheduler│ └──────┬──────────────────┬──────────────┬────────┘        │                  │              │          ┌──────▼──────┐  ┌────▼──────────┐  ┌───▼──────┐ │ GEMINI FLASH│  │ OLLAMA LOCAL  │  │  SQLITE  │ │  (Cloud API)│  │ Llama 3.1 8B  │  │  tickets │ │  Agent 1    │  │ Agents 2 & 3  │  │  clusters│ │  Low-sens.  │  │ On-device     │  │  flags   │ │  ticket text│  │ FERPA-safe    │  │  jobs    │ └─────────────┘  └───────┬───────┘  └──────────┘                          │  /outputs/ artifacts                        ┌──────▼──────────────────────┐                   │   Gmail SMTP Email Service  │                   │   Resolutions \+ Alerts      │                   └─────────────────────────────┘ |
| :---- |

## **Data Flow — Cascade Trigger Chain**

| Step | Trigger | Action | Output |
| :---- | :---- | :---- | :---- |
| 1 | User submits ticket via /portal | Agent 1 classifies \+ tags ticket | Ticket saved to DB \+ resolution email sent |
| 2 | Pattern detector runs after each ticket | Count tickets by topic cluster | Cluster table updated \+ threshold checked |
| 3 | Cluster count \>= threshold (default 5\) | Admin notified, Panel 2 activates in dashboard | Agent 2 trigger flag set in DB |
| 4 | Faculty uploads schema file via /portal | Agent 2 generates data dictionary | Dict artifact saved \+ email sent to dept |
| 5 | APScheduler fires every 60s | Agent 3 scans canvas\_signals.json | Risk scores computed, flags written to DB |
| 6 | Advisor clicks Approve in distress queue | Email alert sent to advisor \+ report generated | Flag marked approved, artifact logged |

## **Database Schema**

| Table | Key Fields | Purpose |
| :---- | :---- | :---- |
| tickets | id, text, category, system\_affected, severity, auto\_resolved, resolution, created\_at | All submitted support tickets |
| ticket\_tags | id, ticket\_id, topic, system, error\_type | Structured tags extracted by Agent 1 for clustering |
| clusters | id, topic, system, count, last\_seen, threshold\_hit, agent2\_triggered | Aggregated cluster analytics |
| dict\_jobs | id, filename, status, artifact\_path, triggered\_by\_cluster, created\_at | Agent 2 job history \+ artifact log |
| distress\_flags | id, student\_id, risk\_score, risk\_factors, report\_path, status, reviewed\_at | Agent 3 flags pending advisor review |
| email\_log | id, to\_addr, subject, sent\_at, success, error\_msg | All outbound email audit trail |

## **Full Repo Structure**

| mesa/ ├── backend/ │   ├── main.py                   \# FastAPI app entry, all route definitions │   ├── database.py               \# SQLAlchemy models, SQLite init, seed loader │   ├── config.py                 \# env vars, thresholds, model names │   ├── agents/ │   │   ├── agent1\_helpdesk.py    \# Gemini Flash: classify, tag, resolve/escalate │   │   ├── agent2\_dictionary.py  \# Ollama Llama 3.1: schema → data dict artifact │   │   └── agent3\_distress.py    \# Ollama Llama 3.1: score students, gen report │   ├── services/ │   │   ├── email\_service.py      \# Gmail SMTP: send\_email(), attach\_file() │   │   ├── pattern\_detector.py   \# cluster analytics, threshold eval, trigger logic │   │   └── scheduler.py          \# APScheduler: Agent 3 polling job │   ├── mock\_data/ │   │   ├── tickets\_seed.json     \# 50 synthetic tickets across 5 topic clusters │   │   ├── canvas\_signals.json   \# 10 mock students with LMS engagement signals │   │   └── sample\_schema.csv     \# Mock Edify schema: 20 columns across 3 tables │   ├── outputs/                  \# Generated artifacts (dicts, reports) │   ├── .env.example              \# Required env vars — no secrets committed │   └── requirements.txt ├── frontend/ │   ├── src/ │   │   ├── App.jsx               \# React Router: / → /portal, /admin │   │   ├── portal/ │   │   │   ├── SubmitTicket.jsx  \# Ticket submission form │   │   │   ├── MyTickets.jsx     \# User's own ticket history \+ status │   │   │   └── SchemaUpload.jsx  \# File upload for Agent 2 (faculty) │   │   ├── admin/ │   │   │   ├── Dashboard.jsx     \# KPI cards \+ cluster bars \+ system health │   │   │   ├── TicketClusters.jsx\# Ranked cluster table \+ threshold control │   │   │   ├── DictPanel.jsx     \# Agent 2 status \+ artifact download history │   │   │   └── DistressQueue.jsx \# Agent 3 flags \+ approve/dismiss buttons │   │   └── api/ │   │       └── mesa.js           \# All fetch() calls to FastAPI │   ├── index.html │   ├── vite.config.js │   └── package.json └── docs/     ├── architecture\_diagram.png  \# Exported from Excalidraw     ├── MESA\_Submission.docx      \# Final deliverable     └── README.md                 \# How to run locally |
| :---- |

| SECTION 3 — AGENT SPECIFICATIONS |
| :---- |

| 🔵 AGENT 1 — IT Help Desk Triage |
| :---- |

| Property | Value |
| :---- | :---- |
| LLM | Google Gemini Flash 2.0 (API) |
| Input | Free-text ticket submission (user types their problem) |
| Automation 1 | Ticket record written to SQLite DB with full classification tags |
| Automation 2 | Resolution or escalation email sent via Gmail SMTP |
| Safety Control | Confidence check: if Gemini confidence \< 0.7 → escalate, never auto-resolve |
| Pattern Role | After each ticket saved, pattern\_detector runs → updates cluster counts |
| Trigger Output | If cluster count \>= threshold → sets agent2\_triggered \= true on cluster row |

**Agent 1 — System Prompt (paste into agent1\_helpdesk.py)**

| You are MESA Agent 1, an IT help desk triage system for Colorado School of Mines. Analyze the submitted support ticket and return ONLY valid JSON with this exact structure: {   "category": "password\_reset|access\_request|software\_error|data\_issue|network|other",   "system\_affected": "Banner|Workday|Edify|Canvas|OneDrive|TeamDynamix|other",   "severity": "low|medium|high",   "tier": 1 or 2,   "auto\_resolved": true or false,   "resolution": "Plain English resolution or escalation message",   "confidence": 0.0 to 1.0 } Rules: Tier 1 \= resolvable without human. Tier 2 \= needs IT staff. If confidence \< 0.7, set auto\_resolved=false and escalate regardless of tier. Never expose internal system details in the resolution field. |
| :---- |

**Agent 1 — Pattern Detector Logic**

In pattern\_detector.py — runs after every ticket insert:

* Query: SELECT system\_affected, COUNT(\*) FROM ticket\_tags GROUP BY system\_affected ORDER BY COUNT DESC

* If any cluster count \>= threshold (from config.py, default 5\) AND agent2\_triggered \= false

* Update clusters table: set threshold\_hit=true, agent2\_triggered=true

* Return trigger event to main.py — frontend Dashboard polls /clusters every 10s

* Admin sees cluster bars update in real time — can manually lower threshold and force trigger

| 🟠 AGENT 2 — Edify Data Dictionary Generator |
| :---- |

| Property | Value |
| :---- | :---- |
| LLM | Ollama Llama 3.1 8B (local — on-device inference) |
| Input | CSV or JSON schema file uploaded by faculty/analyst via /portal/schema |
| Triggered By | Agent 1 pattern detector OR manual admin trigger from dashboard |
| Automation 1 | Structured data dictionary artifact generated \+ saved to /outputs/ as CSV \+ JSON |
| Automation 2 | Email sent to department with artifact attached |
| Safety Control | FERPA scan: if column names match (SSN|DOB|student\_id|grade|enrollment) → flag as sensitive, show confirmation modal before generating |
| Privacy | Ollama runs fully local — no schema data leaves the machine |

**Agent 2 — System Prompt (paste into agent2\_dictionary.py)**

| You are MESA Agent 2, a data dictionary generator for Colorado School of Mines Edify data warehouse. You will receive a database schema as CSV or JSON. For each field/column, generate a data dictionary entry. Return ONLY a JSON array with this structure per field: \[{   "field\_name": "exact column name",   "data\_type": "string|integer|float|date|boolean|id",   "description": "Plain English description of what this field contains",   "source\_system": "Banner|Workday|Canvas|Slate|Edify|unknown",   "sensitivity": "public|internal|restricted|ferpa\_protected",   "example\_value": "realistic example value (never real PII)" }\] Mark sensitivity=ferpa\_protected for any field related to: grades, enrollment, student ID, DOB, SSN, financial aid. |
| :---- |

| 🟢 AGENT 3 — Student Distress Early Warning |
| :---- |

| Property | Value |
| :---- | :---- |
| LLM | Ollama Llama 3.1 8B (local — on-device inference) |
| Input | canvas\_signals.json — mock LMS data: login\_days\_last\_2\_weeks, avg\_grade, assignments\_missing, advisor\_note |
| Schedule | APScheduler: every 60 seconds in demo mode (simulates nightly scan in production) |
| Automation 1 | Structured student risk report artifact generated as JSON \+ PDF summary |
| Automation 2 | Advisor alert email sent ONLY after human approval in dashboard |
| Safety Control | Human-in-the-loop gate: ALL alerts require advisor Approve before email sends — system never contacts students directly |
| Privacy | Ollama runs fully local — student signal data never sent to external API |

**Agent 3 — System Prompt (paste into agent3\_distress.py)**

| You are MESA Agent 3, a student academic distress detection system for Colorado School of Mines. You will receive a JSON object with student engagement signals. Assess distress risk. Return ONLY valid JSON with this structure: {   "student\_id": "from input",   "risk\_score": 0 to 100,   "risk\_level": "low|medium|high|critical",   "risk\_factors": \["list of specific observed signals"\],   "recommended\_action": "Specific advisor action in plain English",   "flag\_for\_review": true or false } Flag for review if risk\_score \>= 70\. Be specific in risk\_factors — cite exact signals (e.g. "No Canvas logins in 9 days", "3 missing assignments"). Never include personally identifying information beyond the student\_id provided. |
| :---- |

| SECTION 4 — DAY-BY-DAY IMPLEMENTATION PLAN |
| :---- |

*Each task row includes a Claude Code / Codex prompt hint. Copy the hint, paste into Claude Code with the file path, and it will generate the implementation. The 'Prompt Hint' column is the starting instruction — always add context from this document when prompting.*

| DAY 1  — May 21 — TODAY *GOAL: Repo scaffolded. DB running. Ollama installed. React renders 3-panel layout.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Create full repo directory structure as specified in Section 2 | *Create this folder structure for a FastAPI \+ React project: \[paste repo tree\]* |
| ☐ | Install Ollama → pull llama3.1:8b model (takes \~5GB download) | *How do I install Ollama on Windows and pull llama3.1:8b?* |
| ☐ | Write requirements.txt and pip install all backend deps | *Create requirements.txt with: fastapi, uvicorn, sqlalchemy, apscheduler, google-generativeai, ollama, python-dotenv, aiofiles* |
| ☐ | Write database.py — all 6 tables with SQLAlchemy ORM models | *Write database.py with SQLAlchemy models for tables: tickets, ticket\_tags, clusters, dict\_jobs, distress\_flags, email\_log. Use SQLite. Include init\_db() and get\_db() functions.* |
| ☐ | Write main.py skeleton — all routes stubbed returning mock JSON | *Write FastAPI main.py with stubbed routes: POST /tickets, GET /clusters, POST /generate-dictionary, GET /distress-flags, POST /distress-flags/{id}/approve, GET /system-health* |
| ☐ | Seed DB with 50 synthetic tickets across 5 clusters via tickets\_seed.json | *Write tickets\_seed.json with 50 realistic IT support tickets for a university. Include clusters: Edify (15 tickets), Banner (12), OneDrive (8), Canvas (9), Workday (6). Vary wording significantly within each cluster.* |
| ☐ | Bootstrap React with Vite \+ install Tailwind \+ React Router | *Set up React app with Vite, Tailwind CSS, and React Router. Create routes: /portal and /admin* |
| ☐ | Build App.jsx with nav bar linking /portal and /admin | *Build App.jsx with a top navbar showing MESA branding in Mines blue (\#002868), with links to Portal and Admin. Use Tailwind.* |

*Files touched: database.py, main.py, requirements.txt, tickets\_seed.json, App.jsx, vite.config.js*

| DAY 2  — May 22 *GOAL: Agent 1 working end-to-end. Ticket submits → AI classifies → email sends → pattern fires.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Write .env.example with all required variables (no real values) | *Create .env.example with: GEMINI\_API\_KEY, GMAIL\_USER, GMAIL\_APP\_PASSWORD, CLUSTER\_THRESHOLD, OLLAMA\_BASE\_URL* |
| ☐ | Write config.py loading all env vars with sensible defaults | *Write config.py using python-dotenv. Load all vars from .env. CLUSTER\_THRESHOLD default=5.* |
| ☐ | Write agent1\_helpdesk.py — Gemini Flash call with system prompt from Section 3 | *Write agent1\_helpdesk.py using google-generativeai. Call gemini-2.0-flash-exp with the system prompt \[paste from doc\]. Parse JSON response. Return typed dict. Handle confidence \< 0.7 escalation.* |
| ☐ | Write email\_service.py — Gmail SMTP with send\_email() and send\_with\_attachment() | *Write email\_service.py using smtplib \+ ssl. Functions: send\_email(to, subject, body) and send\_with\_attachment(to, subject, body, filepath). Load credentials from config.* |
| ☐ | Write pattern\_detector.py — cluster analytics \+ threshold trigger logic | *Write pattern\_detector.py. Function: run\_pattern\_detection(db). Query ticket\_tags, group by system\_affected, count per group. Update clusters table. If count \>= threshold and not already triggered, set threshold\_hit=True, agent2\_triggered=True. Return list of triggered clusters.* |
| ☐ | Wire POST /tickets route in main.py — save → Agent 1 → email → pattern detect | *Wire the POST /tickets route in main.py. Steps: 1\) Save ticket to DB, 2\) Call agent1\_helpdesk.classify(text), 3\) Save tags to ticket\_tags, 4\) Send email via email\_service, 5\) Run pattern\_detector, 6\) Return full result.* |
| ☐ | Build HelpDeskPanel.jsx — ticket form \+ live ticket feed with badges | *Build HelpDeskPanel.jsx in React with Tailwind. Include: text area for ticket submission, submit button, ticket feed list below showing category badge, severity badge, auto\_resolved badge, and resolution text.* |

*Files touched: agent1\_helpdesk.py, email\_service.py, pattern\_detector.py, main.py (updated), HelpDeskPanel.jsx, .env.example, config.py*

| DAY 3  — May 23 *GOAL: Agent 2 working. Schema upload → Llama generates dictionary → artifact saved → email sent.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Write canvas\_signals.json — 10 synthetic students with varied LMS engagement data | *Write canvas\_signals.json with 10 student objects. Fields: student\_id, login\_days\_last\_2\_weeks (0-14), avg\_grade (0-100), assignments\_missing (0-10), last\_login\_days\_ago (0-30), advisor\_note (string or null). Include 3 high-risk students (score should be \>70).* |
| ☐ | Write sample\_schema.csv — mock Edify schema with 20 columns across 3 tables | *Write sample\_schema.csv with columns: table\_name, field\_name, data\_type, nullable, is\_pk, is\_fk. Include tables: student\_enrollment, course\_grades, financial\_aid. 20 rows total. Include some FERPA-sensitive fields.* |
| ☐ | Write agent2\_dictionary.py — Ollama call, FERPA scan, artifact generation | *Write agent2\_dictionary.py. Function: generate\_dictionary(filepath). 1\) Read CSV/JSON schema file, 2\) Run FERPA regex scan on column names, 3\) If sensitive columns found return {ferpa\_flag: true, sensitive\_fields:\[\]}. 4\) Otherwise call Ollama llama3.1:8b with system prompt \[paste from doc\], 5\) Parse JSON array response, 6\) Save as CSV to /outputs/dict\_{timestamp}.csv, 7\) Return {artifact\_path, entry\_count, ferpa\_fields}.* |
| ☐ | Wire POST /generate-dictionary route — file upload → Agent 2 → email | *Wire POST /generate-dictionary in main.py as a file upload endpoint using FastAPI UploadFile. Save file to temp, call agent2\_dictionary.generate\_dictionary(), send email with attachment, log to dict\_jobs table, return result.* |
| ☐ | Build SchemaUpload.jsx — file upload zone, FERPA warning modal, status display | *Build SchemaUpload.jsx with Tailwind. Include: drag-drop file upload zone (accept .csv, .json), upload progress state, FERPA warning modal (shown if ferpa\_flag=true asking for confirmation), results table showing generated dictionary entries.* |
| ☐ | Build DictPanel.jsx — shows waiting state, activates on cluster trigger, artifact history | *Build DictPanel.jsx. Default state: 'Waiting for pattern trigger...' badge. When /clusters returns agent2\_triggered=true: show activated state with link to /portal/schema. Show artifact history table fetched from GET /dict-jobs.* |

*Files touched: agent2\_dictionary.py, canvas\_signals.json, sample\_schema.csv, main.py (updated), SchemaUpload.jsx, DictPanel.jsx*

| DAY 4  — May 24 *GOAL: Agent 3 working. Scheduler fires → Llama scans → flags appear → advisor approves → email sends.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Write agent3\_distress.py — Ollama call per student, risk scoring, report generation | *Write agent3\_distress.py. Function: scan\_students(). Load canvas\_signals.json. For each student call Ollama with system prompt \[paste from doc\]. Collect flags where flag\_for\_review=True. For each flag: generate JSON risk report saved to /outputs/risk\_{student\_id}\_{timestamp}.json. Return list of flag objects.* |
| ☐ | Write scheduler.py — APScheduler job running agent3 every 60s | *Write scheduler.py using APScheduler AsyncIOScheduler. Register one job: run agent3\_distress.scan\_students() every 60 seconds. On each run, write new flags to distress\_flags table where student not already flagged with status=pending. Start scheduler on FastAPI startup event.* |
| ☐ | Wire GET /distress-flags route — return pending flags with risk data | *Wire GET /distress-flags in main.py. Return all distress\_flags where status=pending, ordered by risk\_score DESC. Include: student\_id, risk\_score, risk\_level, risk\_factors, recommended\_action, report\_path, created\_at.* |
| ☐ | Wire POST /distress-flags/{id}/approve — send email \+ mark approved | *Wire POST /distress-flags/{id}/approve. 1\) Fetch flag from DB, 2\) Send advisor alert email with risk\_factors and recommended\_action, 3\) Update flag status=approved, reviewed\_at=now(), 4\) Log to email\_log, 5\) Return success.* |
| ☐ | Wire POST /distress-flags/{id}/dismiss — mark dismissed, no email | *Wire POST /distress-flags/{id}/dismiss. Update flag status=dismissed, reviewed\_at=now(). Return success. No email sent.* |
| ☐ | Build DistressQueue.jsx — live flag list polling every 10s, approve/dismiss buttons | *Build DistressQueue.jsx with Tailwind. Poll GET /distress-flags every 10 seconds. Show each flag as a card: student\_id, risk\_score (color coded: red=critical, orange=high), risk\_factors as bullet list, recommended\_action, Approve (green) and Dismiss (gray) buttons. On approve: POST and show success toast.* |

*Files touched: agent3\_distress.py, scheduler.py, main.py (updated), DistressQueue.jsx*

| DAY 5  — May 25 *GOAL: Admin dashboard built. All panels integrated. Full cascade tested end-to-end.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Wire GET /system-health route — check Ollama, SMTP, scheduler status | *Wire GET /system-health in main.py. Check: 1\) Ollama reachable (try ollama.list()), 2\) Gmail SMTP connectable (try socket connect to smtp.gmail.com:587), 3\) APScheduler running (scheduler.running). Return JSON with each component status \+ timestamp.* |
| ☐ | Wire GET /dashboard-stats route — KPI aggregates for admin dashboard | *Wire GET /dashboard-stats in main.py. Return: tickets\_today (count), auto\_resolution\_rate (percent), dict\_jobs\_run (count this week), students\_flagged (count this week), top\_clusters (top 5 by count with threshold\_hit bool).* |
| ☐ | Build Dashboard.jsx — KPI cards \+ cluster bar chart \+ system health panel | *Build Dashboard.jsx with Tailwind. Include: 4 KPI stat cards at top (tickets today, auto-res rate, dict jobs, students flagged), horizontal bar chart of top clusters (pure CSS bars, no library needed), system health row showing Ollama/SMTP/Scheduler status as colored dots.* |
| ☐ | Build TicketClusters.jsx — ranked cluster table with configurable threshold slider | *Build TicketClusters.jsx. Show table of clusters sorted by count DESC. Each row: topic, system\_affected, count, progress bar, threshold\_hit badge. Include threshold slider (1-20) that POSTs to /config/threshold. Trigger button on threshold\_hit rows to manually activate Agent 2\.* |
| ☐ | Full end-to-end cascade test — seed DB, submit tickets, watch cluster fire, upload schema, check distress queue | *Help me write a test script test\_cascade.py that: 1\) POSTs 5 Edify tickets to /tickets, 2\) Polls /clusters until agent2\_triggered=True, 3\) POSTs sample\_schema.csv to /generate-dictionary, 4\) Waits 70s for scheduler, 5\) GETs /distress-flags and asserts at least one flag exists.* |
| ☐ | Add loading spinners \+ toast notifications to all React panels | *Add loading states (Tailwind animate-spin spinner) to all fetch calls in HelpDeskPanel, DictPanel, DistressQueue. Add toast notification component (top-right, auto-dismiss 3s) for: ticket submitted, email sent, dict generated, flag approved.* |

*Files touched: Dashboard.jsx, TicketClusters.jsx, main.py (updated), test\_cascade.py, all panel components (loading \+ toast)*

| DAY 6  — May 26 *GOAL: Safety controls hardened. Architecture diagram drawn. All error states handled.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Harden Agent 1 confidence check — test with ambiguous ticket submissions | *Test agent1\_helpdesk.py with 5 ambiguous ticket texts. Verify that confidence \< 0.7 always sets auto\_resolved=False. Log confidence values to console for review.* |
| ☐ | Harden Agent 2 FERPA scan — test with schema containing sensitive column names | *Test agent2\_dictionary.py FERPA scan with a schema containing: ssn, date\_of\_birth, student\_id, gpa, financial\_aid\_amount. Verify ferpa\_flag=True is returned and modal triggers in frontend before generation proceeds.* |
| ☐ | Add graceful error handling — Ollama offline, Gmail auth fail, bad file upload | *Add try/except error handling to: agent2\_dictionary.py (Ollama connection refused → return {error: 'Local model unavailable'}), email\_service.py (auth fail → log to email\_log with error\_msg), POST /generate-dictionary (invalid file type → 400 response with clear message).* |
| ☐ | Draw architecture diagram in Excalidraw — export as PNG to docs/ | *Open excalidraw.com. Draw boxes for: React Frontend (2 sub-boxes: Portal, Admin), FastAPI Backend, Gemini Flash (cloud, dashed border), Ollama Local (solid border), SQLite DB, Gmail SMTP. Add labeled arrows for data flow. Mark privacy boundary between cloud and local.* |
| ☐ | Write README.md — local setup instructions for Claude Code / evaluators | *Write README.md for MESA. Include: Prerequisites (Python 3.11+, Node 18+, Ollama), Setup steps (clone, pip install, npm install, ollama pull llama3.1:8b, cp .env.example .env, fill in keys), Run commands (uvicorn \+ npm run dev), Demo walkthrough (5 steps to trigger full cascade).* |

*Files touched: agent1\_helpdesk.py (hardened), agent2\_dictionary.py (hardened), email\_service.py (hardened), docs/architecture\_diagram.png, README.md*

| DAY 7  — May 27 *GOAL: Word doc submission written. All 7 narrative sections complete. Architecture section done.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Write Narrative Section 1 — What MESA does (plain language, no jargon) | *Write a 2-paragraph plain-English description of MESA for a mixed technical/non-technical audience. Describe the three agents, what triggers each, and what they produce. Avoid acronyms.* |
| ☐ | Write Narrative Section 2 — Problem it solves \+ why it matters (tie to $12M deficit) | *Write a paragraph connecting MESA to Colorado School of Mines' $12M structural deficit, headcount freeze, and the three specific operational bottlenecks it addresses.* |
| ☐ | Write Narrative Sections 3-4 — Users \+ Success Metrics (use tables from this doc) | *Draft narrative text for users section and success metrics section. Reference the KPIs: auto-resolution rate, dict generation time, distress flag accuracy, cluster detection threshold.* |
| ☐ | Write Narrative Sections 5-7 — Limitations, Monitoring, Next Level | *Write known limitations (CPU inference speed, naive clustering, no auth, mock data only), monitoring needs (AI decision logging, false positive tracking, email delivery confirmation), and next-level improvements (TDX API, embedding-based clustering, Canvas live API, GPU inference, Entra ID SSO).* |
| ☐ | Write Architecture Section — paste diagram, fill component table, describe error handling | *Write the architecture section of the submission doc. Describe: tools used (with privacy rationale for Ollama vs Gemini split), data sources (mock JSON/CSV with production equivalents noted), where automation happens (6 automations listed), error handling (confidence checks, FERPA gate, graceful Ollama fallback).* |
| ☐ | Assemble final MESA\_Submission.docx — format, proofread, add diagram | *Help me format a Word document with: cover page, two-column narrative, architecture diagram embedded, tables using Mines blue (\#002868) header rows. Check all 7 narrative points from the assignment brief are covered.* |

*Files touched: docs/MESA\_Submission.docx*

| DAY 8  — May 28 — BUFFER *GOAL: Full demo rehearsal. Submit one day early.* |
| :---- |

| ✓ | Task | Claude Code / Codex Prompt Hint |
| :---- | :---- | :---- |
| ☐ | Full demo run-through from scratch — fresh DB, full cascade in under 5 minutes | *Help me write a demo\_script.md with step-by-step demo instructions: what to click, what to say, what the evaluator should see at each step.* |
| ☐ | Record demo video (optional but impressive) — screen record full cascade | *What's the best free screen recording tool on Windows for a 5-minute demo with audio?* |
| ☐ | Final proofread of submission doc — check all 7 narrative points covered | *Review this draft submission doc against these requirements: \[paste assignment brief\]. Flag any gaps.* |
| ☐ | Email submission to hiring team — both Word doc \+ GitHub repo link | *Draft a brief, professional email submitting the MESA assignment. Mention: one-day early submission, link to repo, invite questions about architectural decisions.* |

*Files touched: demo\_script.md, final MESA\_Submission.docx, submission email*

| SECTION 5 — RISK REGISTER & SAFETY CONTROLS |
| :---- |

## **Risk Register**

| Risk | Likelihood | Impact | Mitigation |
| :---- | :---- | :---- | :---- |
| Ollama slow on CPU inference | High | Low | Use 8B not 70B. Demo with short schema. Acceptable latency (5-15s) for prototype. |
| Gmail SMTP blocked by Google | Medium | High | Enable 2FA first, generate App Password (not main password). Test Day 1\. |
| Agent 2 trigger unclear in demo | Medium | Medium | Pre-seed 5 Edify tickets in DB on app start. Trigger fires immediately on load. |
| Gemini API quota exceeded | Low | High | Gemini Flash free tier: 1500 req/day. More than enough. Monitor in Google AI Studio. |
| React \+ FastAPI CORS issues | Medium | Medium | Add FastAPI CORSMiddleware on Day 1\. Set allow\_origins=\['http://localhost:5173'\]. |
| Ollama not available on evaluator's machine | High | Low | Prototype only — document clearly. Show pre-recorded output if needed. |
| Word doc deliverable takes too long | Low | High | Draft narrative text on Day 6 in parallel with safety work. Never leave to Day 8\. |

## **Safety Controls Summary**

| Agent | Control Type | Implementation | Assignment Criterion Met |
| :---- | :---- | :---- | :---- |
| Agent 1 | Confidence check | If Gemini confidence \< 0.7 → escalate, never auto-resolve | Validation / guardrails |
| Agent 1 | Refusal rule | Never expose internal system details in resolution text | Refusal rules for sensitive requests |
| Agent 2 | FERPA scan | Regex match on column names before generation. Confirmation modal required. | Human-in-the-loop for risky actions |
| Agent 2 | Data sovereignty | Ollama local inference — schema data never leaves machine | Grounding / data privacy |
| Agent 3 | Human-in-the-loop | ALL advisor alerts require explicit Approve — system never auto-contacts students | Human-in-the-loop for risky actions |
| Agent 3 | Data sovereignty | Ollama local inference — student signal data never sent to external API | Grounding / data privacy |
| All | Audit trail | email\_log table records every outbound communication | Monitoring |

## **Privacy Architecture Rationale**

The architectural split between Gemini Flash (external) and Ollama (local) is a deliberate, documented design decision — not a convenience choice:

* Agent 1 processes free-text ticket descriptions submitted by staff. This data is operationally sensitive but does not contain regulated PII. External API use is justified by speed and quality.

* Agent 2 processes database schema files that mirror real institutional data structures (Banner, Workday, Canvas). Even synthetic schemas reveal system architecture. Local inference ensures zero data exfiltration.

* Agent 3 processes student engagement signals that would constitute FERPA-protected educational records in production. Local inference is not optional — it is the only compliant architecture for this data class.

*In a production deployment, all three agents would migrate to locally-hosted inference on institutional servers, with Microsoft Entra ID (already deployed at Mines) providing role-based access control to the MESA dashboard.*

**MESA — Mines Enterprise Support & Advising Agent**

Architecture & Implementation Plan  •  AI Solutions Architect Interview Assignment  •  Colorado School of Mines