from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field


class ActivityProgressItem(BaseModel):
    activity_id: str
    activity_name: str
    discipline: str
    location: Optional[str] = None
    planned_start: Optional[date] = None
    planned_finish: Optional[date] = None
    actual_start: Optional[date] = None
    actual_finish: Optional[date] = None
    status: str
    days_left: Optional[int] = Field(None, description="Days left until planned finish (negative if overdue)")
    variance_days: Optional[int] = Field(None, description="planned_finish - actual_finish for completed activities")
    is_completed: bool
    is_delayed: bool
    starts_in_days: int = 0
    schedule_state: str = "active_now"
    assignment_timeline_status: str = "Assigned (Active Now)"


class SupervisorProgressSummary(BaseModel):
    supervisor_id: int
    supervisor_name: str
    discipline: str
    project_id: int
    total_assigned: int
    completed_count: int
    remaining_count: int
    overall_status: str = Field(..., description="Overall progress status: 'completed' | 'on_track' | 'delayed'")
    status_detail: str = Field(..., description="Human-readable status summary sentence")
    raw_days: int = Field(..., description="Raw days quantity (positive days left / overdue / early)")
    delayed_by_days: Optional[int] = Field(None, description="Largest overdue amount among incomplete activities if delayed")
    nearest_deadline_days: Optional[int] = Field(None, description="Smallest non-negative days_left among remaining activities if on track")
    activities: List[ActivityProgressItem] = []
    all_activities: List[ActivityProgressItem] = []


class DelayedSupervisorItem(BaseModel):
    supervisor_id: int
    supervisor_name: str
    supervisor_email: str
    discipline: str
    delayed_by_days: int
    overdue_activities_count: int
    total_remaining: int
    status_detail: str
