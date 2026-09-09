from sqlalchemy import Column, Integer, String, DateTime, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import UserRoleEnum


class User(Base):
    """User account model supporting role-based access control."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRoleEnum, name="user_role_enum", native_enum=False),
        nullable=False,
        default=UserRoleEnum.SUPERVISOR,
    )
    discipline = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    uploaded_reports = relationship("Report", back_populates="uploader", foreign_keys="Report.uploaded_by")
    approved_events = relationship("ProgressEvent", back_populates="approver", foreign_keys="ProgressEvent.approved_by")
    audit_entries = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.actor")
