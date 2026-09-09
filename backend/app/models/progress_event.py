from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import EventTypeEnum


class ProgressEvent(Base):
    """
    Accepted actual progress event updating the baseline schedule.
    NOTE FOR TEAM: Scaffolded by Member A. Populated and linked by Member C.
    """
    __tablename__ = "progress_events"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(
        Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_report_id = Column(
        Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type = Column(
        Enum(EventTypeEnum, name="event_type_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    actual_start = Column(Date, nullable=True)
    actual_finish = Column(Date, nullable=True)
    status = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    approved_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    activity = relationship("Activity", back_populates="progress_events")
    source_report = relationship("Report", back_populates="progress_events")
    approver = relationship("User", back_populates="approved_events")
    audit_logs = relationship(
        "AuditLog", back_populates="progress_event", cascade="all, delete-orphan"
    )
