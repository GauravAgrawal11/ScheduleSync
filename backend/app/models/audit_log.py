from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    """
    Immutable audit log for schedule changes and progress event decisions.
    Ensures full traceability for planners, supervisors, and SIH judges.
    NOTE FOR TEAM: Scaffolded by Member A. Populated by Member C.
    """
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    progress_event_id = Column(
        Integer, ForeignKey("progress_events.id", ondelete="CASCADE"), nullable=True, index=True
    )
    actor = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # e.g., "AUTO_APPROVE", "MANUAL_APPROVE", "REJECT"
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    progress_event = relationship("ProgressEvent", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_entries")
