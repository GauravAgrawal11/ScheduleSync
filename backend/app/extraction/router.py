"""
Member B: Extraction Module.
Uses LLM (Claude/GPT-4o/Gemini) structured JSON tool-calling + spaCy deterministic entity rules
to extract entities: line number, discipline, location, status, date.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/extraction", tags=["Member B: Extraction"])


class ExtractedProgressEvent(BaseModel):
    activity_description: str = Field(..., description="Action summary described in report")
    line_number: Optional[str] = Field(default=None, description="Extracted line/tag number (e.g. Line 24)")
    discipline: Optional[str] = Field(default=None, description="Discipline (e.g. Piping, Civil)")
    location: Optional[str] = Field(default=None, description="Location/Unit")
    status: str = Field(default="COMPLETED", description="Extracted status")
    date: Optional[str] = Field(default=None, description="Extracted event date")


class ExtractionRequest(BaseModel):
    report_id: int
    raw_text: str


@router.post(
    "/extract",
    summary="Extract structured entities from report text (Member B)",
    description="Invokes LLM extraction and spaCy entity recognition on daily report text.",
)
def extract_entities(
    req: ExtractionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Scaffold placeholder for Member B:
    Parse raw_text into structured ExtractedProgressEvent objects.
    """
    return {
        "report_id": req.report_id,
        "extracted_events": [
            {
                "activity_description": "Erect Line 24 Spool Piping",
                "line_number": "24",
                "discipline": "Piping",
                "location": "Unit 3",
                "status": "COMPLETED",
                "date": "2026-03-05",
            }
        ],
    }
