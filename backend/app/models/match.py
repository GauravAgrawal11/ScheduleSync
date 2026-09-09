from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import DecisionEnum


class Match(Base):
    """
    Candidate match scored between extracted progress report entity and planned activity.
    Combines three independent signals: semantic, entity, and metadata scores.
    NOTE FOR TEAM: Scaffolded by Member A. Populated by Member C (Matching & Analytics).
    """
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(
        Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_id = Column(
        Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    semantic_score = Column(Float, nullable=False, comment="Embedding similarity score")
    entity_score = Column(Float, nullable=False, comment="Exact/fuzzy entity match score")
    metadata_score = Column(Float, nullable=False, comment="WBS/context consistency score")
    final_confidence = Column(
        Float, nullable=False, comment="Weighted sum: >0.90 auto, 0.70-0.90 review, <0.70 rejected"
    )
    decision = Column(
        Enum(DecisionEnum, name="decision_enum", native_enum=False),
        nullable=False,
        default=DecisionEnum.REVIEW,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    report = relationship("Report", back_populates="matches")
    activity = relationship("Activity", back_populates="matches")
