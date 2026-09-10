"""
ScheduleSync Out-of-Sequence Detection Module
Monitors progress updates and flags sequence violations when an activity starts or completes
before its required predecessor has reached COMPLETED status.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import Base
from app.models.activity import Activity
from app.models.progress_event import ProgressEvent


class SequenceViolation(Base):
    """
    Sequence violation tracking table.
    Records incidents where an activity started/completed before its predecessor was marked complete.
    """
    __tablename__ = "sequence_violations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    activity_id = Column(String(100), nullable=False, index=True)
    activity_name = Column(String(500), nullable=True)
    predecessor_activity_id = Column(String(100), nullable=False, index=True)
    predecessor_name = Column(String(500), nullable=True)
    predecessor_status = Column(String(50), nullable=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(Integer, nullable=True)


class SequenceViolationResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    activity_id: str
    activity_name: Optional[str] = None
    predecessor_activity_id: str
    predecessor_name: Optional[str] = None
    predecessor_status: Optional[str] = None
    detected_at: datetime
    acknowledged: bool

    class Config:
        from_attributes = True


def check_sequence_violation(
    activity_id: int | str,
    db: Session,
    actor_user_id: Optional[int] = None,
) -> Optional[SequenceViolation]:
    """
    Check if an activity's progress violates predecessor sequence.
    When a progress_event marks an activity as 'started' or 'completed', check its predecessor_activity_id.
    If the predecessor exists and does NOT yet have a completed progress_event (or status 'COMPLETED'),
    this is a sequence violation — creates a record in sequence_violations and returns it.
    """
    # 1. Resolve activity
    if isinstance(activity_id, int):
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
    else:
        activity = db.query(Activity).filter(Activity.activity_id == str(activity_id)).first()

    if not activity or not activity.predecessor_activity_id:
        return None

    # 2. Query predecessor activity
    predecessor = (
        db.query(Activity)
        .filter(
            Activity.project_id == activity.project_id,
            Activity.activity_id == activity.predecessor_activity_id,
        )
        .first()
    )

    if not predecessor:
        return None

    # 3. Check predecessor completion
    has_completed_event = (
        db.query(ProgressEvent)
        .filter(
            ProgressEvent.activity_id == predecessor.id,
            ProgressEvent.status == "COMPLETED",
        )
        .first()
        is not None
    )

    is_predecessor_complete = (predecessor.status == "COMPLETED") or has_completed_event

    if not is_predecessor_complete:
        # Check if already recorded and unacknowledged to prevent duplicate alerts
        existing = (
            db.query(SequenceViolation)
            .filter(
                SequenceViolation.activity_id == activity.activity_id,
                SequenceViolation.predecessor_activity_id == predecessor.activity_id,
                SequenceViolation.acknowledged == False,
            )
            .first()
        )
        if existing:
            return existing

        violation = SequenceViolation(
            project_id=activity.project_id,
            activity_id=activity.activity_id,
            activity_name=activity.activity_name,
            predecessor_activity_id=predecessor.activity_id,
            predecessor_name=predecessor.activity_name,
            predecessor_status=predecessor.status or "NOT_STARTED",
            detected_at=datetime.now(timezone.utc),
            acknowledged=False,
        )
        db.add(violation)
        db.commit()
        db.refresh(violation)
        return violation

    return None
