from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import SourceTypeEnum


class Report(Base):
    """
    Daily site progress report upload.
    NOTE FOR TEAM: Scaffolded by Member A. Populated by Member B (Ingestion & Extraction).
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name = Column(String(255), nullable=False)
    source_type = Column(
        Enum(SourceTypeEnum, name="source_type_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    uploaded_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    raw_text = Column(Text, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="reports")
    uploader = relationship("User", back_populates="uploaded_reports")
    matches = relationship("Match", back_populates="report", cascade="all, delete-orphan")
    progress_events = relationship(
        "ProgressEvent", back_populates="source_report", cascade="all, delete-orphan"
    )
