"""
Member C: Matching Engine
Computes 3 independent explainable signals:
1. Semantic score (Embedding / TF-IDF / fuzzy semantic similarity)
2. Entity score (Exact match on line numbers, disciplines, locations)
3. Metadata score (WBS level and discipline consistency checks)
Fusion formula: final_confidence = (0.45 * semantic) + (0.35 * entity) + (0.20 * metadata)
Tiers: HIGH (>0.90) -> AUTO, MEDIUM (0.70 - 0.90) -> REVIEW, LOW (<0.70) -> REJECTED (HELD).
"""

import re
import logging
from typing import List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from rapidfuzz import fuzz

from app.models.activity import Activity
from app.models.match import Match
from app.models.enums import DecisionEnum, DisciplineEnum
from app.extraction.schemas import ExtractedEvent
from app.linking.service import apply_match_link

logger = logging.getLogger(__name__)

# System weights matching config/system_config.json
WEIGHT_SEMANTIC = 0.45
WEIGHT_ENTITY = 0.35
WEIGHT_METADATA = 0.20

# Safety-critical confidence thresholds
TIER_HIGH = 0.90
TIER_MEDIUM = 0.70


ENGINEERING_SYNONYMS = {
    "hydro testing": "hydrotest",
    "hydro test": "hydrotest",
    "hydro-testing": "hydrotest",
    "erection": "erect",
    "erecting": "erect",
    "concreting": "rcc pour",
    "poured": "pour",
    "trenching": "excavate trench",
    "tied": "rebar binding",
    "tying": "rebar binding",
    "placed": "install",
    "placing": "install",
    "mounted": "install",
    "mounting": "install",
    "terminated": "terminate",
    "terminating": "terminate",
    "jointers": "termination",
    "pulling": "pull",
    "pulled": "pull",
    "welded": "weld",
    "welding": "weld",
    "bolting": "bolt-up",
    "bolted": "bolt-up",
    "asphalt road": "bituminous road paving",
    "trench covers": "precast slab covers",
}


def _normalize_text(text: str) -> str:
    t = text.lower()
    for k, v in ENGINEERING_SYNONYMS.items():
        t = re.sub(rf"\b{k}\b", v, t)
    return t


def compute_semantic_score(
    extracted_description: str,
    activity_name: str,
    extracted_embedding: Optional[Any] = None,
    activity_embedding: Optional[Any] = None,
) -> float:
    """
    Compute semantic similarity between extracted description and activity name.
    Combines:
    1. Dense Vector Cosine Similarity (all-MiniLM-L6-v2 pgvector) if available (60%)
    2. RapidFuzz token sort & set ratios with domain normalization (40%)
    """
    if not extracted_description or not activity_name:
        return 0.0

    desc_norm = _normalize_text(extracted_description)
    act_norm = _normalize_text(activity_name)

    # 1. Token sort ratio (0 - 100)
    ratio = fuzz.token_sort_ratio(desc_norm, act_norm) / 100.0

    # 2. Token set ratio (handles extra words in field logs)
    set_ratio = fuzz.token_set_ratio(desc_norm, act_norm) / 100.0

    # 3. Partial ratio for key phrases
    partial = fuzz.partial_ratio(desc_norm, act_norm) / 100.0

    fuzzy_score = 0.3 * ratio + 0.45 * set_ratio + 0.25 * partial

    # 4. Dense Vector Cosine Similarity (if embeddings available)
    if extracted_embedding is not None and activity_embedding is not None:
        try:
            import numpy as np
            v1 = np.array(extracted_embedding, dtype=np.float32)
            v2 = np.array(activity_embedding, dtype=np.float32)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            if norm1 > 0 and norm2 > 0:
                cos_sim = float(np.dot(v1, v2) / (norm1 * norm2))
                cos_sim = max(0.0, min(1.0, cos_sim))
                # 60% vector embedding + 40% fuzzy token matching
                combined = 0.60 * cos_sim + 0.40 * fuzzy_score
                return round(min(1.0, max(0.0, combined)), 4)
        except Exception as e:
            logger.debug(f"Vector cosine similarity fallback: {e}")

    return round(min(1.0, max(0.0, fuzzy_score)), 4)



def compute_entity_score(extracted_event: ExtractedEvent, activity: Activity) -> float:
    """
    Compare extracted line number, discipline, and location against activity attributes.
    Formula:
    - Line number match: 0.40
    - Discipline match: 0.40
    - Location match: 0.20
    """
    score = 0.0

    # 1. Line / Tag / Equipment Match (Weight: 0.40)
    if extracted_event.line_number:
        line_clean = re.sub(r"[^A-Za-z0-9]", "", extracted_event.line_number).lower()
        act_clean = re.sub(r"[^A-Za-z0-9]", "", activity.activity_name).lower()
        if line_clean in act_clean:
            score += 0.40
        elif fuzz.partial_ratio(line_clean, act_clean) > 85:
            score += 0.30
    else:
        score += 0.25

    # 2. Discipline Match (Weight: 0.40)
    if extracted_event.discipline and activity.discipline:
        if extracted_event.discipline.value == activity.discipline.value:
            score += 0.40
        else:
            # Strong penalty for cross-discipline mismatch (e.g. civil report vs electrical activity)
            score -= 0.30
    else:
        score += 0.20

    # 3. Location Match (Weight: 0.20)
    if extracted_event.location and activity.location:
        loc_ratio = fuzz.token_set_ratio(extracted_event.location.lower(), activity.location.lower()) / 100.0
        score += 0.20 * loc_ratio
    else:
        score += 0.10

    return round(min(1.0, max(0.0, score)), 4)


def compute_metadata_score(extracted_event: ExtractedEvent, activity: Activity) -> float:
    """
    Contextual consistency check:
    Verifies that the activity's WBS branch logically hosts this work package.
    """
    score = 0.50  # Base plausibility

    if activity.wbs_code:
        # WBS 3.1.x is Civil, 3.2.x is Piping, 3.3.x is Electrical
        if extracted_event.discipline == DisciplineEnum.CIVIL and activity.wbs_code.startswith("3.1"):
            score += 0.50
        elif extracted_event.discipline == DisciplineEnum.PIPING and activity.wbs_code.startswith("3.2"):
            score += 0.50
        elif extracted_event.discipline == DisciplineEnum.ELECTRICAL and activity.wbs_code.startswith("3.3"):
            score += 0.50
        elif extracted_event.discipline:
            score += 0.10

    return round(min(1.0, max(0.0, score)), 4)


def compute_final_confidence(semantic: float, entity: float, metadata: float) -> float:
    """Compute weighted 3-signal confidence fusion."""
    confidence = (WEIGHT_SEMANTIC * semantic) + (WEIGHT_ENTITY * entity) + (WEIGHT_METADATA * metadata)
    return round(min(1.0, max(0.0, confidence)), 4)


def find_candidate_matches(
    extracted_event: ExtractedEvent,
    project_id: int,
    db: Session,
    top_k: int = 5,
) -> List[Tuple[Activity, float, float, float, float, DecisionEnum]]:
    """
    Search and score baseline activities against an extracted event.
    Returns ranked list of tuples: (Activity, semantic, entity, meta, final_conf, decision).
    """
    activities = db.query(Activity).filter(Activity.project_id == project_id).all()
    if not activities:
        return []

    # Generate vector embedding for the extracted event description once
    desc_embedding = None
    try:
        from fastembed import TextEmbedding
        embed_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        desc_embedding = list(embed_model.embed([extracted_event.activity_description]))[0]
    except Exception as e:
        logger.debug(f"Event description embedding fallback: {e}")

    scored_candidates = []
    for act in activities:
        # Optional discipline pre-filtering if confident
        if extracted_event.discipline and act.discipline:
            if extracted_event.discipline.value != act.discipline.value:
                # Still allow candidate, but with lower prior
                pass

        sem = compute_semantic_score(
            extracted_event.activity_description,
            act.activity_name,
            extracted_embedding=desc_embedding,
            activity_embedding=act.embedding,
        )
        ent = compute_entity_score(extracted_event, act)
        meta = compute_metadata_score(extracted_event, act)
        final_conf = compute_final_confidence(sem, ent, meta)


        if final_conf >= TIER_HIGH:
            decision = DecisionEnum.AUTO
        elif final_conf >= TIER_MEDIUM:
            decision = DecisionEnum.REVIEW
        else:
            decision = DecisionEnum.REJECTED

        scored_candidates.append((act, sem, ent, meta, final_conf, decision))

    # Sort descending by final confidence
    scored_candidates.sort(key=lambda x: x[4], reverse=True)
    return scored_candidates[:top_k]


def match_and_score_event(
    extracted_event: ExtractedEvent,
    report_id: int,
    project_id: int,
    current_user_id: Optional[int],
    db: Session,
) -> Optional[Match]:
    """
    Full matching pipeline for an event:
    1. Finds top candidates
    2. Persists best candidate into 'matches' table
    3. If HIGH confidence (>0.90), immediately triggers auto-linking
    """
    candidates = find_candidate_matches(extracted_event, project_id, db, top_k=1)
    if not candidates:
        return None

    top_act, sem, ent, meta, final_conf, decision = candidates[0]

    match_record = Match(
        report_id=report_id,
        activity_id=top_act.id,
        semantic_score=sem,
        entity_score=ent,
        metadata_score=meta,
        final_confidence=final_conf,
        decision=decision,
    )
    db.add(match_record)
    db.commit()
    db.refresh(match_record)

    # Auto-link if HIGH confidence
    if final_conf >= TIER_HIGH:
        try:
            apply_match_link(
                match=match_record,
                approved_by_user_id=None,  # System auto-approved
                db=db,
                actual_start=extracted_event.event_date,
                action_note="AUTO_APPROVE_HIGH_CONFIDENCE",
            )
        except Exception as e:
            logger.warning(f"Auto-link failed for match #{match_record.id}: {e}")

    return match_record
