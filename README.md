# MESA — Mines Enterprise Support & Advising Agent

MESA is an AI-driven operations platform for the Colorado School of Mines. It integrates multi-modal AI agents to streamline IT support, manage institutional data dictionaries, and provide early warning signals for student academic distress.

## 🌟 Key Features

-   **Agent 1: IT Help Desk Triage (Gemini 2.0 Flash):** Automatically classifies, prioritizes, and attempts to resolve IT tickets using an institutional knowledge base.
-   **Agent 2: Edify Data Dictionary (Local Llama 3.1):** Generates comprehensive data dictionaries from schema uploads with built-in FERPA sensitivity detection.
-   **Agent 3: Student Distress Early Warning (Local Llama 3.1):** Scans student engagement signals (Canvas, attendance) to identify and flag students at risk of academic failure.
-   **Agent 4: Conversational Support:** Provides a threaded chat interface for ticket resolution with automated escalation to IT staff when necessary.
-   **Pattern Detection:** Automatically clusters similar tickets to identify systemic issues and notify IT leadership.
-   **RAG (Retrieval-Augmented Generation):** Uses vector embeddings to provide agents with up-to-date institutional context from markdown documents.

## 🏗️ System Architecture

-   **Backend:** FastAPI (Python 3.11+) with SQLAlchemy and SQLite.
-   **Frontend:** React 18 (Vite) with TailwindCSS and React Router.
-   **AI Engine:** 
    -   **Cloud:** Google Gemini API for general triage and conversation.
    -   **Local:** Ollama (Llama 3.1:8b) for processing sensitive institutional data (FERPA/Student Records).
-   **Database:** SQLite managed by Alembic for migrations.
-   **Automation:** APScheduler for background distress sweeps and ticket auto-resolution.

## 🛡️ AI Safety & Privacy

MESA is designed with a "Local First" approach for sensitive data:
-   **FERPA Protection:** Data schemas are scanned locally for sensitive patterns before any processing.
-   **Private Inference:** Student distress signals and data schemas are processed using **local Ollama instances**. No PII from these modules is sent to external cloud APIs.
-   **Confidence Gating:** Agent 1 will automatically escalate any ticket where its resolution confidence falls below 70%.

## 🚀 Getting Started

### Prerequisites

-   **Python 3.11+**
-   **Node.js 18+**
-   **Ollama:** [Download Ollama](https://ollama.com/) and run `ollama pull llama3.1:8b`.
-   **Google AI Studio Key:** Required for Gemini Flash 2.0.

### Installation

1.  **Clone & Backend Setup:**
    ```bash
    pip install -r requirements.txt
    cp .env.example .env
    # Configure your .env (see Required Environment Variables)
    ```

2.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    ```

### Required Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=        # Google AI Studio API Key
GMAIL_USER=            # Gmail address for SMTP alerts
GMAIL_APP_PASSWORD=    # Gmail App Password
ADVISOR_EMAIL=         # Inbox for student distress alerts
IT_TEAM_EMAIL=         # Inbox for IT escalation/cluster alerts
CLUSTER_THRESHOLD=5    # Number of similar tickets to trigger a cluster alert
OLLAMA_BASE_URL=http://localhost:11434
```

### Running the Application

1.  **Start Ollama:**
    ```bash
    ollama serve
    ```

2.  **Start Backend (Terminal 1):**
    ```bash
    uvicorn backend.main:app --reload --port 8010
    ```

3.  **Start Frontend (Terminal 2):**
    ```bash
    cd frontend && npm run dev
    ```

## 📖 API Documentation

Once the backend is running, you can access the interactive API docs at:
-   **Swagger UI:** [http://localhost:8010/docs](http://localhost:8010/docs)
-   **ReDoc:** [http://localhost:8010/redoc](http://localhost:8010/redoc)

## 🧪 Testing

Run the backend test suite using pytest:
```bash
pytest
```

## 🛠️ Troubleshooting

-   **Ollama Connection:** Ensure `ollama serve` is running if Agent 2 or 3 fails to respond.
-   **Database Migrations:** If you encounter schema errors, run `alembic upgrade head`. After the very first start, run `alembic stamp head`.
-   **RAG Index:** If the knowledge base isn't being used, delete `kb_index.json` to force a re-index on the next startup.
-   **SMTP Errors:** If emails aren't sending, verify that your Gmail account has "App Passwords" enabled and the credentials in `.env` are correct.
