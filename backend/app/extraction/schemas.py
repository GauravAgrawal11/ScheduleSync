"""
Member B: Extraction Schemas
Defines structured activity events extracted from unstructured site reports.
"""

from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field
from app.models.enums import DisciplineEnum


class ExtractedEvent(BaseModel):
    """
    Structured activity event extracted from raw progress report.
    Crucial: Does NOT decide baseline schedule match (owned by Member C).
    """
    activity_description: str = Field(
        ..., description="Description of physical work performed on site"
    )
    line_number: Optional[str] = Field(
        None, description="Piping line number or equipment reference (e.g. Line 24, SP-045, C-7, F-12)"
    )
    discipline: Optional[DisciplineEnum] = Field(
        None, description="Engineering discipline (civil, piping, electrical, instrumentation, hse, other)"
    )
    location: Optional[str] = Field(
        None, description="Physical site area or battery limit (e.g. Unit 3, Tank Farm, Substation)"
    )
    status: str = Field(
        "in_progress", description="Execution status: started, in_progress, completed"
    )
    event_date: date = Field(
        default_factory=date.today, description="Date work was executed on site"
    )
    confidence_extraction: float = Field(
        0.95, description="LLM's internal confidence in entity extraction (0.0 to 1.0)"
    )


class ExtractionResult(BaseModel):
    raw_text: str
    events: List[ExtractedEvent]
    extraction_method: str = "rule_plus_llm"
