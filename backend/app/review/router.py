"""
Member C: Review Queue Router
Provides endpoints for planners to inspect candidate AI matches, approve them into schedule actuals,
relink to alternative WBS activities, or mark them rejected.
"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.match import Match
from app.models.activity import Activity
from app.models.progress_event import ProgressEvent
from app.models.enums import DecisionEnum
from app.linking.service import apply_match_link
from app.models.audit_log import AuditLog

router = APIRouter(tags=["Review Queue"])


class SuggestedActivitySummary(BaseModel):
    id: int
    activity_id: str
    activity_name: str
    wbs_code: Optional[str] = None
    planned_start: Optional[date] = None
    planned_finish: Optional[date] = None
    actual_start: Optional[date] = None
    actual_finish: Optional[date] = None
    current_status: Optional[str] = None


class SignalBreakdown(BaseModel):
    semantic: float
    entity: float
    metadata: float


class ExtractedFieldsSummary(BaseModel):
    action: str
    line_ref: Optional[str] = None
    quantity: Optional[str] = None
    date: str


class MatchQueueItem(BaseModel):
    match_id: int
    report_id: int
    report_snippet: str
    report_date: str
    supervisor: str
    discipline: str
    location: str
    extracted_fields: ExtractedFieldsSummary
    suggested_activity: SuggestedActivitySummary
    signals: SignalBreakdown
    final_confidence: float
    decision: str
    # Verification metadata
    is_verified: bool = False
    verification_type: Optional[str] = None   # "AI" | "MANUAL"
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    activity_status: Optional[str] = None
    file_name: Optional[str] = None
    source_type: Optional[str] = None
    has_file: bool = False
    file_url: Optional[str] = None


class ApprovePayload(BaseModel):
    activity_status: Optional[str] = None    # "COMPLETED" | "IN_PROGRESS"
    actual_finish: Optional[date] = None
    notes: Optional[str] = None


class RelinkPayload(BaseModel):
    activity_id: str  # Either L6 code like 'L6-PIP-101' or database ID
    actual_start: Optional[date] = None


class RejectPayload(BaseModel):
    reason: Optional[str] = "Marked rejected by planning engineer"


@router.get("/queue", response_model=List[MatchQueueItem])
def get_review_queue(
    tier: Optional[str] = Query(None, description="ALL | REVIEW | VERIFIED | UNMATCHED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List candidate AI matches for planner review.
    tier=REVIEW   -> only pending matches needing sign-off
    tier=VERIFIED -> auto-linked & manually approved matches
    tier=UNMATCHED-> rejected / low-confidence
    tier=ALL or omitted -> everything
    """
    if tier == "VERIFIED":
        matches = (
            db.query(Match)
            .filter(Match.decision == DecisionEnum.AUTO)
            .order_by(Match.created_at.desc())
            .all()
        )
    elif tier == "UNMATCHED":
        matches = (
            db.query(Match)
            .filter(Match.decision == DecisionEnum.REJECTED)
            .order_by(Match.created_at.desc())
            .all()
        )
    elif tier == "REVIEW":
        matches = (
            db.query(Match)
            .filter(Match.decision == DecisionEnum.REVIEW)
            .order_by(Match.created_at.desc())
            .all()
        )
    else:  # ALL or None — default view shows REVIEW + REJECTED in queue
        matches = (
            db.query(Match)
            .filter(Match.decision.in_([DecisionEnum.REVIEW, DecisionEnum.REJECTED]))
            .order_by(Match.created_at.desc())
            .all()
        )

    results = []
    for m in matches:
        rep = m.report
        act = m.activity
        if not act or not rep:
            continue

        raw_snippet = rep.raw_text[:200] if rep.raw_text else "No snippet"
        uploader_name = rep.uploader.name if rep.uploader else "Site Supervisor"

        # Check if this match has been verified (has a progress event linked)
        linked_event = (
            db.query(ProgressEvent)
            .filter(
                ProgressEvent.activity_id == act.id,
                ProgressEvent.source_report_id == rep.id,
            )
            .order_by(ProgressEvent.created_at.desc())
            .first()
        )
        is_verified = linked_event is not None
        verification_type = None
        verified_by_name = None
        verified_at_str = None
        if linked_event:
            # Check audit log for verification type
            audit = (
                db.query(AuditLog)
                .filter(AuditLog.progress_event_id == linked_event.id)
                .order_by(AuditLog.timestamp.desc())
                .first()
            )
            if audit and audit.new_value:
                verification_type = audit.new_value.get("verification_type", "AI")
            verified_at_str = str(linked_event.created_at.date()) if linked_event.created_at else None
            if linked_event.approved_by:
                approver = db.query(User).filter(User.id == linked_event.approved_by).first()
                verified_by_name = approver.name if approver else f"User #{linked_event.approved_by}"
            else:
                verified_by_name = "AI Auto-Match"

        results.append(
            MatchQueueItem(
                match_id=m.id,
                report_id=rep.id,
                report_snippet=raw_snippet,
                report_date=str(rep.uploaded_at.date()) if rep.uploaded_at else "2026-02-10",
                supervisor=uploader_name,
                discipline=act.discipline.value if act.discipline else "General",
                location=act.location or "Site Area",
                extracted_fields=ExtractedFieldsSummary(
                    action=raw_snippet[:60],
                    line_ref=None,
                    quantity="Completed" if act.status == "COMPLETED" else "In Progress",
                    date=str(rep.uploaded_at.date()) if rep.uploaded_at else "2026-02-10",
                ),
                suggested_activity=SuggestedActivitySummary(
                    id=act.id,
                    activity_id=act.activity_id,
                    activity_name=act.activity_name,
                    wbs_code=act.wbs_code,
                    planned_start=act.planned_start,
                    planned_finish=act.planned_finish,
                    current_status=act.status,
                ),
                signals=SignalBreakdown(
                    semantic=m.semantic_score,
                    entity=m.entity_score,
                    metadata=m.metadata_score,
                ),
                final_confidence=m.final_confidence,
                decision=m.decision.value,
                is_verified=is_verified,
                verification_type=verification_type,
                verified_by=verified_by_name,
                verified_at=verified_at_str,
                activity_status=act.status,
                file_name=rep.file_name,
                source_type=rep.source_type.value if rep.source_type else "text",
                has_file=(rep.source_type.value != "text") or (bool(rep.file_name) and not rep.file_name.endswith(".txt")),
                file_url=f"/api/ingestion/report/{rep.id}/file",
            )
        )
    return results


@router.post("/{match_id}/approve", status_code=status.HTTP_200_OK)
def approve_match(
    match_id: int,
    payload: Optional[ApprovePayload] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve candidate match and write back actual dates to the baseline schedule.
    Accepts optional payload to specify COMPLETED vs IN_PROGRESS and actual_finish date.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match record not found.")

    # Determine actual_finish from payload or leave None (linking service will auto-detect from report text)
    actual_finish = None
    if payload:
        if payload.activity_status == "COMPLETED" and payload.actual_finish:
            actual_finish = payload.actual_finish

    progress_event = apply_match_link(
        match=match,
        approved_by_user_id=current_user.id,
        db=db,
        action_note="MANUAL_APPROVE",
        actual_finish=actual_finish,
    )

    # Refresh activity status after commit
    db.refresh(match.activity)

    # Trigger real-time notification to supervisor
    if match.report and match.report.uploaded_by:
        try:
            from app.notifications.service import create_notification
            create_notification(
                db=db,
                user_id=match.report.uploaded_by,
                title="Field Report Verified & Approved",
                message=f"Your progress report #{match.report.id} was approved by {current_user.name}. Activity {match.activity.activity_id} updated to {match.activity.status}.",
                notif_type="APPROVAL",
                link=f"/supervisor/submissions/{match.report.id}",
            )
        except Exception as e:
            pass

    return {
        "success": True,
        "message": f"Match #{match_id} approved into ProgressEvent #{progress_event.id}.",
        "activity_id": match.activity.activity_id if match.activity else None,
        "activity_name": match.activity.activity_name if match.activity else None,
        "status": match.activity.status if match.activity else "COMPLETED",
        "confidence": match.final_confidence,
        "verification_type": "MANUAL",
        "verified_by": current_user.name,
    }


@router.post("/{match_id}/reject", status_code=status.HTTP_200_OK)
def reject_match(
    match_id: int,
    payload: Optional[RejectPayload] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject candidate match and log audit trail without updating schedule actuals.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match record not found.")

    match.decision = DecisionEnum.REJECTED
    reason = payload.reason if payload else "Rejected by planner"

    # Audit log entry for rejection
    audit_entry = AuditLog(
        progress_event_id=None,  # Denotes rejection without a progress event
        actor=current_user.id,
        action="REJECT_MATCH",
        old_value={"match_id": match.id, "confidence": match.final_confidence},
        new_value={"decision": "rejected", "reason": reason, "verification_type": "MANUAL"},
    )
    db.add(audit_entry)
    db.commit()

    # Trigger real-time notification to supervisor
    if match.report and match.report.uploaded_by:
        try:
            from app.notifications.service import create_notification
            create_notification(
                db=db,
                user_id=match.report.uploaded_by,
                title="Field Report Held / Rejected",
                message=f"Candidate match for report #{match.report.id} was held: {reason}",
                notif_type="REJECTION",
                link=f"/supervisor/submissions/{match.report.id}",
            )
        except Exception as e:
            pass

    return {"success": True, "message": f"Match #{match_id} marked as rejected / held."}



@router.post("/{match_id}/relink", status_code=status.HTTP_200_OK)
def relink_match(
    match_id: int,
    payload: RelinkPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Relink report progress event to a different planner-selected baseline activity.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match record not found.")

    # Find target activity by activity_id code or integer id
    if payload.activity_id.isdigit():
        target_act = (
            db.query(Activity)
            .filter((Activity.activity_id == payload.activity_id) | (Activity.id == int(payload.activity_id)))
            .first()
        )
    else:
        target_act = db.query(Activity).filter(Activity.activity_id == payload.activity_id).first()
    if not target_act:
        raise HTTPException(status_code=404, detail=f"Target activity '{payload.activity_id}' not found.")

    progress_event = apply_match_link(
        match=match,
        approved_by_user_id=current_user.id,
        db=db,
        target_activity_id=target_act.id,
        actual_start=payload.actual_start,
        action_note=f"RELINK_TO_{target_act.activity_id}",
    )

    return {
        "success": True,
        "message": f"Match #{match_id} relinked to activity {target_act.activity_id}.",
        "new_activity_id": target_act.activity_id,
    }
