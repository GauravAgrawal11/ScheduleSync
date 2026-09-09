"""
Member C: Matching Engine.
Calculates 3 independent signals:
1. semantic_score (embedding similarity: report description vs activity name)
2. entity_score (exact/fuzzy match of line, discipline, location)
3. metadata_score (WBS/context consistency)
Produces final_confidence and populates the `matches` table.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.match import Match
from app.schemas.match import MatchCreateScaffold, MatchResponse

router = APIRouter(prefix="/matching", tags=["Member C: Matching"])


@router.post(
    "/score",
    response_model=MatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Score candidate match (Member C)",
    description="Calculates 3-signal composite confidence and persists the candidate match.",
)
def score_candidate(
    match_in: MatchCreateScaffold,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match_obj = Match(
        report_id=match_in.report_id,
        activity_id=match_in.activity_id,
        semantic_score=match_in.semantic_score,
        entity_score=match_in.entity_score,
        metadata_score=match_in.metadata_score,
        final_confidence=match_in.final_confidence,
        decision=match_in.decision,
    )
    db.add(match_obj)
    db.commit()
    db.refresh(match_obj)
    return match_obj
