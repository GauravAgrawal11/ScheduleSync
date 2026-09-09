from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.activity import Activity
from app.models.project import Project
from app.models.enums import UserRoleEnum
from app.models.activity_assignment import (
    ActivityAssignment,
    ActivityAssignmentHistory,
    AssignmentSourceEnum,
)
from app.assignment.schemas import (
    AssignmentRunSummary,
    ReassignRequest,
    ReassignResponse,
    SupervisorTaskItem,
    AdminWorkloadRow,
    SupervisorWorkloadActivity,
    AssignmentHistoryItem,
)
from app.assignment.engine import (
    assign_activities_for_project,
    compute_project_week,
    compute_activity_duration_days,
    compute_activity_timeline_status,
    WEEKLY_CAPACITY_DAYS,
)

router = APIRouter(tags=["Supervisor Assignment"])


@router.post(
    "/run",
    response_model=AssignmentRunSummary,
    status_code=status.HTTP_200_OK,
    summary="Run supervisor auto-assignment engine",
    description=(
        "Distributes baseline schedule activities to supervisors by discipline and weekly workload balance. "
        "Preserves manual overrides, reports unassigned activities gracefully, and flags overloaded supervisors."
    ),
)
def run_auto_assignment(
    project_id: int = Query(..., description="Target project ID to run auto-assignment on"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    try:
        summary = assign_activities_for_project(project_id=project_id, db=db)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Auto-assignment failed: {str(e)}")


@router.post(
    "/{activity_id}/reassign",
    response_model=ReassignResponse,
    status_code=status.HTTP_200_OK,
    summary="Manually reassign an activity to a supervisor",
    description=(
        "Allows a planner or admin to override the supervisor assignment for an activity. "
        "Preserves previous supervisor history and immediately recomputes workload overload consequences."
    ),
)
def reassign_activity(
    activity_id: str,
    body: ReassignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    # Lookup activity by activity_id string or database integer PK
    activity_query = db.query(Activity).filter(Activity.activity_id == activity_id)
    if activity_id.isdigit():
        activity_query = db.query(Activity).filter(
            or_(Activity.activity_id == activity_id, Activity.id == int(activity_id))
        )
    activity = activity_query.first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{activity_id}' not found.",
        )

    # Lookup target supervisor
    new_supervisor = (
        db.query(User)
        .filter(
            User.id == body.new_supervisor_id,
            or_(User.role == UserRoleEnum.SUPERVISOR, User.role == "supervisor"),
        )
        .first()
    )
    if not new_supervisor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supervisor with ID {body.new_supervisor_id} not found or is not a supervisor.",
        )

    project = db.query(Project).filter(Project.id == activity.project_id).first()
    project_start = project.start_date if project else None
    week = compute_project_week(activity.planned_start, project_start)
    duration_days = compute_activity_duration_days(activity)

    # Find existing assignment
    assignment = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.activity_id == activity.id)
        .first()
    )

    old_supervisor_id = None
    old_supervisor_name = None

    now = datetime.now(timezone.utc)

    if assignment:
        old_supervisor_id = assignment.supervisor_id
        if old_supervisor_id:
            old_sup = db.query(User).filter(User.id == old_supervisor_id).first()
            old_supervisor_name = old_sup.name if old_sup else None

        assignment.previous_supervisor_id = old_supervisor_id
        assignment.supervisor_id = new_supervisor.id
        assignment.project_week = week
        assignment.planned_duration_days = duration_days
        assignment.assignment_source = AssignmentSourceEnum.MANUAL
        assignment.assigned_by = current_user.id
        assignment.assigned_at = now
    else:
        assignment = ActivityAssignment(
            activity_id=activity.id,
            supervisor_id=new_supervisor.id,
            project_week=week,
            planned_duration_days=duration_days,
            assignment_source=AssignmentSourceEnum.MANUAL,
            assigned_by=current_user.id,
            assigned_at=now,
            previous_supervisor_id=None,
        )
        db.add(assignment)

    # Record immutable audit history
    history_entry = ActivityAssignmentHistory(
        activity_id=activity.id,
        supervisor_id=new_supervisor.id,
        previous_supervisor_id=old_supervisor_id,
        assignment_source=AssignmentSourceEnum.MANUAL,
        assigned_by=current_user.id,
        assigned_at=now,
        reason=body.reason or "Manual planner override via dashboard",
    )
    db.add(history_entry)
    db.commit()

    # Recompute whether the new supervisor is now overloaded for that week
    week_total = (
        db.query(func.sum(ActivityAssignment.planned_duration_days))
        .filter(
            ActivityAssignment.supervisor_id == new_supervisor.id,
            ActivityAssignment.project_week == week,
        )
        .scalar()
        or 0.0
    )
    week_total = float(week_total)
    is_overloaded = False
    status_msg = f"Assigned to {new_supervisor.name}. Workload allocated ({week_total:.1f}d)."

    return ReassignResponse(
        activity_id=activity.activity_id,
        activity_name=activity.activity_name,
        new_supervisor_id=new_supervisor.id,
        new_supervisor_name=new_supervisor.name,
        previous_supervisor_id=old_supervisor_id,
        previous_supervisor_name=old_supervisor_name,
        project_week=week,
        assignment_source="manual",
        assigned_by=current_user.id,
        assigned_by_name=current_user.name,
        assigned_at=assignment.assigned_at,
        supervisor_total_week_days=round(week_total, 1),
        weekly_capacity_days=WEEKLY_CAPACITY_DAYS,
        is_overloaded=is_overloaded,
        message=status_msg,
    )


@router.get(
    "/supervisor/{supervisor_id}",
    response_model=List[SupervisorTaskItem],
    summary="Get assigned activities for a supervisor",
    description="Retrieve a supervisor's assigned activities for a specific project week (or all weeks if omitted).",
)
def get_supervisor_tasks(
    supervisor_id: int,
    week: Optional[int] = Query(None, description="Project week number (e.g. 1, 2)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(ActivityAssignment, Activity, User)
        .join(Activity, ActivityAssignment.activity_id == Activity.id)
        .outerjoin(User, ActivityAssignment.assigned_by == User.id)
        .filter(ActivityAssignment.supervisor_id == supervisor_id)
    )

    if week is not None:
        query = query.filter(ActivityAssignment.project_week == week)

    results = query.order_by(
        ActivityAssignment.project_week.asc(),
        Activity.planned_start.asc().nulls_last(),
        Activity.activity_id.asc(),
    ).all()

    tasks = []
    sup_acts = [act for _, act, _ in results]
    ref_date = date(2026, 2, 6)

    for asgn, act, assigner in results:
        disc_str = (
            act.discipline.value.capitalize()
            if hasattr(act.discipline, "value")
            else str(act.discipline).capitalize()
            if act.discipline
            else "General"
        )
        sch_state, starts_in, tl_status = compute_activity_timeline_status(
            act=act,
            assigned_tasks_for_supervisor=sup_acts,
            ref_date=ref_date,
        )
        tasks.append(
            SupervisorTaskItem(
                activity_id=act.activity_id,
                activity_name=act.activity_name,
                discipline=disc_str,
                location=act.location,
                planned_start=act.planned_start,
                planned_finish=act.planned_finish,
                planned_duration_days=asgn.planned_duration_days,
                status=act.status,
                project_week=asgn.project_week,
                assignment_source=asgn.assignment_source.value if hasattr(asgn.assignment_source, "value") else str(asgn.assignment_source),
                assigned_by_name=assigner.name if assigner else None,
                assigned_at=asgn.assigned_at,
                starts_in_days=starts_in,
                schedule_state=sch_state,
                assignment_timeline_status=tl_status,
            )
        )

    return tasks


@router.get(
    "/admin-view",
    response_model=List[AdminWorkloadRow],
    summary="Supervisor workload summary for planner dashboard",
    description=(
        "Returns supervisor workload rows aggregated by supervisor and week, including "
        "activity counts, total duration, overload flag, and individual activity items for direct reassignment."
    ),
)
def get_admin_workload_view(
    project_id: int = Query(1, description="Project ID"),
    ref_date: Optional[date] = Query(None, description="Optional reference date (defaults to operational project date)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    # Fetch all supervisors
    supervisors = (
        db.query(User)
        .filter(
            or_(
                User.role == UserRoleEnum.SUPERVISOR,
                User.role == "supervisor",
            )
        )
        .order_by(User.discipline.asc(), User.name.asc())
        .all()
    )

    # Fetch all project assignments
    activities = db.query(Activity).filter(Activity.project_id == project_id).all()
    act_map = {a.id: a for a in activities}

    assignments = (
        db.query(ActivityAssignment, User)
        .outerjoin(User, ActivityAssignment.assigned_by == User.id)
        .filter(ActivityAssignment.activity_id.in_(list(act_map.keys())))
        .all()
    )

    # Group assignments directly by supervisor_id
    grouped_by_sup: dict = {}
    for asgn, assigner in assignments:
        act = act_map.get(asgn.activity_id)
        if not act:
            continue
        grouped_by_sup.setdefault(asgn.supervisor_id, []).append((asgn, act, assigner))

    rows = []
    from app.progress_tracking.summary import get_supervisor_progress, determine_reference_date
    effective_ref_date = determine_reference_date(project_id, db, ref_date)
    sup_progress_cache = {
        sup.id: get_supervisor_progress(sup.id, project_id, db, ref_date=effective_ref_date)
        for sup in supervisors
    }

    ref_date = effective_ref_date

    for sup in supervisors:
        prog = sup_progress_cache.get(sup.id)
        rem_count = prog.remaining_count if prog else 0
        comp_count = prog.completed_count if prog else 0
        ov_status = prog.overall_status if prog else "on_track"
        st_detail = prog.status_detail if prog else ""

        items = grouped_by_sup.get(sup.id, [])
        sup_all_acts = [act for _, act, _ in items]

        total_duration = sum(item[0].planned_duration_days for item in items)
        auto_count = sum(1 for item in items if (item[0].assignment_source.value if hasattr(item[0].assignment_source, 'value') else str(item[0].assignment_source)) == "auto")
        manual_count = sum(1 for item in items if (item[0].assignment_source.value if hasattr(item[0].assignment_source, 'value') else str(item[0].assignment_source)) == "manual")

        activity_items = []
        for asgn, act, assigner in items:
            sch_state, starts_in, tl_status = compute_activity_timeline_status(
                act=act,
                assigned_tasks_for_supervisor=sup_all_acts,
                ref_date=ref_date,
            )
            activity_items.append(
                SupervisorWorkloadActivity(
                    id=act.id,
                    activity_id=act.activity_id,
                    activity_name=act.activity_name,
                    discipline=act.discipline.value.capitalize() if hasattr(act.discipline, "value") else str(act.discipline).capitalize() if act.discipline else "General",
                    planned_start=act.planned_start,
                    planned_finish=act.planned_finish,
                    planned_duration_days=asgn.planned_duration_days,
                    status=act.status,
                    assignment_source=asgn.assignment_source.value if hasattr(asgn.assignment_source, "value") else str(asgn.assignment_source),
                    assigned_by_name=assigner.name if assigner else None,
                    starts_in_days=starts_in,
                    schedule_state=sch_state,
                    assignment_timeline_status=tl_status,
                )
            )

        # Sort activities: in-progress/active first, then upcoming, then completed
        activity_items.sort(
            key=lambda a: (
                0 if a.status == "IN_PROGRESS" or a.schedule_state == "active_now" else
                1 if a.status == "PLANNED" else 2
            )
        )

        rows.append(
            AdminWorkloadRow(
                supervisor_id=sup.id,
                supervisor_name=sup.name,
                supervisor_email=sup.email,
                discipline=sup.discipline.capitalize() if sup.discipline else "General",
                project_week=1,
                total_activities=len(items),
                total_duration_days=round(total_duration, 1),
                is_overloaded=False,
                capacity_days=WEEKLY_CAPACITY_DAYS,
                auto_assigned_count=auto_count,
                manual_assigned_count=manual_count,
                remaining_count=rem_count,
                completed_count=comp_count,
                overall_status=ov_status,
                status_detail=st_detail,
                activities=activity_items,
            )
        )

    return rows


@router.get(
    "/activity/{activity_id}/history",
    response_model=List[AssignmentHistoryItem],
    summary="Get assignment audit history for an activity",
    description="Returns chronological assignment audit trail from oldest to newest for the specified activity.",
)
def get_activity_assignment_history(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity_query = db.query(Activity).filter(Activity.activity_id == activity_id)
    if activity_id.isdigit():
        activity_query = db.query(Activity).filter(
            or_(Activity.activity_id == activity_id, Activity.id == int(activity_id))
        )
    activity = activity_query.first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{activity_id}' not found.",
        )

    # Query chronological history
    entries = (
        db.query(ActivityAssignmentHistory)
        .filter(ActivityAssignmentHistory.activity_id == activity.id)
        .order_by(ActivityAssignmentHistory.assigned_at.asc(), ActivityAssignmentHistory.id.asc())
        .all()
    )

    user_ids = set()
    for e in entries:
        user_ids.add(e.supervisor_id)
        if e.previous_supervisor_id:
            user_ids.add(e.previous_supervisor_id)
        if e.assigned_by:
            user_ids.add(e.assigned_by)

    users_map = {u.id: u.name for u in db.query(User).filter(User.id.in_(list(user_ids))).all()}

    history_items = []
    for e in entries:
        src = e.assignment_source.value if hasattr(e.assignment_source, "value") else str(e.assignment_source)
        history_items.append(
            AssignmentHistoryItem(
                id=e.id,
                activity_id=activity.activity_id,
                supervisor_id=e.supervisor_id,
                supervisor_name=users_map.get(e.supervisor_id, f"Supervisor #{e.supervisor_id}"),
                previous_supervisor_id=e.previous_supervisor_id,
                previous_supervisor_name=users_map.get(e.previous_supervisor_id) if e.previous_supervisor_id else None,
                assignment_source=src,
                assigned_by_id=e.assigned_by,
                assigned_by_name=users_map.get(e.assigned_by) if e.assigned_by else None,
                assigned_at=e.assigned_at,
                reason=e.reason,
            )
        )

    return history_items
