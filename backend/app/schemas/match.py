from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import DecisionEnum


class MatchCreateScaffold(BaseModel):
    """
    Schema scaffold for Member C: 3-signal candidate match submission.
    """
    report_id: int = Field(..., description="Foreign key linking to source Report ID", examples=[10])
    activity_id: int = Field(..., description="Foreign key linking to candidate Activity ID", examples=[42])
    semantic_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Embedding similarity score between report description and activity name (0.0 to 1.0)",
        examples=[0.91],
    )
    entity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Deterministic exact/fuzzy match of extracted entities (line, discipline, location)",
        examples=[1.0],
    )
    metadata_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="WBS and operational context consistency score",
        examples=[0.85],
    )
    final_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Weighted combined confidence score (>0.90: auto, 0.70-0.90: review, <0.70: rejected)",
        examples=[0.94],
    )
    decision: DecisionEnum = Field(
        default=DecisionEnum.REVIEW,
        description="Triage decision tier based on confidence threshold",
        examples=["auto"],
    )


class MatchResponse(MatchCreateScaffold):
    """
    Schema for Member C: Scored match candidate record response.
    """
    id: int = Field(..., description="Unique Match record ID", examples=[101])
    created_at: datetime = Field(..., description="Timestamp of scoring")

    model_config = ConfigDict(from_attributes=True)
