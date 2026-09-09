from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    name: str = Field(..., description="Project name", examples=["Numaligarh Refinery Expansion - Unit 3"])
    client: str = Field(..., description="Client name", examples=["Oil India Limited"])
    start_date: date = Field(..., description="Project baseline start date", examples=["2026-01-01"])
    end_date: date = Field(..., description="Project baseline finish date", examples=["2026-12-31"])


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int = Field(..., description="Unique Project ID", examples=[1])
    created_at: datetime = Field(..., description="Timestamp of project creation in system")
    activity_count: Optional[int] = Field(
        default=0, description="Total count of WBS activities loaded for this project"
    )
    status: Optional[str] = Field(
        default="RUNNING", description="Project execution state: RUNNING, COMPLETED, ARCHIVED"
    )

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    total: int = Field(..., description="Total number of projects", examples=[1])
    projects: List[ProjectResponse] = Field(..., description="List of projects")
