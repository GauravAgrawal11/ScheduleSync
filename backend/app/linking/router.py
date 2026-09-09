"""
Member C: Linking & Schedule Write-Back Module.
Takes approved matches and writes actual progress records to `progress_events`
and logs every state transition into the `audit_log` table.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.models.progress_event import ProgressEvent
from app.models.audit_log import AuditLog
from app.schemas.progress_event import ProgressEventCreateScaffold, ProgressEventResponse

router = APIRouter(prefix="/linking", tags=["Member C: Linking & Actuals"])


@router.post(
    "/write-progress",
    response_model=ProgressEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record accepted progress event into schedule (Member C)",
    description="Persists actual progress event and updates audit log. Restricted to planners and admins.",
)
def record_progress(
    event_in: ProgressEventCreateScaffold,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    # 1. Create progress event
    event = ProgressEvent(
        activity_id=event_in.activity_id,
        source_report_id=event_in.source_report_id,
        event_type=event_in.event_type,
        actual_start=event_in.actual_start,
        actual_finish=event_in.actual_finish,
        status=event_in.status,
        confidence=event_in.confidence,
        approved_by=current_user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # SIH26122 Task 1: Out-of-sequence detection hook
    try:
        from app.analytics.sequence import check_sequence_violation
        check_sequence_violation(event.activity_id, db)
    except Exception:
        pass

    # 2. Add audit log entry
    audit = AuditLog(
        progress_event_id=event.id,
        actor=current_user.id,
        action="LINK_PROGRESS_EVENT",
        old_value=None,
        new_value={"status": event.status, "confidence": event.confidence},
    )
    db.add(audit)
    db.commit()

    return event
