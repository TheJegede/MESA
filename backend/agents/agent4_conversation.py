import json
import logging
import re
import google.generativeai as genai
from backend.config import GEMINI_API_KEY
from backend.services.rag_service import query_knowledge_base

logger = logging.getLogger(__name__)
genai.configure(api_key=GEMINI_API_KEY)

MAX_HISTORY_TURNS = 8

SYSTEM_PROMPT = """You are MESA Support, an IT help desk assistant for Colorado School of Mines.
You assist students and faculty with IT support issues via a conversation thread.

You have access to knowledge base articles. Use them to give accurate, specific answers.

Rules:
- Give clear, actionable steps. Be concise.
- If the user provides sensitive info (passwords, SSN, full ID), do NOT acknowledge or repeat it. Instead instruct them not to share it.
- Set "escalate" to true ONLY when the user clearly indicates your guidance did not resolve their issue (e.g., "still not working", "tried that, didn't help", "still broken", "nothing worked", "same error", "still happening").
- Do not escalate prematurely — if the user is reporting the problem for the first time, attempt a resolution first.
- If you genuinely cannot resolve the issue with available knowledge, escalate.
- Always respond in JSON with this exact structure: {"response": "...", "escalate": false}
- Never expose internal system names or architecture in responses."""


def generate_thread_response(
    ticket_text: str,
    conversation_history: list[dict],
    user_message: str,
) -> dict:
    """
    Returns {"response": str, "escalate": bool}
    conversation_history: list of {"sender": "user"|"ai"|"staff", "content": str}
    """
    kb_chunks = query_knowledge_base(user_message, n_results=3)
    kb_context = "\n\n---\n\n".join(kb_chunks) if kb_chunks else "No relevant knowledge base articles found."

    history_lines = []
    for msg in conversation_history[-MAX_HISTORY_TURNS:]:
        role = {"user": "USER", "ai": "MESA AI", "staff": "IT STAFF"}.get(msg["sender"], "UNKNOWN")
        history_lines.append(f"{role}: {msg['content']}")
    history_str = "\n".join(history_lines)

    prompt = f"""Original ticket: {ticket_text}

Conversation so far:
{history_str}

New user message: {user_message}

Relevant knowledge base context:
{kb_context}

Respond with JSON only: {{"response": "your response here", "escalate": false}}"""

    try:
        model = genai.GenerativeModel("gemini-flash-latest", system_instruction=SYSTEM_PROMPT)
        raw = model.generate_content(prompt).text.strip()
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError(f"No JSON object in Gemini output: {raw[:200]}")
        result = json.loads(match.group(0))
        return {
            "response": result.get("response", "I was unable to generate a response. Please try again."),
            "escalate": bool(result.get("escalate", False)),
        }
    except Exception as e:
        logger.error("Agent 4: response generation failed: %s", e)
        return {
            "response": "I'm having trouble processing your request right now. Please try again in a moment.",
            "escalate": False,
        }
