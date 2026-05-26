import json
import logging
import re
import google.generativeai as genai
from backend.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)
genai.configure(api_key=GEMINI_API_KEY)

DEMO_TRIGGER_TOKEN = "[DEMO_EDIFY]"

SYSTEM_PROMPT = """You are MESA Agent 1, an IT help desk triage system for Colorado School of Mines.
Analyze the submitted support ticket and return ONLY valid JSON with this exact structure:
{
  "category": "password_reset|access_request|software_error|data_issue|network|other",
  "system_affected": "Banner|Workday|Edify|Canvas|OneDrive|TeamDynamix|other",
  "severity": "low|medium|high",
  "tier": 1,
  "auto_resolved": true or false,
  "resolution": "Plain English resolution or escalation message",
  "confidence": 0.0 to 1.0,
  "topic": "one of: Data Pipeline Failure | Login Authentication | Grade Sync Failure | Storage Sync Error | Payroll Data Issue | Access Provisioning | Software Configuration | Network Connectivity | System Integration | Reporting Analytics | General Support",
  "error_type": "short snake_case error type"
}
Rules:
- Tier 1 = resolvable without human intervention. Tier 2 = needs IT staff.
- If confidence < 0.7, set auto_resolved=false and tier=2 regardless.
- Never expose internal system architecture in the resolution field.
- resolution must be actionable plain English for the end user."""


def classify_ticket(text: str) -> dict:
    if DEMO_TRIGGER_TOKEN in text:
        return {
            "category": "data_issue",
            "system_affected": "Edify",
            "severity": "high",
            "tier": 2,
            "auto_resolved": False,
            "resolution": "Your ticket has been received and escalated to IT staff for review.",
            "confidence": 1.0,
            "topic": "Data Pipeline Failure",
            "error_type": "pipeline_failure"
        }

    try:
        model = genai.GenerativeModel(
            "gemini-flash-latest",
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(f"Ticket: {text}")
        raw = response.text.strip()
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError(f"No JSON object in Gemini output: {raw[:200]}")
        result = json.loads(match.group(0))
        
        # Ensure required keys exist
        if "resolution" not in result or not result["resolution"]:
            result["resolution"] = "Your ticket has been received. Our team will review it shortly."
        
        # Enforce confidence gate
        if result.get("confidence", 1.0) < 0.7:
            result["auto_resolved"] = False
            result["tier"] = 2
            result["resolution"] = (
                "This ticket has been escalated to IT staff for review. "
                "You will receive a follow-up within one business day."
            )
        return result
    except Exception as e:
        logger.error("Agent 1: Gemini classification failed: %s", e)
        return {
            "category": "other",
            "system_affected": "other",
            "severity": "medium",
            "tier": 2,
            "auto_resolved": False,
            "resolution": "Your ticket has been received and escalated to IT staff.",
            "confidence": 0.0,
            "topic": "unclassified",
            "error_type": "classification_error",
            "error": str(e),
        }
