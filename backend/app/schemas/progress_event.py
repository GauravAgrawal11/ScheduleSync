from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import EventTypeEnum


class ProgressEventCreateScaffold(BaseModel):
    """
    Schema scaffold for Member C: Accepted progress event writing back to schedule.
    """
    activity_id: int = Field(..., description="Target Activity ID updated in baseline schedule", examples=[42])
    source_report_id: int = Field(..., description="Source Report ID backing this event", examples=[10])
    event_type: EventTypeEnum = Field(..., description="Event type ('start' or 'finish')", examples=["finish"])
    actual_start: Optional[date] = Field(default=None, description="Actual start date", examples=["2026-03-02"])
    actual_finish: Optional[date] = Field(default=None, description="Actual finish date", examples=["2026-03-14"])
    status: str = Field(..., description="Updated activity status ('IN_PROGRESS', 'COMPLETED')", examples=["COMPLETED"])
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score backing this decision", examples=[0.94])


class ProgressEventApproval(BaseModel):
    """
    Schema for planner approval action (Hero Approval Screen).
    """
    approved: bool = Field(..., description="True if planner confirms match, False if rejected")
    note: Optional[str] = Field(default=None, description="Optional planner audit remarks", examples=["Verified on site"])


class ProgressEventResponse(ProgressEventCreateScaffold):
    """
    Schema for Member C: Persisted progress event response.
    """
    id: int = Field(..., description="Unique Progress Event ID", examples=[501])
    approved_by: Optional[int] = Field(default=None, description="User ID of approving planner")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)
