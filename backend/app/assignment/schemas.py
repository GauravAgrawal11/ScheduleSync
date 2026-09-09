from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field


class OverloadedSupervisorDetail(BaseModel):
    supervisor_id: int
    supervisor_name: str
    discipline: str
    project_week: int
    total_days: float
    capacity_days: float = 6.0
    excess_days: float


class UnassignedActivityDetail(BaseModel):
    activity_id: str
    activity_name: str
    discipline: str
    project_week: int
    reason: str


class AssignmentRunSummary(BaseModel):
    project_id: int
    total_activities: int
    total_assigned: int
    unassigned_no_supervisor: int
    unassigned_activities: List[UnassignedActivityDetail] = []
    overloaded_count: int
    overloaded_supervisors: List[OverloadedSupervisorDetail] = []
    weekly_capacity_days: float = 6.0


class ReassignRequest(BaseModel):
    new_supervisor_id: int = Field(..., description="ID of the new supervisor to assign this activity to")
    reason: Optional[str] = Field(None, description="Optional operational note or justification for the reassignment")


class ReassignResponse(BaseModel):
    activity_id: str
    activity_name: str
    new_supervisor_id: int
    new_supervisor_name: str
    previous_supervisor_id: Optional[int] = None
    previous_supervisor_name: Optional[str] = None
    project_week: int
    assignment_source: str
    assigned_by: Optional[int] = None
    assigned_by_name: Optional[str] = None
    assigned_at: datetime
    supervisor_total_week_days: float
    weekly_capacity_days: float = 6.0
    is_overloaded: bool
    message: str


class SupervisorTaskItem(BaseModel):
    activity_id: str
    activity_name: str
    discipline: str
    location: Optional[str] = None
    planned_start: Optional[date] = None
    planned_finish: Optional[date] = None
    planned_duration_days: float
    status: str
    project_week: int
    assignment_source: str  # "auto" | "manual"
    assigned_by_name: Optional[str] = None
    assigned_at: datetime
    starts_in_days: int = 0
    schedule_state: str = "active_now"
    assignment_timeline_status: str = "Assigned (Active Now)"


class SupervisorWorkloadActivity(BaseModel):
    id: int
    activity_id: str
    activity_name: str
    discipline: str
    planned_start: Optional[date] = None
    planned_finish: Optional[date] = None
    planned_duration_days: float
    status: str
    assignment_source: str
    assigned_by_name: Optional[str] = None
    starts_in_days: int = 0
    schedule_state: str = "active_now"
    assignment_timeline_status: str = "Assigned (Active Now)"


class AdminWorkloadRow(BaseModel):
    supervisor_id: int
    supervisor_name: str
    supervisor_email: str
    discipline: str
    project_week: int
    total_activities: int
    total_duration_days: float
    is_overloaded: bool
    capacity_days: float = 6.0
    auto_assigned_count: int
    manual_assigned_count: int
    remaining_count: int = 0
    completed_count: int = 0
    overall_status: str = "on_track"  # "completed" | "on_track" | "delayed"
    status_detail: str = ""
    activities: List[SupervisorWorkloadActivity] = []


class AssignmentHistoryItem(BaseModel):
    id: int
    activity_id: str
    supervisor_id: int
    supervisor_name: str
    previous_supervisor_id: Optional[int] = None
    previous_supervisor_name: Optional[str] = None
    assignment_source: str
    assigned_by_id: Optional[int] = None
    assigned_by_name: Optional[str] = None
    assigned_at: datetime
    reason: Optional[str] = None
