"""
Member C: Linking Service
Shared function for writing schedule actuals, creating progress events, and logging audit records.
Called by both the auto-suggest path (>0.90 confidence) and the planner manual review path.
"""

from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from app.models.match import Match
from app.models.activity import Activity
from app.models.progress_event import ProgressEvent
from app.models.audit_log import AuditLog
from app.models.enums import EventTypeEnum, DecisionEnum


def apply_match_link(
    match: Match,
    approved_by_user_id: Optional[int],
    db: Session,
    target_activity_id: Optional[int] = None,
    actual_start: Optional[date] = None,
    actual_finish: Optional[date] = None,
    action_note: str = "MANUAL_APPROVE",
) -> ProgressEvent:
    """
    Shared linking logic:
    1. Determines target activity (original match activity or relinked activity)
    2. Writes a progress_events row
    3. Updates Activity actual dates and status
    4. Records an immutable audit_log entry
    """
    act_id = target_activity_id or match.activity_id
    activity = db.query(Activity).filter(Activity.id == act_id).first()
    if not activity:
        raise ValueError(f"Activity #{act_id} not found in database.")

    event_date = actual_start or date.today()

    # Determine if report text or action signals completion
    raw_text = (match.report.raw_text or "").lower() if match.report else ""
    is_complete_signal = any(
        w in raw_text for w in ["completed", "done", "finished", "poured", "erected", "laid", "complete"]
    )
    if actual_finish is None and (is_complete_signal or action_note.startswith("MANUAL_APPROVE")):
        actual_finish = event_date

    # 1. Update activity status and actual dates
    old_status = activity.status
    activity.status = "COMPLETED" if actual_finish else "IN_PROGRESS"
    if activity.status == "COMPLETED":
        activity.actual_finish = actual_finish
        activity.actual_start = activity.actual_start or event_date
    else:
        activity.actual_start = activity.actual_start or event_date

    # 2. Create ProgressEvent
    event_type = EventTypeEnum.FINISH if activity.status == "COMPLETED" else EventTypeEnum.START
    progress_event = ProgressEvent(
        activity_id=activity.id,
        source_report_id=match.report_id,
        event_type=event_type,
        actual_start=activity.actual_start or event_date,
        actual_finish=actual_finish,
        status=activity.status,
        confidence=match.final_confidence,
        approved_by=approved_by_user_id,
    )
    db.add(progress_event)
    db.flush()

    # SIH26122 Task 1: Out-of-sequence detection hook
    try:
        from app.analytics.sequence import check_sequence_violation
        check_sequence_violation(activity.id, db)
    except Exception as e:
        # Non-blocking check
        pass

    # 3. Create AuditLog entry with verification type (Manual vs AI)
    verification_type = "MANUAL" if approved_by_user_id is not None else "AI"
    audit_entry = AuditLog(
        progress_event_id=progress_event.id,
        actor=approved_by_user_id,
        action=action_note,
        old_value={"status": old_status, "confidence": match.final_confidence},
        new_value={
            "activity_id": activity.activity_id,
            "status": activity.status,
            "actual_start": str(activity.actual_start) if activity.actual_start else None,
            "actual_finish": str(actual_finish) if actual_finish else None,
            "verification_type": verification_type,
        },
    )
    db.add(audit_entry)

    # 4. Update match decision to AUTO (verified & schedule linked)
    match.decision = DecisionEnum.AUTO
    db.commit()
    db.refresh(progress_event)

    return progress_event

