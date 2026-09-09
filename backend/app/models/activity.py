from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base
from app.models.enums import DisciplineEnum


class Activity(Base):
    """
    Baseline project schedule activity (WBS Levels L1-L6).
    Imported from Primavera (.xer) or MS Project export (.xlsx).
    """
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_id = Column(String(100), nullable=False, index=True)  # e.g., "PIP-L6-024"
    parent_id = Column(
        Integer, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    predecessor_activity_id = Column(String(100), nullable=True, index=True)  # e.g., "L6-PIP-101"
    wbs_code = Column(String(100), nullable=True)
    activity_name = Column(String(500), nullable=False)
    discipline = Column(
        Enum(DisciplineEnum, name="discipline_enum", native_enum=False),
        nullable=True,
        index=True,
    )
    location = Column(String(255), nullable=True)
    planned_start = Column(Date, nullable=True)
    planned_finish = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_finish = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="PLANNED", index=True)


    # --------------------------------------------------------------------------
    # EMBEDDING COLUMN (Vector dimension 384 for all-MiniLM-L6-v2)
    # NOTE FOR TEAM: Owned and populated by Member B (Extraction) and Member C (Matching).
    # Member A scaffolds this column as nullable; Member A code does not write to it.
    # --------------------------------------------------------------------------
    embedding = Column(Vector(384), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="activities")
    parent = relationship("Activity", remote_side=[id], backref="children")
    matches = relationship("Match", back_populates="activity", cascade="all, delete-orphan")
    progress_events = relationship(
        "ProgressEvent", back_populates="activity", cascade="all, delete-orphan"
    )
    embedding_entry = relationship(
        "ActivityEmbedding",
        back_populates="activity",
        uselist=False,
        cascade="all, delete-orphan",
    )


class ActivityEmbedding(Base):
    """
    Dedicated embeddings table for activities if decoupled retrieval is preferred.
    NOTE FOR TEAM: Owned by Member B/C for vector retrieval and semantic similarity matching.
    """
    __tablename__ = "activity_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(
        Integer,
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    embedding = Column(Vector(384), nullable=True)
    model_name = Column(String(100), default="all-MiniLM-L6-v2", nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    activity = relationship("Activity", back_populates="embedding_entry")
