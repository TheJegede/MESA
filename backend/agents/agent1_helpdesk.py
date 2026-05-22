import json
import re
import google.generativeai as genai
from backend.config import GEMINI_API_KEY

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
  "topic": "short cluster topic phrase",
  "error_type": "short snake_case error type"
}
Rules:
- Tier 1 = resolvable without human intervention. Tier 2 = needs IT staff.
- If confidence < 0.7, set auto_resolved=false and tier=2 regardless.
- Never expose internal system architecture in the resolution field.
- resolution must be actionable plain English for the end user."""


def classify_ticket(text: str) -> dict:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(
            "gemini-2.0-flash-exp",
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(f"Ticket: {text}")
        raw = response.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        result = json.loads(raw)
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
