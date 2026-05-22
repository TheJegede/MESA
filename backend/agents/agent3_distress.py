import json
import os
import re
import datetime
import ollama
from sqlalchemy.orm import Session
from backend.database import DistressFlag
from backend.config import OUTPUTS_DIR, MOCK_DATA_DIR

SYSTEM_PROMPT = """You are MESA Agent 3, a student academic distress detection system for Colorado School of Mines.
You will receive a JSON object with student engagement signals. Assess distress risk.
Return ONLY valid JSON with this structure:
{
  "student_id": "from input",
  "risk_score": 0 to 100,
  "risk_level": "low|medium|high|critical",
  "risk_factors": ["list of specific observed signals"],
  "recommended_action": "Specific advisor action in plain English",
  "flag_for_review": true or false
}
Flag for review if risk_score >= 70.
Be specific in risk_factors — cite exact signals (e.g. "No Canvas logins in 9 days", "3 missing assignments").
Never include personally identifying information beyond the student_id provided."""


def scan_students(db: Session) -> list:
    signals_path = os.path.join(MOCK_DATA_DIR, "canvas_signals.json")
    with open(signals_path, encoding="utf-8") as f:
        students = json.load(f)

    flags_created = []

    for student in students:
        student_id = student["student_id"]
        existing = db.query(DistressFlag).filter_by(
            student_id=student_id, status="pending"
        ).first()
        if existing:
            continue

        prompt = f"Assess this student's distress risk: {json.dumps(student)}"
        try:
            response = ollama.chat(
                model="llama3.1:8b",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            raw = response.message.content.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            result = json.loads(raw)
        except Exception:
            continue

        if not result.get("flag_for_review"):
            continue

        os.makedirs(OUTPUTS_DIR, exist_ok=True)
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(OUTPUTS_DIR, f"risk_{student_id}_{timestamp}.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)

        flag = DistressFlag(
            student_id=student_id,
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            risk_factors=json.dumps(result["risk_factors"]),
            recommended_action=result["recommended_action"],
            report_path=report_path,
            status="pending",
        )
        db.add(flag)
        flags_created.append(student_id)

    db.commit()
    return flags_created
