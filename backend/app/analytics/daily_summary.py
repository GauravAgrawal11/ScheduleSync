"""
ScheduleSync Daily Activity Checker (SIH26122 - Feature 2)
Computes daily completed activities and remaining backlog for a project,
broken down by engineering discipline and by assigned field supervisor.
Reuses existing activities, progress_events, and activity_assignments models.
"""

from datetime import date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.activity import Activity
from app.models.progress_event import ProgressEvent
from app.models.activity_assignment import ActivityAssignment
from app.models.user import User


class CompletedActivityItem(BaseModel):
    activity_id: str
    activity_name: str
    discipline: str
    supervisor: str
    supervisor_id: Optional[int] = None
    status: str = "COMPLETED"
    planned_start: Optional[date] = None
    planned_finish: Optional[date] = None
    actual_finish: Optional[date] = None
    progress_percent: Optional[int] = 100
    confidence: Optional[float] = None
    wbs_code: Optional[str] = None
    location: Optional[str] = None
    predecessor_activity_id: Optional[str] = None

    class Config:
        from_attributes = True


class DisciplineSummaryItem(BaseModel):
    discipline: str
    completed_today: int
    remaining: int
    total: int


class RemainingActivityItem(BaseModel):
    activity_id: str
    activity_name: str
    discipline: str
    supervisor: str
    supervisor_id: Optional[int] = None
    status: str = "PLANNED"
    planned_start: Optional[date] = None
    planned_finish: Optional[date] = None
    progress_percent: Optional[int] = 0
    wbs_code: Optional[str] = None
    location: Optional[str] = None
    predecessor_activity_id: Optional[str] = None

    class Config:
        from_attributes = True


class DailySummary(BaseModel):
    project_id: int
    date: date
    completed_today: List[CompletedActivityItem]
    remaining_by_discipline: List[DisciplineSummaryItem]
    remaining_activities: List[RemainingActivityItem] = Field(default_factory=list)
    completed_today_count: int
    remaining_count: int
    total_activities: int


class SupervisorSummaryItem(BaseModel):
    supervisor_id: Optional[int] = None
    supervisor_name: str
    discipline: Optional[str] = None
    completed_today: int
    remaining: int
    total: int
    completed_activities: List[CompletedActivityItem] = Field(default_factory=list)
    remaining_activities: List[RemainingActivityItem] = Field(default_factory=list)


class DailySummaryBySupervisor(BaseModel):
    project_id: int
    date: date
    by_supervisor: List[SupervisorSummaryItem]
    totals: Dict[str, int]


def get_daily_summary(
    project_id: int,
    target_date: Optional[date] = None,
    supervisor_id: Optional[int] = None,
    db: Session = None,
) -> DailySummary:
    """
    Compute daily activity completion and discipline backlog for a given date.
    Can optionally filter by assigned supervisor_id for individual supervisor views.
    """
    if target_date is None:
        target_date = date.today()

    # 1. Fetch assignments for this project to determine supervisors
    assignments = (
        db.query(ActivityAssignment)
        .join(Activity, ActivityAssignment.activity_id == Activity.id)
        .filter(Activity.project_id == project_id)
        .all()
    )
    act_to_assignment = {a.activity_id: a for a in assignments}

    def get_supervisor_info(act: Activity) -> tuple[Optional[int], str]:
        if act.id in act_to_assignment:
            assign = act_to_assignment[act.id]
            if assign.supervisor:
                return assign.supervisor.id, assign.supervisor.name
        return None, "Unassigned"

    # 2. Fetch all project activities (filter by supervisor_id if supplied)
    activities_query = (
        db.query(Activity)
        .filter(Activity.project_id == project_id)
    )
    activities = activities_query.all()

    if supervisor_id is not None:
        activities = [
            act for act in activities
            if act.id in act_to_assignment and act_to_assignment[act.id].supervisor_id == supervisor_id
        ]

    total_activities = len(activities)
    scoped_act_ids = {act.id for act in activities}

    # 3. Find progress events completed on target_date
    completed_events_query = (
        db.query(ProgressEvent)
        .join(Activity, ProgressEvent.activity_id == Activity.id)
        .filter(
            Activity.project_id == project_id,
            (ProgressEvent.status == "COMPLETED") | (Activity.status == "COMPLETED"),
            (
                (ProgressEvent.actual_finish == target_date)
                | (func.date(ProgressEvent.created_at) == target_date)
                | (Activity.actual_finish == target_date)
            ),
        )
    )
    completed_events = completed_events_query.all()

    completed_act_ids = {pe.activity_id for pe in completed_events if pe.activity_id in scoped_act_ids}
    for act in activities:
        if act.status == "COMPLETED" and act.actual_finish == target_date:
            completed_act_ids.add(act.id)

    # 4. Build completed activities list
    completed_today_items: List[CompletedActivityItem] = []
    for act in activities:
        if act.id in completed_act_ids:
            sup_id, sup_name = get_supervisor_info(act)
            pe = next((e for e in completed_events if e.activity_id == act.id), None)
            conf = pe.confidence if pe else None
            disc_str = (
                str(act.discipline.value)
                if hasattr(act.discipline, "value")
                else str(act.discipline or "general")
            )
            completed_today_items.append(
                CompletedActivityItem(
                    activity_id=act.activity_id,
                    activity_name=act.activity_name,
                    discipline=disc_str,
                    supervisor=sup_name,
                    supervisor_id=sup_id,
                    status="COMPLETED",
                    planned_start=act.planned_start,
                    planned_finish=act.planned_finish,
                    actual_finish=act.actual_finish or target_date,
                    progress_percent=100,
                    confidence=conf,
                    wbs_code=act.wbs_code,
                    location=act.location,
                    predecessor_activity_id=act.predecessor_activity_id,
                )
            )

    # 5. Build discipline breakdown & remaining activities list
    disc_groups: Dict[str, Dict[str, int]] = {}
    remaining_items: List[RemainingActivityItem] = []
    remaining_count = 0

    for act in activities:
        disc_str = (
            str(act.discipline.value)
            if hasattr(act.discipline, "value")
            else str(act.discipline or "general")
        )
        if disc_str not in disc_groups:
            disc_groups[disc_str] = {"completed_today": 0, "remaining": 0, "total": 0}

        disc_groups[disc_str]["total"] += 1

        if act.id in completed_act_ids:
            disc_groups[disc_str]["completed_today"] += 1
        elif act.status != "COMPLETED":
            disc_groups[disc_str]["remaining"] += 1
            remaining_count += 1
            sup_id, sup_name = get_supervisor_info(act)
            pct = 60 if act.status == "IN_PROGRESS" else (30 if act.status == "DELAYED" else 0)
            remaining_items.append(
                RemainingActivityItem(
                    activity_id=act.activity_id,
                    activity_name=act.activity_name,
                    discipline=disc_str,
                    supervisor=sup_name,
                    supervisor_id=sup_id,
                    status=act.status or "PLANNED",
                    planned_start=act.planned_start,
                    planned_finish=act.planned_finish,
                    progress_percent=pct,
                    wbs_code=act.wbs_code,
                    location=act.location,
                    predecessor_activity_id=act.predecessor_activity_id,
                )
            )

    remaining_by_discipline = [
        DisciplineSummaryItem(
            discipline=disc,
            completed_today=counts["completed_today"],
            remaining=counts["remaining"],
            total=counts["total"],
        )
        for disc, counts in sorted(disc_groups.items())
    ]

    return DailySummary(
        project_id=project_id,
        date=target_date,
        completed_today=completed_today_items,
        remaining_by_discipline=remaining_by_discipline,
        remaining_activities=remaining_items,
        completed_today_count=len(completed_today_items),
        remaining_count=remaining_count,
        total_activities=total_activities,
    )


def get_daily_summary_by_supervisor(
    project_id: int,
    target_date: Optional[date] = None,
    db: Session = None,
) -> DailySummaryBySupervisor:
    """
    Compute daily activity completion and remaining backlog grouped by supervisor,
    reusing existing activity_assignments data without recomputing assignment logic.
    """
    if target_date is None:
        target_date = date.today()

    # 1. Fetch all project activities
    activities = (
        db.query(Activity)
        .filter(Activity.project_id == project_id)
        .all()
    )
    total_activities = len(activities)

    # 2. Fetch assignments for this project to determine supervisors
    assignments = (
        db.query(ActivityAssignment)
        .join(Activity, ActivityAssignment.activity_id == Activity.id)
        .filter(Activity.project_id == project_id)
        .all()
    )
    act_to_assignment = {a.activity_id: a for a in assignments}

    def get_supervisor_info(act: Activity) -> tuple[Optional[int], str]:
        if act.id in act_to_assignment:
            assign = act_to_assignment[act.id]
            if assign.supervisor:
                return assign.supervisor.id, assign.supervisor.name
        return None, "Unassigned"

    # 3. Find progress events completed on target_date
    completed_events = (
        db.query(ProgressEvent)
        .join(Activity, ProgressEvent.activity_id == Activity.id)
        .filter(
            Activity.project_id == project_id,
            (ProgressEvent.status == "COMPLETED") | (Activity.status == "COMPLETED"),
            (
                (ProgressEvent.actual_finish == target_date)
                | (func.date(ProgressEvent.created_at) == target_date)
                | (Activity.actual_finish == target_date)
            ),
        )
        .all()
    )
    completed_act_ids = {pe.activity_id for pe in completed_events}
    for act in activities:
        if act.status == "COMPLETED" and act.actual_finish == target_date:
            completed_act_ids.add(act.id)

    # 4. Group by supervisor
    sup_groups: Dict[str, Dict[str, Any]] = {}
    completed_today_total = 0
    remaining_total = 0

    for act in activities:
        sup_id, sup_name = get_supervisor_info(act)
        key = sup_name
        disc_str = (
            str(act.discipline.value)
            if hasattr(act.discipline, "value")
            else str(act.discipline or "general")
        )

        if key not in sup_groups:
            sup_groups[key] = {
                "supervisor_id": sup_id,
                "supervisor_name": sup_name,
                "discipline": disc_str,
                "completed_today": 0,
                "remaining": 0,
                "total": 0,
                "completed_activities": [],
                "remaining_activities": [],
            }

        sup_groups[key]["total"] += 1

        if act.id in completed_act_ids:
            sup_groups[key]["completed_today"] += 1
            completed_today_total += 1
            pe = next((e for e in completed_events if e.activity_id == act.id), None)
            sup_groups[key]["completed_activities"].append(
                CompletedActivityItem(
                    activity_id=act.activity_id,
                    activity_name=act.activity_name,
                    discipline=disc_str,
                    supervisor=sup_name,
                    supervisor_id=sup_id,
                    status="COMPLETED",
                    planned_start=act.planned_start,
                    planned_finish=act.planned_finish,
                    actual_finish=act.actual_finish or target_date,
                    progress_percent=100,
                    confidence=pe.confidence if pe else None,
                    wbs_code=act.wbs_code,
                    location=act.location,
                    predecessor_activity_id=act.predecessor_activity_id,
                )
            )
        elif act.status != "COMPLETED":
            sup_groups[key]["remaining"] += 1
            remaining_total += 1
            pct = 60 if act.status == "IN_PROGRESS" else (30 if act.status == "DELAYED" else 0)
            sup_groups[key]["remaining_activities"].append(
                RemainingActivityItem(
                    activity_id=act.activity_id,
                    activity_name=act.activity_name,
                    discipline=disc_str,
                    supervisor=sup_name,
                    supervisor_id=sup_id,
                    status=act.status or "PLANNED",
                    planned_start=act.planned_start,
                    planned_finish=act.planned_finish,
                    progress_percent=pct,
                    wbs_code=act.wbs_code,
                    location=act.location,
                    predecessor_activity_id=act.predecessor_activity_id,
                )
            )

    by_supervisor = [
        SupervisorSummaryItem(
            supervisor_id=info["supervisor_id"],
            supervisor_name=info["supervisor_name"],
            discipline=info["discipline"],
            completed_today=info["completed_today"],
            remaining=info["remaining"],
            total=info["total"],
            completed_activities=info["completed_activities"],
            remaining_activities=info["remaining_activities"],
        )
        for _, info in sorted(sup_groups.items(), key=lambda x: (x[1]["supervisor_name"] == "Unassigned", x[1]["supervisor_name"]))
    ]

    return DailySummaryBySupervisor(
        project_id=project_id,
        date=target_date,
        by_supervisor=by_supervisor,
        totals={
            "completed_today_count": completed_today_total,
            "remaining_count": remaining_total,
            "total_activities": total_activities,
        },
    )

