import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
try:
    CLUSTER_THRESHOLD = int(os.getenv("CLUSTER_THRESHOLD", "5"))
except ValueError:
    CLUSTER_THRESHOLD = 5
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
ADVISOR_EMAIL = os.getenv("ADVISOR_EMAIL", "advisor@mines.edu")
IT_TEAM_EMAIL = os.getenv("IT_TEAM_EMAIL", "")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
MOCK_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_data")
