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


def generate_dictionary(filepath: str) -> dict:
    ext = os.path.splitext(filepath)[1].lower()
    columns = []

    try:
        if ext == ".csv":
            with open(filepath, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    field_name = row.get("field_name") or row.get("column_name") or list(row.values())[0]
                    columns.append(field_name)
            schema_text = open(filepath, encoding="utf-8").read()
        elif ext == ".json":
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                columns = [item.get("field_name", str(item)) for item in data]
            schema_text = json.dumps(data, indent=2)
        else:
            return {"error": f"Unsupported file type: {ext}"}

        ferpa_fields = scan_for_ferpa(columns)
        if ferpa_fields:
            return {
                "ferpa_flag": True,
                "sensitive_fields": ferpa_fields,
                "message": "FERPA-sensitive columns detected. Confirm before generating.",
            }

        return _call_ollama_and_save(schema_text, filepath)

    except Exception as e:
        return {"error": f"Local model unavailable or file error: {str(e)}"}


def generate_dictionary_confirmed(filepath: str) -> dict:
    """Call after FERPA confirmation — skips the FERPA check."""
    ext = os.path.splitext(filepath)[1].lower()
    try:
        if ext == ".csv":
            schema_text = open(filepath, encoding="utf-8").read()
        elif ext == ".json":
            schema_text = json.dumps(json.load(open(filepath, encoding="utf-8")), indent=2)
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
    raw = response.message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    entries = json.loads(raw)

    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    base = os.path.splitext(os.path.basename(source_path))[0]
    out_path = os.path.join(OUTPUTS_DIR, f"dict_{base}_{timestamp}.csv")

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["field_name", "data_type", "description", "source_system", "sensitivity", "example_value"])
        writer.writeheader()
        writer.writerows(entries)

    return {"artifact_path": out_path, "entry_count": len(entries), "ferpa_flag": False}
