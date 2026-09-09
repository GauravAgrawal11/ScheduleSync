import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ComplaintCategoryEnum(str, enum.Enum):
    MATERIAL_DELAY = "material_delay"
    EQUIPMENT_BREAKDOWN = "equipment_breakdown"
    MANPOWER_SHORTAGE = "manpower_shortage"
    ACCESS_BLOCKED = "access_blocked"
    SAFETY_CONCERN = "safety_concern"
    WEATHER = "weather"
    OTHER = "other"


class ComplaintStatusEnum(str, enum.Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class Complaint(Base):
    """
    Supervisor operational blocker and site complaint tracking.
    Allows supervisors to report blockers tied to specific schedule activities or general site conditions.
    """
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_id = Column(
        Integer, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    supervisor_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category = Column(
        Enum(ComplaintCategoryEnum, name="complaint_category_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    description = Column(String(2000), nullable=False)
    status = Column(
        Enum(ComplaintStatusEnum, name="complaint_status_enum", native_enum=False),
        nullable=False,
        default=ComplaintStatusEnum.OPEN,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    project = relationship("Project")
    activity = relationship("Activity", backref="complaints")
    supervisor = relationship("User", foreign_keys=[supervisor_id], backref="complaints_raised")
    resolver = relationship("User", foreign_keys=[resolved_by])
