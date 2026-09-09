"""
SIH26122 Task 3: HSE Auto-Tagging Service
Scans raw report text for health, safety, and environmental (HSE) keywords.
Automatically logs a safety_concern in the complaints table without altering
the extraction pipeline's return shape or behavior for non-HSE reports.
"""

import re
import logging
from typing import Optional, List
from sqlalchemy.orm import Session

from app.complaints.models import Complaint, ComplaintCategoryEnum, ComplaintStatusEnum

logger = logging.getLogger(__name__)

# Named, editable constant for HSE-relevant safety keywords
HSE_KEYWORDS: List[str] = [
    "near miss",
    "injury",
    "ppe",
    "spill",
    "unsafe",
    "hazard",
]


def check_and_tag_hse(
    raw_text: str,
    supervisor_id: int,
    project_id: int,
    activity_id: Optional[int] = None,
    db: Optional[Session] = None,
) -> Optional[Complaint]:
    """
    Check if raw report text contains HSE-relevant keywords.
    If matched, automatically creates a row in the existing complaints table with:
    - category="safety_concern"
    - supervisor_id from the report author
    - activity_id if one was matched
    - description = concise excerpt of flagged text
    Avoids duplicate entries if already filed.
    """
    if not raw_text or not db or not supervisor_id:
        return None

    raw_lower = raw_text.lower()

    # Check for keyword occurrence
    matched_keyword = None
    for kw in HSE_KEYWORDS:
        if kw in raw_lower:
            matched_keyword = kw
            break

    if not matched_keyword:
        return None

    # Extract an excerpt around the matched keyword (up to 200 chars)
    idx = raw_lower.find(matched_keyword)
    start_pos = max(0, idx - 40)
    end_pos = min(len(raw_text), idx + len(matched_keyword) + 120)
    excerpt = raw_text[start_pos:end_pos].strip()
    if start_pos > 0:
        excerpt = "..." + excerpt
    if end_pos < len(raw_text):
        excerpt = excerpt + "..."

    description = f"[Auto-tagged HSE] Flagged keyword '{matched_keyword}': {excerpt}"

    # Check for existing duplicate complaint to prevent double-filing
    existing = (
        db.query(Complaint)
        .filter(
            Complaint.supervisor_id == supervisor_id,
            Complaint.project_id == project_id,
            Complaint.category == ComplaintCategoryEnum.SAFETY_CONCERN,
            Complaint.description.contains(matched_keyword),
        )
        .first()
    )

    if existing:
        return existing

    try:
        complaint = Complaint(
            project_id=project_id,
            activity_id=activity_id,
            supervisor_id=supervisor_id,
            category=ComplaintCategoryEnum.SAFETY_CONCERN,
            description=description,
            status=ComplaintStatusEnum.OPEN,
        )
        db.add(complaint)
        db.commit()
        db.refresh(complaint)
        logger.info(f"Auto-tagged HSE complaint #{complaint.id} created for supervisor #{supervisor_id}")
        return complaint
    except Exception as e:
        logger.warning(f"Failed to auto-tag HSE complaint: {e}")
        db.rollback()
        return None
