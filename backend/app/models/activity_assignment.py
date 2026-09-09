import enum
from sqlalchemy import Column, Integer, Float, String, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AssignmentSourceEnum(str, enum.Enum):
    AUTO = "auto"
    MANUAL = "manual"


class ActivityAssignment(Base):
    """
    Supervisor assignment for baseline schedule activities.
    Supports auto-assignment with weekly workload balancing and manual overrides by planners.
    """
    __tablename__ = "activity_assignments"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(
        Integer,
        ForeignKey("activities.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    supervisor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_week = Column(Integer, nullable=False, index=True)
    planned_duration_days = Column(Float, nullable=False)
    assignment_source = Column(
        Enum(AssignmentSourceEnum, name="assignment_source_enum", native_enum=False),
        nullable=False,
        default=AssignmentSourceEnum.AUTO,
    )
    assigned_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    previous_supervisor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    activity = relationship("Activity", backref="assignment")
    supervisor = relationship("User", foreign_keys=[supervisor_id], backref="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])
    previous_supervisor = relationship("User", foreign_keys=[previous_supervisor_id])


class ActivityAssignmentHistory(Base):
    """
    Immutable audit history of supervisor assignments and manual reassignments.
    Oldest to newest chronological event log.
    """
    __tablename__ = "activity_assignment_history"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(
        Integer,
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supervisor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_supervisor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assignment_source = Column(
        Enum(AssignmentSourceEnum, name="assignment_source_enum", native_enum=False),
        nullable=False,
    )
    assigned_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    reason = Column(String(500), nullable=True)

    # Relationships
    activity = relationship("Activity", backref="assignment_history")
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    previous_supervisor = relationship("User", foreign_keys=[previous_supervisor_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
