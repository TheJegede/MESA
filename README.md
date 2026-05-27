# MESA — Mines Enterprise Support & Advising Agent

MESA is an AI-driven operations platform designed for the **Colorado School of Mines**. It leverages a hybrid cloud/local AI architecture to streamline institutional support, automate data governance, and provide proactive student advising.

---

## 📖 Table of Contents

- [🌟 Project Overview](#-project-overview)
- [🤖 The AI Agents](#-the-ai-agents)
- [🛡️ Privacy & Safety (Local-First)](#️-privacy--safety-local-first)
- [⚙️ Technical Architecture](#️-technical-architecture)
- [🚀 Getting Started](#-getting-started)
- [🛠️ Key Features](#️-key-features)
- [🧪 Testing & Development](#-testing--development)
- [📖 API & Documentation](#-api--documentation)

---

## 🌟 Project Overview

MESA (Mines Enterprise Support & Advising) is more than a chatbot; it's an intelligent coordination layer for university operations. It connects disparate institutional signals—from IT support tickets to student engagement data—into a unified, actionable dashboard.

### Target Audiences:
- **IT Operations:** Automate triage, detect systemic outages (clustering), and keep institutional knowledge up-to-date via RAG.
- **Data Stewards:** Automate the generation of data dictionaries and monitor for "breaking" schema changes in institutional databases.
- **Academic Advisors:** Proactively identify students at risk of academic failure using non-PII engagement signals.

---

## 🤖 The AI Agents

MESA employs a multi-agent system where each agent is specialized for its domain and privacy requirements.

| Agent | Name | Model | Function |
| :--- | :--- | :--- | :--- |
| **Agent 1** | Help Desk Triage | **Gemini 2.0 Flash** | Classifies and prioritizes IT tickets; attempts auto-resolution using Knowledge Base. |
| **Agent 2** | Edify Dictionary | **Local Llama 3.1** | Generates data dictionaries from schema uploads; detects FERPA-sensitive fields. |
| **Agent 3** | Distress Warning | **Local Llama 3.1** | Scans Canvas/engagement signals to flag students at risk of academic distress. |
| **Agent 4** | Conversationalist | **Gemini 2.0 Flash** | Manages interactive support threads with users; escalates to staff when confidence is low. |

---

## 🛡️ Privacy & Safety (Local-First)

MESA is built on a **Security-First** philosophy. Institutional data and Student Records (FERPA) are treated with the highest care:

-   **Private Inference:** All processing of sensitive data (Student Distress signals and database schemas) happens **locally via Ollama**. No PII (Personally Identifiable Information) from these modules is ever sent to cloud APIs.
-   **FERPA Shield:** Agent 2 scans every schema upload for sensitive patterns (SSN, GPA, etc.) and flags them for local processing only.
-   **Confidence Gating:** Agents will automatically escalate to human staff if their internal confidence score for a resolution falls below 70%.
-   **Self-Healing Clusters:** When a systemic issue is detected, Agent 2 can be triggered to perform a "System Audit," automatically resolving related tickets once the underlying data issue is documented.

---

## ⚙️ Technical Architecture

### **Backend (Python 3.11+)**
-   **FastAPI:** High-performance asynchronous API framework.
-   **SQLAlchemy + Alembic:** Robust ORM and database migration management.
-   **RAG Engine:** Custom vector search using **Google Gemini Embeddings** and NumPy for institutional knowledge retrieval.
-   **APScheduler:** Manages background tasks (Distress sweeps, pattern detection, auto-resolution).

### **Frontend (React 18)**
-   **Vite:** Modern, ultra-fast build tool.
-   **TailwindCSS:** Utility-first styling for a clean, Mines-branded UI.
-   **React Router:** SPA navigation for the Portal and Admin Console.

### **Intelligence Layers**
-   **Cloud:** Google Gemini Pro/Flash for high-reasoning tasks.
-   **Local:** Ollama (Llama 3.1:8b) for private data processing.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **Ollama:** [Download Ollama](https://ollama.com/)
    - Pull the required model: `ollama pull llama3.1:8b`
- **Google AI Studio Key:** Get one at [aistudio.google.com](https://aistudio.google.com/)

### Installation

1.  **Clone the Repository**
2.  **Backend Setup:**
    ```bash
    pip install -r requirements.txt
    cp .env.example .env
    # Edit .env with your GEMINI_API_KEY and email settings
    ```
3.  **Database Migration:**
    ```bash
    alembic upgrade head
    ```
4.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    ```

### Running the System

1.  **Start Ollama:** `ollama serve`
2.  **Start Backend:** `uvicorn backend.main:app --reload --port 8010`
3.  **Start Frontend:** `cd frontend && npm run dev`

---

## 🛠️ Key Features

### 1. Pattern Detection & Clustering
MESA continuously scans incoming tickets. If a threshold (default: 5) of similar tickets is reached, it creates a **Cluster**, notifies the IT team via email, and starts a lifecycle tracking event.

### 2. Retrieval-Augmented Generation (RAG)
The system embeds the `backend/knowledge_base/` markdown files on startup. Agent 1 uses this "Institutional Memory" to answer complex Mines-specific questions accurately.

### 3. Student Distress Monitoring
Agent 3 periodically scans `backend/mock_data/canvas_signals.json` (simulating a production SIS/LMS feed). It generates detailed risk reports for students showing engagement drop-offs.

### 4. Data Dictionary Self-Healing
When a cluster is identified as a "Database/Schema" issue, MESA can trigger Agent 2 to process a schema upload. Once processed, MESA can "self-heal" the cluster by auto-resolving all associated tickets with a summary of the fix.

---

## 🧪 Testing & Development

### Backend Tests
The project uses `pytest`. Run all tests with:
```bash
pytest
```

### Knowledge Base Updates
To update the agents' knowledge, simply add `.md` files to `backend/knowledge_base/` and restart the server (or delete `kb_index.json` to force a rebuild).

---

## 📖 API & Documentation

Interactive documentation is available at:
- **Swagger UI:** `http://localhost:8010/docs`
- **ReDoc:** `http://localhost:8010/redoc`

---

*MESA is an internal tool developed for the Colorado School of Mines. Unauthorized use or distribution is prohibited.*
