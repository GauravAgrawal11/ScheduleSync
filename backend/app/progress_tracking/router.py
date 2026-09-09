from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.progress_tracking.schemas import (
    SupervisorProgressSummary,
    DelayedSupervisorItem,
)
from app.progress_tracking.summary import (
    get_supervisor_progress,
    get_all_delayed_supervisors,
)

router = APIRouter(tags=["Progress Tracking"])


@router.get(
    "/supervisor/{supervisor_id}",
    response_model=SupervisorProgressSummary,
    summary="Get supervisor progress summary & deadline tracking",
    description="Returns remaining tasks, completed count, nearest deadline, and overall status (completed / on_track / delayed).",
)
def get_supervisor_progress_endpoint(
    supervisor_id: int,
    project_id: int = Query(1, description="Project ID"),
    ref_date: Optional[date] = Query(None, description="Optional reference date (defaults to operational project date)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify supervisor exists
    user = db.query(User).filter(User.id == supervisor_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User #{supervisor_id} not found",
        )

    summary = get_supervisor_progress(
        supervisor_id=supervisor_id,
        project_id=project_id,
        db=db,
        ref_date=ref_date,
    )
    return summary


@router.get(
    "/delayed",
    response_model=List[DelayedSupervisorItem],
    summary="List all delayed supervisors needing attention",
    description="Returns supervisors currently in delayed status sorted by overdue days descending.",
)
def get_delayed_supervisors_endpoint(
    project_id: int = Query(1, description="Project ID"),
    ref_date: Optional[date] = Query(None, description="Optional reference date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    delayed = get_all_delayed_supervisors(project_id=project_id, db=db, ref_date=ref_date)
    return delayed
