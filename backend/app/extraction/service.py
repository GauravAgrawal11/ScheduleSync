"""
Member B: Entity Extraction Service
Combines deterministic regex/pattern matching with LLM function-calling to transform
unstructured report text into validated ExtractedEvent Pydantic objects.
"""

import re
import os
import json
import logging
from datetime import date, datetime
from typing import List, Optional
from app.models.enums import DisciplineEnum
from app.extraction.schemas import ExtractedEvent

logger = logging.getLogger(__name__)

# Deterministic pattern dictionaries
DISCIPLINE_KEYWORDS = {
    DisciplineEnum.PIPING: [
        "pipe", "piping", "spool", "weld", "flange", "hydrotest", "line",
        "fit-up", "tie-in", "valve", "joint", "bolt-up", "gasket", "cladding",
        "insulation", "manifold", "header"
    ],
    DisciplineEnum.CIVIL: [
        "excavation", "excavate", "concrete", "pcc", "rcc", "footing",
        "plinth", "trench", "trenching", "backfill", "rebar", "shuttering", "brickwork",
        "foundation", "earthmat", "boundary wall", "masonry", "grouting",
        "baseplate", "dyke", "containment", "paving", "asphalt", "road"
    ],
    DisciplineEnum.ELECTRICAL: [
        "cable", "pulling", "tray", "termination", "substation", "switchgear",
        "11kv", "transformer", "earthing", "lighting", "mcc", "junction box",
        "gantry", "stress cones", "feeder", "mast"
    ],
    DisciplineEnum.INSTRUMENTATION: [
        "sensor", "transmitter", "cable gland", "plc", "dcs", "instrument",
        "impulse line", "calibration", "loop check", "tubing", "radar", "gauge"
    ],
    DisciplineEnum.HSE: [
        "safety", "barricade", "ppe", "bush cutting", "clearance", "fire", "permit",
        "hydrant", "deluge"
    ],
}

LOCATION_KEYWORDS = [
    "Unit 1", "Unit 3", "Pipe Rack A", "Tank Farm", "Substation", "Pipeline Corridor",
    "MCC Building", "Compressor Plinth", "Boundary Wall", "Security Fence",
    "Area B", "Area A", "Control Room", "Switchyard", "Admin"
]

LINE_PATTERNS = [
    r"\bLine\s*[-#]?\s*(\d+[A-Za-z0-9\-_]*)",
    r"\bLine\s+(\d+)",
    r"\b(SP-\d+[A-Za-z0-9\-_]*)",
    r"\b(C-\d+)\b",
    r"\b(F-\d+)\b",
    r"\b(W-\d+)\b",
    r"\b(P-\d+)\b",
    r"\b(CT-\d+)\b",
    r"\b(TK-\d+)\b",
    r"\b(TR-\d+)\b",
    r"\b(CV-\d+)\b",
    r"\b(PT-\d+)\b",
    r"\b11\s*kV\b",
]


def extract_events_from_text(raw_text: str, default_date: Optional[date] = None) -> List[ExtractedEvent]:
    """
    Extract structured activity events from raw text:
    1. Primary: Uses Google Gemini LLM (gemini-3.6-flash) for high-accuracy contextual extraction
    2. Fallback: Uses fast deterministic regex/pattern matching if Gemini is unavailable or rate-limited
    3. Validates every event strictly against ExtractedEvent schema
    """
    if not raw_text or not raw_text.strip():
        return []

    base_date = default_date or date.today()
    gemini_key = os.getenv("GEMINI_API_KEY")

    # Tier 1: Try Gemini LLM extraction first
    if gemini_key:
        try:
            llm_events = _call_gemini_full_extraction(raw_text, base_date, gemini_key)
            if llm_events:
                logger.info(f"Successfully extracted {len(llm_events)} events via Google Gemini LLM.")
                return llm_events
        except Exception as e:
            logger.warning(f"Google Gemini LLM extraction failed, falling back to deterministic patterns: {e}")

    # Tier 2: Deterministic pattern matching fallback
    return _extract_pattern_events(raw_text, base_date)


def _call_gemini_full_extraction(raw_text: str, base_date: date, api_key: str) -> List[ExtractedEvent]:
    """
    Call Google Gemini to extract all discrete progress updates from the text in a single structured call.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    prompt = f"""
    You are an expert on-site engineering entity extractor for Oil India and infrastructure projects.
    Given the following field progress report, extract every discrete physical activity or task into a JSON array.

    Field Report Text:
    \"\"\"{raw_text}\"\"\"

    Reference Date: {base_date.isoformat()}

    For each discrete activity, extract:
    - "activity_description": Clear description of the physical work performed (e.g. "Excavation for Compressor Plinth", "Fit-up and welding of Line SP-001")
    - "line_number": Equipment tag, line number, or spool reference if mentioned (e.g. "SP-001", "Line 24", "C-7", "TK-01"), else null
    - "discipline": One of ["civil", "piping", "electrical", "instrumentation", "hse", "other"]
    - "location": Site area or battery limit (e.g. "Unit 1", "Area B", "Substation", "Tank Farm", "Compressor Plinth"), else null
    - "status": One of ["started", "in_progress", "completed"]
    - "confidence_extraction": Estimated extraction confidence as a float between 0.85 and 0.99

    Return ONLY a valid JSON array of objects.
    """

    models_to_try = [
        os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
    ]
    seen_m = set()
    models_to_try = [m for m in models_to_try if not (m in seen_m or seen_m.add(m))]

    response = None
    for model_candidate in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_candidate,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            if response and response.text:
                break
        except Exception as e:
            logger.warning(f"Gemini extraction with {model_candidate} failed: {e}. Trying next fallback...")
            continue

    if not response or not response.text:
        return []

    data = json.loads(response.text)
    if not isinstance(data, list):
        if isinstance(data, dict):
            data = data.get("events", [data])
        else:
            return []

    valid_disciplines = {d.value: d for d in DisciplineEnum}
    extracted_events: List[ExtractedEvent] = []

    for item in data:
        if not isinstance(item, dict):
            continue
        desc = item.get("activity_description") or item.get("description")
        if not desc or len(str(desc).strip()) < 3:
            continue

        raw_disc = str(item.get("discipline", "")).lower().strip()
        disc_enum = valid_disciplines.get(raw_disc)

        status_str = str(item.get("status", "in_progress")).lower().strip()
        if status_str not in ["started", "in_progress", "completed"]:
            status_str = "in_progress"

        try:
            conf = float(item.get("confidence_extraction", 0.95))
        except (ValueError, TypeError):
            conf = 0.95

        extracted_events.append(
            ExtractedEvent(
                activity_description=str(desc).strip(),
                line_number=item.get("line_number"),
                discipline=disc_enum,
                location=item.get("location"),
                status=status_str,
                event_date=base_date,
                confidence_extraction=min(max(conf, 0.5), 1.0),
            )
        )

    return extracted_events


def _extract_pattern_events(raw_text: str, base_date: date) -> List[ExtractedEvent]:
    """Fallback deterministic pattern extractor when LLM is offline."""
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    events: List[ExtractedEvent] = []

    content_lines = []
    for line in lines:
        if line.startswith("Spreadsheet Columns:") or line.startswith("Date:") or line.startswith("Site:"):
            continue
        content_lines.append(line)

    if not content_lines:
        content_lines = [raw_text.strip()]

    for line in content_lines:
        if len(line) < 6:
            continue
        event = _extract_single_event(line, base_date)
        if event:
            events.append(event)

    if not events:
        single = _extract_single_event(raw_text, base_date)
        if single:
            events.append(single)

    return events


def _extract_single_event(text_chunk: str, event_date: date) -> Optional[ExtractedEvent]:
    """Extract entities for a single sentence or progress row via regex patterns."""
    text_lower = text_chunk.lower()

    # 1. Detect Discipline
    detected_discipline: Optional[DisciplineEnum] = None
    for disc, keywords in DISCIPLINE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            detected_discipline = disc
            break

    # 2. Detect Line / Tag / Component Reference
    detected_ref: Optional[str] = None
    for pattern in LINE_PATTERNS:
        match = re.search(pattern, text_chunk, re.IGNORECASE)
        if match:
            detected_ref = match.group(0)
            break

    # 3. Detect Location
    detected_location: Optional[str] = None
    for loc in LOCATION_KEYWORDS:
        if loc.lower() in text_lower:
            detected_location = loc
            break

    # 4. Detect Status
    status = "in_progress"
    if any(w in text_lower for w in ["completed", "done", "finished", "poured", "erected", "laid"]):
        status = "completed"
    elif any(w in text_lower for w in ["started", "started today", "began", "commenced"]):
        status = "started"

    # Clean description
    desc = text_chunk
    if desc.startswith("Row ") and ": " in desc:
        desc = desc.split(": ", 1)[-1]
    if len(desc) > 250:
        desc = desc[:247] + "..."

    return ExtractedEvent(
        activity_description=desc,
        line_number=detected_ref,
        discipline=detected_discipline,
        location=detected_location,
        status=status,
        event_date=event_date,
        confidence_extraction=0.92,
    )

