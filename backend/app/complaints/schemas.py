from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ComplaintCreate(BaseModel):
    project_id: int = Field(1, description="ID of project")
    activity_id: Optional[str] = Field(None, description="Optional activity_id string (e.g. 'L6-PIP-104') or integer ID")
    category: str = Field(..., description="Category: material_delay, equipment_breakdown, manpower_shortage, access_blocked, safety_concern, weather, other")
    description: str = Field(..., min_length=5, max_length=2000, description="Detailed description of blocker")


class ComplaintResponse(BaseModel):
    id: int
    project_id: int
    activity_id: Optional[int] = None
    activity_code: Optional[str] = None
    activity_name: Optional[str] = None
    supervisor_id: int
    supervisor_name: str
    supervisor_email: str
    category: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolved_by_name: Optional[str] = None


class ComplaintStatusActionResponse(BaseModel):
    id: int
    status: str
    message: str
    resolved_at: Optional[datetime] = None
    resolved_by_name: Optional[str] = None
