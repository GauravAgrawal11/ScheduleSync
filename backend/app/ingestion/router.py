"""
Member B: Report Ingestion Router
Provides endpoints for site supervisors to submit progress reports (text, files, voice),
triggers document parsing, entity extraction, and coordinates with Member C's matching engine.
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.report import Report
from app.models.match import Match
from app.models.progress_event import ProgressEvent
from app.models.audit_log import AuditLog
from app.models.enums import SourceTypeEnum, DecisionEnum
from app.parsing.service import extract_raw_text
from app.extraction.service import extract_events_from_text
from app.extraction.schemas import ExtractedEvent

router = APIRouter(tags=["Ingestion"])


class IngestReportResponse(BaseModel):
    report_id: int
    status: str
    message: str
    extracted_events: List[ExtractedEvent]
    suggested_match: Optional[dict] = None


class MatchLogEntry(BaseModel):
    """Full match log for a single candidate match — shown in supervisor's match history."""
    match_id: int
    activity_id: str
    activity_name: str
    wbs_code: Optional[str] = None
    semantic_score: float
    entity_score: float
    metadata_score: float
    final_confidence: float
    decision: str                         # "auto" | "review" | "rejected"
    is_verified: bool = False
    verification_type: Optional[str] = None   # "AI" | "MANUAL"
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    activity_status: Optional[str] = None
    matched_at: str


class ReportItemResponse(BaseModel):
    id: int
    project_id: int
    file_name: str
    source_type: str
    raw_text: Optional[str] = None
    uploaded_at: datetime
    # Match summary (best / most recent match)
    status: str = "pending review"
    confidence: float = 0.0
    suggested_activity_id: Optional[str] = None
    suggested_activity_name: Optional[str] = None
    # Full match log
    match_log: List[MatchLogEntry] = []
    is_verified: bool = False
    verification_type: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    activity_status: Optional[str] = None


def _build_match_log(report: Report, db: Session) -> tuple:
    """
    Build the full match log list for a given report.
    Returns (status_label, conf, act_id, act_name, is_verified, verification_type, verified_by, verified_at, activity_status, match_log_entries)
    """
    match_log_entries: List[MatchLogEntry] = []

    status_label = "pending review"
    conf = 0.0
    act_id = None
    act_name = None
    is_verified_global = False
    verification_type_global = None
    verified_by_global = None
    verified_at_global = None
    activity_status_global = None

    for m in report.matches:
        act = m.activity
        if not act:
            continue

        # Find linked progress event for this match
        linked_event = (
            db.query(ProgressEvent)
            .filter(
                ProgressEvent.activity_id == act.id,
                ProgressEvent.source_report_id == report.id,
            )
            .order_by(ProgressEvent.created_at.desc())
            .first()
        )
        is_verified = linked_event is not None
        verification_type = None
        verified_by_name = None
        verified_at_str = None

        if linked_event:
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
                verified_by_name = approver.name if approver else "Planner"
            else:
                verified_by_name = "AI Auto-Match"

        match_log_entries.append(MatchLogEntry(
            match_id=m.id,
            activity_id=act.activity_id,
            activity_name=act.activity_name,
            wbs_code=act.wbs_code,
            semantic_score=m.semantic_score,
            entity_score=m.entity_score,
            metadata_score=m.metadata_score,
            final_confidence=m.final_confidence,
            decision=m.decision.value,
            is_verified=is_verified,
            verification_type=verification_type,
            verified_by=verified_by_name,
            verified_at=verified_at_str,
            activity_status=act.status,
            matched_at=str(m.created_at.date()) if m.created_at else "",
        ))

    # Sort: verified first, then by confidence desc
    match_log_entries.sort(key=lambda x: (-int(x.is_verified), -x.final_confidence))

    # Populate summary from best match
    if match_log_entries:
        best = match_log_entries[0]
        conf = best.final_confidence
        act_id = best.activity_id
        act_name = best.activity_name
        is_verified_global = best.is_verified
        verification_type_global = best.verification_type
        verified_by_global = best.verified_by
        verified_at_global = best.verified_at
        activity_status_global = best.activity_status

        if best.is_verified:
            status_label = "matched"
        elif best.decision == "auto":
            status_label = "matched"
        elif best.decision == "review":
            status_label = "pending review"
        else:
            status_label = "rejected"

    return (
        status_label, conf, act_id, act_name,
        is_verified_global, verification_type_global, verified_by_global,
        verified_at_global, activity_status_global, match_log_entries,
    )


@router.post("/report", response_model=IngestReportResponse, status_code=status.HTTP_201_CREATED)
async def ingest_report(
    project_id: int = Form(1),
    text: Optional[str] = Form(None),
    extracted_text: Optional[str] = Form(None),
    discipline: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    shift: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingest a site progress report from free text, photo scan, PDF, Excel, or audio text.
    Parses document, extracts structured activity event, and matches against baseline schedule.
    """
    input_text = text or extracted_text
    if not input_text and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'text' or 'file' must be provided in the report submission.",
        )

    raw_text = ""
    source_type = SourceTypeEnum.TEXT
    file_name = "direct_text_entry.txt"

    if file:
        file_bytes = await file.read()
        file_name = file.filename or "uploaded_report"
        ext = file_name.split(".")[-1].lower() if "." in file_name else ""

        if ext in ("xlsx", "xls"):
            source_type = SourceTypeEnum.XLSX
        elif ext == "pdf":
            source_type = SourceTypeEnum.PDF
        elif ext in ("jpg", "jpeg", "png", "webp"):
            source_type = SourceTypeEnum.SCAN
        elif ext in ("csv", "txt"):
            source_type = SourceTypeEnum.TEXT
        elif ext in ("mp3", "wav", "webm", "ogg", "m4a"):
            source_type = SourceTypeEnum.VOICE

        extracted_file_text = extract_raw_text(file_bytes, file_name, source_type=source_type.value)
        raw_text = f"{input_text}\n\n{extracted_file_text}" if input_text else extracted_file_text
    else:
        raw_text = input_text or ""

    # 1. Create Report row in database
    report = Report(
        project_id=project_id,
        file_name=file_name,
        source_type=source_type,
        raw_text=raw_text,
        uploaded_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 2. Extract structured activity events
    extracted_events = extract_events_from_text(raw_text)

    # 3. Coordinate with Member C's matching engine
    suggested_match_data = None
    try:
        from app.matching.service import match_and_score_event

        if extracted_events:
            primary_event = extracted_events[0]
            candidate = match_and_score_event(
                extracted_event=primary_event,
                report_id=report.id,
                project_id=project_id,
                current_user_id=current_user.id,
                db=db,
            )
            if candidate:
                suggested_match_data = {
                    "match_id": candidate.id,
                    "activity_id": candidate.activity.activity_id,
                    "activity_name": candidate.activity.activity_name,
                    "confidence": candidate.final_confidence,
                    "decision": candidate.decision.value,
                }
    except Exception:
        # Graceful fallback if matching encounters uncommitted project activities
        pass

    # SIH26122 Task 3: HSE auto-tagging check (side effect without altering return shape)
    try:
        from app.extraction.hse import check_and_tag_hse
        matched_act_pk = candidate.activity_id if ('candidate' in locals() and candidate) else None
        check_and_tag_hse(
            raw_text=raw_text,
            supervisor_id=current_user.id,
            project_id=project_id,
            activity_id=matched_act_pk,
            db=db,
        )
    except Exception:
        pass

    return IngestReportResponse(
        report_id=report.id,
        status="PROCESSED",
        message="Report ingested and structured events extracted.",
        extracted_events=extracted_events,
        suggested_match=suggested_match_data,
    )


@router.get("/mine", response_model=List[ReportItemResponse])
def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all reports uploaded by the current user with full match logs."""
    reports = (
        db.query(Report)
        .filter(Report.uploaded_by == current_user.id)
        .order_by(Report.uploaded_at.desc())
        .all()
    )

    results = []
    for r in reports:
        (
            status_label, conf, act_id, act_name,
            is_verified, verification_type, verified_by, verified_at, activity_status,
            match_log_entries,
        ) = _build_match_log(r, db)

        results.append(
            ReportItemResponse(
                id=r.id,
                project_id=r.project_id,
                file_name=r.file_name,
                source_type=r.source_type.value,
                raw_text=r.raw_text,
                uploaded_at=r.uploaded_at,
                status=status_label,
                confidence=conf,
                suggested_activity_id=act_id,
                suggested_activity_name=act_name,
                match_log=match_log_entries,
                is_verified=is_verified,
                verification_type=verification_type,
                verified_by=verified_by,
                verified_at=verified_at,
                activity_status=activity_status,
            )
        )
    return results


@router.get("/{id}", response_model=ReportItemResponse)
def get_report_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full detail for a single report submission including complete match log."""
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    (
        status_label, conf, act_id, act_name,
        is_verified, verification_type, verified_by, verified_at, activity_status,
        match_log_entries,
    ) = _build_match_log(report, db)

    return ReportItemResponse(
        id=report.id,
        project_id=report.project_id,
        file_name=report.file_name,
        source_type=report.source_type.value,
        raw_text=report.raw_text,
        uploaded_at=report.uploaded_at,
        status=status_label,
        confidence=conf,
        suggested_activity_id=act_id,
        suggested_activity_name=act_name,
        match_log=match_log_entries,
        is_verified=is_verified,
        verification_type=verification_type,
        verified_by=verified_by,
        verified_at=verified_at,
        activity_status=activity_status,
    )
