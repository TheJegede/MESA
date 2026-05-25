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

SYSTEM_PROMPT = """You are MESA Agent 2, a data dictionary and impact analysis generator for Mines Mines Edify data warehouse.
You will receive a database schema as CSV or JSON and a list of structural changes (added/removed columns).

TASKS:
1. Generate a data dictionary JSON array for every field.
2. Generate a 'System Change Note' in Markdown that explains the impact of the structural changes.
   - If a column was removed, explain what might break.
   - If a column was added, explain its utility.
   - Be specific to higher-ed context (e.g., student IDs, registration, payroll).

Return ONLY a JSON object with this structure:
{{
  "dictionary": [{{
    "field_name": "exact column name",
    "data_type": "string|integer|float|date|boolean|id",
    "description": "Plain English description",
    "source_system": "Banner|Workday|Canvas|Slate|Edify|unknown",
    "sensitivity": "public|internal|restricted|ferpa_protected",
    "example_value": "realistic example value"
  }}],
  "change_note": "Markdown formatted impact analysis"
}}"""


def _scan_for_ferpa(columns: list) -> list:
    return [col for col in columns if FERPA_PATTERN.search(col)]


def get_schema_columns(filepath: str) -> list:
    ext = os.path.splitext(filepath)[1].lower()
    try:
        if ext == ".csv":
            with open(filepath, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                return list(reader.fieldnames or [])
        elif ext == ".json":
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list) and data:
                return list(data[0].keys())
    except Exception:
        pass
    return []


def scan_schema_for_ferpa(filepath: str) -> dict:
    """Scan only — no Ollama call. Used by the async route handler for the sync FERPA check."""
    columns = get_schema_columns(filepath)
    if not columns:
        return {"ferpa_flag": True, "sensitive_fields": []}  # Default to safety if unreadable
    ferpa_fields = _scan_for_ferpa(columns)
    if ferpa_fields:
        return {"ferpa_flag": True, "sensitive_fields": ferpa_fields}
    return {"ferpa_flag": False}


def generate_dictionary_confirmed(filepath: str, baseline_columns: list[str] = None) -> dict:
    """Call after FERPA confirmation — skips the FERPA check."""
    ext = os.path.splitext(filepath)[1].lower()
    try:
        new_columns = get_schema_columns(filepath)
        if not new_columns:
            return {"error": "Could not extract columns from file."}

        # Optimized: Read only header + first 5 rows for context
        sample_data = []
        if ext == ".csv":
            with open(filepath, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    sample_data.append(row)
                    if i >= 4: break
            schema_text = f"HEADERS: {new_columns}\nSAMPLE DATA (5 ROWS):\n{json.dumps(sample_data, indent=2)}"
        elif ext == ".json":
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            sample = data[:5] if isinstance(data, list) else data
            schema_text = f"JSON SCHEMA/SAMPLE:\n{json.dumps(sample, indent=2)}"
        else:
            return {"error": f"Unsupported file type: {ext}"}

        # Calculate deltas - Handle None baseline safely
        safe_baseline = baseline_columns or []
        added = [c for c in new_columns if c not in safe_baseline]
        removed = [c for c in safe_baseline if c not in new_columns]

        delta_summary = ""
        if baseline_columns:
            delta_summary = f"ADDED COLUMNS: {added}\nREMOVED COLUMNS: {removed}"
        else:
            delta_summary = "No baseline provided. This is the INITIAL schema for this system. Establish descriptions for all fields."

        result = _call_ollama_and_save(schema_text, delta_summary, filepath)
        result["has_removals"] = len(removed) > 0
        return result
    except Exception as e:
        return {"error": f"Local model error: {str(e)}"}


def _call_ollama_and_save(schema_text: str, delta_summary: str, source_path: str) -> dict:
    prompt = f"SCHEMA DATA:\n{schema_text}\n\nSTRUCTURAL CHANGES:\n{delta_summary}"
    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    raw = response['message']['content']
    # extract first {...} block
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError(f"No JSON object found in model output: {raw[:200]}")

    result = json.loads(match.group(0))
    entries = result.get("dictionary", [])
    change_note = result.get("change_note", "No impact analysis generated.")

    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    base = os.path.splitext(os.path.basename(source_path))[0]
    out_path = os.path.join(OUTPUTS_DIR, f"dict_{base}_{timestamp}.csv")

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["field_name", "data_type", "description", "source_system", "sensitivity", "example_value"], extrasaction="ignore")
        writer.writeheader()
        writer.writerows(entries)

    return {
        "artifact_path": out_path,
        "entry_count": len(entries),
        "change_note": change_note,
        "ferpa_flag": False
    }
