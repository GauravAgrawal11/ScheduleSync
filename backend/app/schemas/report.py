from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import SourceTypeEnum


class ReportCreateScaffold(BaseModel):
    """
    Schema scaffold for Member B: Daily report submission payload.
    """
    project_id: int = Field(..., description="Project ID this report belongs to", examples=[1])
    file_name: str = Field(..., description="Original filename", examples=["daily_site_report_2026_03_05.pdf"])
    source_type: SourceTypeEnum = Field(
        ...,
        description="Source format (pdf, xlsx, text, scan, voice)",
        examples=["pdf"],
    )
    raw_text: Optional[str] = Field(
        default=None,
        description="Raw extracted or transcribed text from document/audio",
        examples=["Piping crew completed spool erection for Line 24 in Unit 3."],
    )


class ReportResponse(BaseModel):
    """
    Schema for Member B: Stored report metadata response.
    """
    id: int = Field(..., description="Unique Report ID", examples=[10])
    project_id: int = Field(..., description="Project ID")
    file_name: str = Field(..., description="Original file name")
    source_type: SourceTypeEnum = Field(..., description="Source format")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    uploaded_by: Optional[int] = Field(default=None, description="User ID of uploader")
    raw_text: Optional[str] = Field(default=None, description="Extracted raw text")

    model_config = ConfigDict(from_attributes=True)
