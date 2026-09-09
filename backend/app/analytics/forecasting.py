"""
SIH26122 Task 2: Historical Project Forecasting Module
Benchmarks ongoing activities against closed project actuals in `historical_activities`
to calculate historical average durations and flag 'at_risk' schedule items.
"""

import re
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.activity import Activity
from app.models.historical_activity import HistoricalActivity


class ForecastResult(BaseModel):
    activity_id: str
    activity_name: str
    discipline: str
    historical_average_days: float
    matched_historical_count: int
    planned_duration_days: Optional[int] = None
    elapsed_days: int
    forecast_status: str  # "at_risk" | "on_track_per_history"
    reason: str


def _extract_keywords(text: str) -> set:
    """Extract informative lowercase keywords (words with 3+ letters and numbers)."""
    words = re.findall(r"\b[a-zA-Z0-9]{2,}\b", text.lower())
    stop_words = {"the", "and", "for", "with", "from", "near", "area", "unit", "line"}
    return {w for w in words if w not in stop_words}


def forecast_activity_completion(activity_id: int | str, db: Session) -> Optional[ForecastResult]:
    """
    Forecasting from historical projects:
    a. Load the current activity's discipline and activity_name.
    b. Find similar historical activities: same discipline, and activity_name similarity
       via token overlap on discipline + action/type/diameter.
    c. Compute the average actual_duration_days across matched historical activities.
    d. Compare against current activity's planned duration and elapsed days since actual_start.
       If elapsed time already exceeds historical average and activity isn't complete,
       flag forecast_status = 'at_risk'; otherwise 'on_track_per_history'.
    e. Return ForecastResult with historical_average_days, matched_historical_count,
       forecast_status, and plain-language explanation.
    """
    # 1. Resolve activity
    if isinstance(activity_id, int):
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
    else:
        activity = db.query(Activity).filter(Activity.activity_id == str(activity_id)).first()

    if not activity:
        return None

    disc_str = ""
    if activity.discipline:
        disc_str = activity.discipline.value if hasattr(activity.discipline, "value") else str(activity.discipline)
    disc_name = disc_str.capitalize() or "General"

    # 2. Query historical activities in same discipline
    hist_candidates = (
        db.query(HistoricalActivity)
        .filter(HistoricalActivity.discipline.ilike(f"%{disc_str}%"))
        .all()
    )

    if not hist_candidates:
        # Fallback to all historical activities if discipline has no records
        hist_candidates = db.query(HistoricalActivity).all()

    # 3. Match similar historical activities by keyword & token overlap
    act_keywords = _extract_keywords(activity.activity_name)
    scored_matches: List[tuple[int, HistoricalActivity]] = []

    for h in hist_candidates:
        h_keywords = _extract_keywords(h.activity_name)
        overlap = len(act_keywords.intersection(h_keywords))

        # Check for specific diameter match (e.g. 24, 12, 16, 31)
        for kw in act_keywords:
            if kw.isdigit() and (kw in h.activity_name or (h.pipe_diameter_in and int(h.pipe_diameter_in) == int(kw))):
                overlap += 2

        if overlap > 0:
            scored_matches.append((overlap, h))

    # If specific keyword matches exist, use them; otherwise fallback to discipline records
    matched_records: List[HistoricalActivity] = []
    if scored_matches:
        scored_matches.sort(key=lambda x: x[0], reverse=True)
        # Keep items with score >= max(1, best_score - 1)
        best_score = scored_matches[0][0]
        matched_records = [h for score, h in scored_matches if score >= max(1, best_score - 1)]
    else:
        matched_records = hist_candidates

    # Filter for valid actual_duration_days
    durations = [
        h.actual_duration_days
        for h in matched_records
        if h.actual_duration_days is not None and h.actual_duration_days > 0
    ]

    if durations:
        historical_avg = round(float(sum(durations) / len(durations)), 1)
        matched_count = len(durations)
    else:
        historical_avg = 5.0
        matched_count = 0

    # 4. Planned duration calculation
    planned_duration = None
    if activity.planned_finish and activity.planned_start:
        planned_duration = (activity.planned_finish - activity.planned_start).days
        if planned_duration <= 0:
            planned_duration = 1

    # 5. Elapsed time calculation
    elapsed_days = 0
    ref_date = date.today()
    if activity.actual_start:
        if activity.actual_finish:
            elapsed_days = max(1, (activity.actual_finish - activity.actual_start).days)
        else:
            elapsed_days = max(1, (ref_date - activity.actual_start).days)
    elif activity.status in ("IN_PROGRESS", "DELAYED") and activity.planned_start:
        # Fallback to planned_start if actual_start not yet explicitly linked
        elapsed_days = max(1, (ref_date - activity.planned_start).days)

    is_completed = (activity.status == "COMPLETED")

    # 6. Determine forecast status
    if not is_completed and elapsed_days > historical_avg:
        forecast_status = "at_risk"
        reason = (
            f"Similar {disc_name} activities historically averaged {historical_avg} days; "
            f"this one is on day {elapsed_days} and not yet complete"
        )
    else:
        forecast_status = "on_track_per_history"
        if is_completed:
            reason = (
                f"Activity completed in {elapsed_days} days "
                f"(similar {disc_name} activities historically averaged {historical_avg} days)"
            )
        elif elapsed_days > 0:
            reason = (
                f"Similar {disc_name} activities historically averaged {historical_avg} days; "
                f"this one is currently on day {elapsed_days} and progressing within historical norms"
            )
        else:
            reason = (
                f"Similar {disc_name} activities historically averaged {historical_avg} days "
                f"(planned duration: {planned_duration or 'N/A'} days)"
            )

    return ForecastResult(
        activity_id=activity.activity_id,
        activity_name=activity.activity_name,
        discipline=disc_name,
        historical_average_days=historical_avg,
        matched_historical_count=matched_count,
        planned_duration_days=planned_duration,
        elapsed_days=elapsed_days,
        forecast_status=forecast_status,
        reason=reason,
    )
