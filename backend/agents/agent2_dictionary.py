import csv
import json
import os
import re
import datetime
import ollama
from backend.config import OUTPUTS_DIR

FERPA_PATTERN = re.compile(
    r"\b(ssn|social_security|date_of_birth|dob|student_id|gpa|grade|enrollment|"
    r"financial_aid|tuition|scholarship|fafsa|disability|medical|diagnos|transcript)\b",
    re.IGNORECASE,
)

SYSTEM_PROMPT = """You are MESA Agent 2, a data dictionary generator for Colorado School of Mines Edify data warehouse.
You will receive a database schema as CSV or JSON. For each field/column, generate a data dictionary entry.
Return ONLY a JSON array with this structure per field:
[{
  "field_name": "exact column name",
  "data_type": "string|integer|float|date|boolean|id",
  "description": "Plain English description of what this field contains",
  "source_system": "Banner|Workday|Canvas|Slate|Edify|unknown",
  "sensitivity": "public|internal|restricted|ferpa_protected",
  "example_value": "realistic example value (never real PII)"
}]
Mark sensitivity=ferpa_protected for: grades, enrollment, student ID, DOB, SSN, financial aid."""


def scan_for_ferpa(columns: list) -> list:
    return [col for col in columns if FERPA_PATTERN.search(col)]


def scan_schema_for_ferpa(filepath: str) -> dict:
    """Scan only — no Ollama call. Used by the async route handler for the sync FERPA check."""
    ext = os.path.splitext(filepath)[1].lower()
    columns = []
    try:
        if ext == ".csv":
            with open(filepath, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                columns = list(reader.fieldnames or [])
        elif ext == ".json":
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list) and data:
                first = data[0]
                if isinstance(first, dict):
                    columns = list(first.keys())
    except Exception:
        return {"ferpa_flag": True, "sensitive_fields": []}
    ferpa_fields = scan_for_ferpa(columns)
    if ferpa_fields:
        return {"ferpa_flag": True, "sensitive_fields": ferpa_fields}
    return {"ferpa_flag": False}


def generate_dictionary_confirmed(filepath: str) -> dict:
    """Call after FERPA confirmation — skips the FERPA check."""
    ext = os.path.splitext(filepath)[1].lower()
    try:
        if ext == ".csv":
            with open(filepath, encoding="utf-8") as f:
                schema_text = f.read()
        elif ext == ".json":
            with open(filepath, encoding="utf-8") as f:
                schema_text = json.dumps(json.load(f), indent=2)
        else:
            return {"error": f"Unsupported file type: {ext}"}
        return _call_ollama_and_save(schema_text, filepath)
    except Exception as e:
        return {"error": f"Local model unavailable or file error: {str(e)}"}


def _call_ollama_and_save(schema_text: str, source_path: str) -> dict:
    prompt = f"Generate a data dictionary for this schema:\n\n{schema_text}"
    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    raw = response['message']['content']
    # extract first [...] block — model may prepend preamble or wrap in code fences
    match = re.search(r"\[[\s\S]*\]", raw)
    if not match:
        raise ValueError(f"No JSON array found in model output: {raw[:200]}")
    entries = json.loads(match.group(0))

    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    base = os.path.splitext(os.path.basename(source_path))[0]
    out_path = os.path.join(OUTPUTS_DIR, f"dict_{base}_{timestamp}.csv")

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["field_name", "data_type", "description", "source_system", "sensitivity", "example_value"], extrasaction="ignore")
        writer.writeheader()
        writer.writerows(entries)

    return {"artifact_path": out_path, "entry_count": len(entries), "ferpa_flag": False}
