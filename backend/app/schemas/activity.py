from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import DisciplineEnum


class ActivityBase(BaseModel):
    activity_id: str = Field(
        ...,
        description="Schedule Activity Code / Task Code (e.g. PIP-L6-024)",
        examples=["PIP-L6-024"],
    )
    activity_name: str = Field(
        ...,
        description="Activity descriptive title",
        examples=["Erect Line 24 Spool Piping in Unit 3"],
    )
    wbs_code: Optional[str] = Field(
        default=None,
        description="WBS element code (L1..L6 hierarchy)",
        examples=["1.2.3.4.5.6"],
    )
    discipline: Optional[DisciplineEnum] = Field(
        default=None,
        description="Engineering discipline (civil, piping, electrical, instrumentation, hse, other)",
        examples=["piping"],
    )
    location: Optional[str] = Field(
        default=None,
        description="Geographic/unit location on site",
        examples=["Unit 3, Area B"],
    )
    planned_start: Optional[date] = Field(
        default=None, description="Planned early/target start date", examples=["2026-03-01"]
    )
    planned_finish: Optional[date] = Field(
        default=None, description="Planned early/target finish date", examples=["2026-03-15"]
    )
    status: str = Field(
        default="PLANNED",
        description="Current baseline status (PLANNED, IN_PROGRESS, COMPLETED)",
        examples=["PLANNED"],
    )


class ActivityCreate(ActivityBase):
    project_id: int = Field(..., description="Foreign key linking to parent Project ID")
    parent_id: Optional[int] = Field(
        default=None, description="Parent Activity primary key for hierarchical WBS tree"
    )


class ActivityResponse(ActivityBase):
    id: int = Field(..., description="Unique database primary key for activity", examples=[42])
    project_id: int = Field(..., description="Project ID this activity belongs to")
    parent_id: Optional[int] = Field(default=None, description="Parent activity ID")
    created_at: datetime = Field(..., description="Record creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class ActivityListResponse(BaseModel):
    total: int = Field(..., description="Total activities matching query", examples=[120])
    page: int = Field(..., description="Current page number (1-indexed)", examples=[1])
    page_size: int = Field(..., description="Number of records per page", examples=[50])
    total_pages: int = Field(..., description="Total pages available", examples=[3])
    activities: List[ActivityResponse] = Field(..., description="List of activities")
