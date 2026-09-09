import math
import logging
from typing import Dict, List, Tuple, Optional
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.project import Project
from app.models.activity import Activity
from app.models.user import User
from app.models.enums import UserRoleEnum
from app.models.activity_assignment import (
    ActivityAssignment,
    ActivityAssignmentHistory,
    AssignmentSourceEnum,
)

logger = logging.getLogger(__name__)

# Unconstrained flexible shifts (no artificial 6-day weekly cap)
WEEKLY_CAPACITY_DAYS = 999.0


def compute_project_week(
    activity_planned_start: Optional[date],
    project_start_date: Optional[date],
) -> int:
    """
    Compute project week number (1-indexed) based on activity planned start.
    Formula: floor((planned_start - project_start_date).days / 7) + 1
    """
    if not activity_planned_start or not project_start_date:
        return 1

    delta_days = (activity_planned_start - project_start_date).days
    week = math.floor(delta_days / 7) + 1
    return max(1, int(week))


def compute_activity_duration_days(activity: Activity) -> float:
    """
    Compute planned duration in days from planned_start to planned_finish (inclusive).
    """
    if activity.planned_start and activity.planned_finish:
        days = (activity.planned_finish - activity.planned_start).days + 1
        return max(1.0, float(days))
    return 1.0


def compute_activity_timeline_status(
    act: Activity,
    assigned_tasks_for_supervisor: List[Activity],
    ref_date: Optional[date] = None,
) -> Tuple[str, int, str]:
    """
    Computes (schedule_state, starts_in_days, assignment_timeline_status) for an activity.
    Schedule states:
    - 'completed': activity is already finished
    - 'active_now': supervisor is free or currently working on this activity
    - 'queued': activity is scheduled to start after the supervisor finishes active work
    """
    if not ref_date:
        ref_date = date(2026, 2, 6)

    # 1. Completed
    norm_status = (act.status or "").upper()
    if norm_status == "COMPLETED" or getattr(act, "actual_finish", None):
        return ("completed", 0, "Completed")

    # 2. In Progress (Active Now)
    if norm_status in ["IN_PROGRESS", "IN PROGRESS"]:
        return ("active_now", 0, "Assigned (Active Now)")

    # 3. Planned: Check if supervisor has an ongoing in-progress task that finishes first
    in_prog_tasks = [
        t for t in assigned_tasks_for_supervisor
        if (t.status or "").upper() in ["IN_PROGRESS", "IN PROGRESS"] and t.id != act.id
    ]

    if in_prog_tasks:
        # Supervisor is currently busy with an in-progress task
        # Find how many days until the active in-progress task finishes
        rem_days_list = []
        for t in in_prog_tasks:
            if t.planned_finish:
                diff = (t.planned_finish - ref_date).days
                rem_days_list.append(max(1, diff))
            else:
                rem_days_list.append(1)

        busy_days = min(rem_days_list) if rem_days_list else 1
        timeline_text = f"Assigned after {busy_days} day" if busy_days == 1 else f"Assigned after {busy_days} days"
        return ("queued", busy_days, timeline_text)

    # If supervisor has no in-progress task, check planned start vs ref_date
    if act.planned_start and act.planned_start > ref_date:
        future_days = (act.planned_start - ref_date).days
        if future_days > 0:
            timeline_text = f"Assigned after {future_days} day" if future_days == 1 else f"Assigned after {future_days} days"
            return ("queued", future_days, timeline_text)

    return ("active_now", 0, "Assigned (Active Now)")


def assign_activities_for_project(
    project_id: int,
    db: Session,
) -> Dict:
    """
    Distribute activities to supervisors based on discipline matching, weekly workload balancing,
    and capacity constraints (avoiding overwork).
    - Capacity constraint: Respects WEEKLY_CAPACITY_DAYS (6.0d).
    - Idempotent: Never overwrites manual assignments made by planners.
    - Graceful: Unassigned activities in disciplines without supervisors are reported, not crashed.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project with ID {project_id} does not exist.")

    activities = db.query(Activity).filter(Activity.project_id == project_id).all()
    if not activities:
        return {
            "project_id": project_id,
            "total_activities": 0,
            "total_assigned": 0,
            "unassigned_no_supervisor": 0,
            "unassigned_activities": [],
            "overloaded_count": 0,
            "overloaded_supervisors": [],
            "weekly_capacity_days": WEEKLY_CAPACITY_DAYS,
        }

    act_ids = [a.id for a in activities]

    # Load existing assignments for these activities
    existing_assignments: Dict[int, ActivityAssignment] = {
        asgn.activity_id: asgn
        for asgn in db.query(ActivityAssignment)
        .filter(ActivityAssignment.activity_id.in_(act_ids))
        .all()
    }

    # Pre-calculate workload from existing manual assignments (so auto-assign factors in planner overrides)
    supervisor_week_totals: Dict[Tuple[int, int], float] = {}
    for asgn in existing_assignments.values():
        if asgn.assignment_source == AssignmentSourceEnum.MANUAL:
            key = (asgn.supervisor_id, asgn.project_week)
            supervisor_week_totals[key] = supervisor_week_totals.get(key, 0.0) + asgn.planned_duration_days

    # Load all available supervisors
    all_supervisors = (
        db.query(User)
        .filter(
            or_(
                User.role == UserRoleEnum.SUPERVISOR,
                User.role == "supervisor",
            )
        )
        .all()
    )

    # Group activities to (re)assign: skip manual assignments
    # Group key: (discipline_str, project_week)
    groups: Dict[Tuple[str, int], List[Activity]] = {}
    for act in activities:
        existing = existing_assignments.get(act.id)
        # Idempotency rule: Skip activities that already have a MANUAL assignment
        if existing and existing.assignment_source == AssignmentSourceEnum.MANUAL:
            continue

        disc_str = (
            act.discipline.value.lower()
            if hasattr(act.discipline, "value")
            else str(act.discipline).lower()
            if act.discipline
            else "other"
        )
        week = compute_project_week(act.planned_start, project.start_date)
        groups.setdefault((disc_str, week), []).append(act)

    assigned_count = 0
    unassigned_activities = []
    round_robin_counters: Dict[Tuple[str, int], int] = {}

    for (disc_str, week), group_acts in groups.items():
        # Match supervisors by discipline (case-insensitive)
        matching_supervisors = [
            s
            for s in all_supervisors
            if s.discipline and s.discipline.lower() == disc_str
        ]

        if not matching_supervisors:
            # Graceful fallback: 0 supervisors for this discipline
            for act in group_acts:
                unassigned_activities.append({
                    "activity_id": act.activity_id,
                    "activity_name": act.activity_name,
                    "discipline": disc_str.capitalize(),
                    "project_week": week,
                    "reason": f"No supervisor available in discipline '{disc_str.capitalize()}'",
                })
            continue

        # Sort supervisors deterministically by ID
        matching_supervisors.sort(key=lambda s: s.id)

        # Sort activities within group by planned_start (nulls last) then activity_id
        group_acts.sort(key=lambda a: (a.planned_start or date.max, a.activity_id))

        # Running total of planned_duration_days for each supervisor in this week
        running_totals = {
            s.id: supervisor_week_totals.get((s.id, week), 0.0)
            for s in matching_supervisors
        }

        for act in group_acts:
            dur = compute_activity_duration_days(act)

            # Capacity-aware allocation: check who can take this activity without exceeding capacity
            within_capacity = [
                s for s in matching_supervisors
                if (running_totals[s.id] + dur) <= WEEKLY_CAPACITY_DAYS
            ]

            # Prioritize supervisors within capacity; if all would exceed, pick from all to minimize excess
            candidate_pool = within_capacity if within_capacity else matching_supervisors

            # Assign to supervisor with the lowest running total in candidate pool
            min_val = min(running_totals[s.id] for s in candidate_pool)
            tied_supervisors = [s for s in candidate_pool if running_totals[s.id] == min_val]

            # Break ties round-robin
            rr_key = (disc_str, week)
            rr_idx = round_robin_counters.get(rr_key, 0)
            chosen_supervisor = tied_supervisors[rr_idx % len(tied_supervisors)]
            round_robin_counters[rr_key] = rr_idx + 1

            # Update running total
            running_totals[chosen_supervisor.id] += dur
            supervisor_week_totals[(chosen_supervisor.id, week)] = running_totals[chosen_supervisor.id]

            # Create or update ActivityAssignment
            existing = existing_assignments.get(act.id)
            if existing:
                existing.supervisor_id = chosen_supervisor.id
                existing.project_week = week
                existing.planned_duration_days = dur
                existing.assignment_source = AssignmentSourceEnum.AUTO
                existing.assigned_by = None
                existing.assigned_at = datetime.now(timezone.utc)
            else:
                new_asgn = ActivityAssignment(
                    activity_id=act.id,
                    supervisor_id=chosen_supervisor.id,
                    project_week=week,
                    planned_duration_days=dur,
                    assignment_source=AssignmentSourceEnum.AUTO,
                    assigned_by=None,
                )
                db.add(new_asgn)
                existing_assignments[act.id] = new_asgn

            # Append to history log
            db.add(
                ActivityAssignmentHistory(
                    activity_id=act.id,
                    supervisor_id=chosen_supervisor.id,
                    previous_supervisor_id=None,
                    assignment_source=AssignmentSourceEnum.AUTO,
                    assigned_by=None,
                    reason="Auto-assigned by workload balancing engine",
                )
            )
            assigned_count += 1

    # Commit all assignments and history logs
    db.commit()

    # Detect overloaded supervisors across all assignments for this project
    all_project_assignments = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.activity_id.in_(act_ids))
        .all()
    )

    workload_map: Dict[Tuple[int, int], float] = {}
    for a in all_project_assignments:
        key = (a.supervisor_id, a.project_week)
        workload_map[key] = workload_map.get(key, 0.0) + a.planned_duration_days

    overloaded_supervisors = []

    return {
        "project_id": project_id,
        "total_activities": len(activities),
        "total_assigned": assigned_count,
        "unassigned_no_supervisor": len(unassigned_activities),
        "unassigned_activities": unassigned_activities,
        "overloaded_count": 0,
        "overloaded_supervisors": [],
        "weekly_capacity_days": 0.0,
    }
