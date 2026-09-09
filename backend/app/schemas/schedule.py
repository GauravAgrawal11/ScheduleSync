from typing import List, Optional
from pydantic import BaseModel, Field


class ScheduleImportResponse(BaseModel):
    project_id: int = Field(..., description="ID of the project imported into", examples=[1])
    imported_count: int = Field(..., description="Number of activities successfully parsed and saved", examples=[35])
    source_type: str = Field(..., description="Import source type ('xer' or 'excel')", examples=["excel"])
    sample_activity_ids: List[str] = Field(
        default_factory=list,
        description="Sample activity IDs imported",
        examples=[["PIP-L6-001", "PIP-L6-002", "CIV-L5-010"]],
    )
    message: str = Field(..., description="Status summary message")


class ScheduleImportError(BaseModel):
    row: Optional[int] = Field(default=None, description="Spreadsheet row index where validation failed")
    activity_id: Optional[str] = Field(default=None, description="Activity code if identified")
    error: str = Field(..., description="Detailed description of the issue")
