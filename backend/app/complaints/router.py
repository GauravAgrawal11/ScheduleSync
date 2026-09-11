from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.activity import Activity
from app.models.project import Project
from app.complaints.models import Complaint, ComplaintCategoryEnum, ComplaintStatusEnum
from app.complaints.schemas import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintStatusActionResponse,
)

router = APIRouter(tags=["Complaints & Blockers"])


def format_complaint_response(comp: Complaint, db: Session) -> ComplaintResponse:
    act = comp.activity
    sup = comp.supervisor
    resolver = comp.resolver

    cat_val = comp.category.value if hasattr(comp.category, "value") else str(comp.category)
    stat_val = comp.status.value if hasattr(comp.status, "value") else str(comp.status)

    return ComplaintResponse(
        id=comp.id,
        project_id=comp.project_id,
        activity_id=comp.activity_id,
        activity_code=act.activity_id if act else None,
        activity_name=act.activity_name if act else None,
        supervisor_id=comp.supervisor_id,
        supervisor_name=sup.name if sup else f"Supervisor #{comp.supervisor_id}",
        supervisor_email=sup.email if sup else "",
        category=cat_val,
        description=comp.description,
        status=stat_val,
        created_at=comp.created_at,
        resolved_at=comp.resolved_at,
        resolved_by=comp.resolved_by,
        resolved_by_name=resolver.name if resolver else None,
    )


@router.post(
    "",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Raise an operational blocker or complaint",
    description="Supervisors can report blockers tied to specific schedule activities or general site conditions.",
)
def raise_complaint(
    body: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == body.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project #{body.project_id} not found",
        )

    # Resolve optional activity
    resolved_activity_id: Optional[int] = None
    if body.activity_id:
        act_query = db.query(Activity).filter(
            Activity.project_id == body.project_id,
            Activity.activity_id == body.activity_id,
        )
        if body.activity_id.isdigit():
            act_query = db.query(Activity).filter(
                Activity.project_id == body.project_id,
                or_(Activity.activity_id == body.activity_id, Activity.id == int(body.activity_id)),
            )
        target_act = act_query.first()
        if not target_act:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Activity '{body.activity_id}' not found in project #{body.project_id}",
            )
        resolved_activity_id = target_act.id

    # Parse category enum with fuzzy alias support
    norm_cat = body.category.lower().strip().replace("-", "_").replace(" ", "_")
    cat_aliases = {
        "equipment": ComplaintCategoryEnum.EQUIPMENT_BREAKDOWN,
        "equipment_breakdown": ComplaintCategoryEnum.EQUIPMENT_BREAKDOWN,
        "material": ComplaintCategoryEnum.MATERIAL_DELAY,
        "material_delay": ComplaintCategoryEnum.MATERIAL_DELAY,
        "manpower": ComplaintCategoryEnum.MANPOWER_SHORTAGE,
        "manpower_shortage": ComplaintCategoryEnum.MANPOWER_SHORTAGE,
        "access": ComplaintCategoryEnum.ACCESS_BLOCKED,
        "access_blocked": ComplaintCategoryEnum.ACCESS_BLOCKED,
        "safety": ComplaintCategoryEnum.SAFETY_CONCERN,
        "safety_concern": ComplaintCategoryEnum.SAFETY_CONCERN,
        "weather": ComplaintCategoryEnum.WEATHER,
        "other": ComplaintCategoryEnum.OTHER,
    }
    matched_cat = cat_aliases.get(norm_cat)
    if not matched_cat:
        for member in ComplaintCategoryEnum:
            if member.value == norm_cat or member.name.lower() == norm_cat:
                matched_cat = member
                break
    if not matched_cat:
        valid_cats = [c.value for c in ComplaintCategoryEnum]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category '{body.category}'. Valid categories: {valid_cats}",
        )

    complaint = Complaint(
        project_id=body.project_id,
        activity_id=resolved_activity_id,
        supervisor_id=current_user.id,  # Authenticated user ID - never client supplied
        category=matched_cat,
        description=body.description.strip(),
        status=ComplaintStatusEnum.OPEN,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    return format_complaint_response(complaint, db)


@router.get(
    "/mine",
    response_model=List[ComplaintResponse],
    summary="Get current supervisor's raised complaints",
    description="Returns all blockers and complaints raised by the logged-in supervisor.",
)
@router.get(
    "/my",
    response_model=List[ComplaintResponse],
    include_in_schema=False,
)
def get_my_complaints(
    project_id: Optional[int] = Query(None, description="Optional project filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Complaint).filter(Complaint.supervisor_id == current_user.id)
    if project_id is not None:
        query = query.filter(Complaint.project_id == project_id)

    complaints = query.order_by(Complaint.created_at.desc()).all()
    return [format_complaint_response(c, db) for c in complaints]


@router.get(
    "",
    response_model=List[ComplaintResponse],
    summary="List complaints for admin / planner cockpit",
    description="List all blockers/complaints across a project, filterable by status and category.",
)
def list_complaints(
    project_id: int = Query(1, description="Target project ID"),
    status: Optional[str] = Query(None, description="Status filter: open, acknowledged, resolved, or all"),
    category: Optional[str] = Query(None, description="Category filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    query = db.query(Complaint).filter(Complaint.project_id == project_id)

    if status and status.lower() != "all":
        norm_status = status.lower().strip()
        matched_stat = None
        for member in ComplaintStatusEnum:
            if member.value == norm_status or member.name.lower() == norm_status:
                matched_stat = member
                break
        if matched_stat:
            query = query.filter(Complaint.status == matched_stat)

    if category and category.lower() != "all":
        norm_cat = category.lower().strip().replace("-", "_")
        matched_cat = None
        for member in ComplaintCategoryEnum:
            if member.value == norm_cat or member.name.lower() == norm_cat:
                matched_cat = member
                break
        if matched_cat:
            query = query.filter(Complaint.category == matched_cat)

    complaints = query.order_by(Complaint.created_at.desc()).all()
    return [format_complaint_response(c, db) for c in complaints]


@router.post(
    "/{complaint_id}/acknowledge",
    response_model=ComplaintStatusActionResponse,
    summary="Acknowledge a complaint",
    description="Planner or Admin acknowledges awareness of the site blocker.",
)
def acknowledge_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint #{complaint_id} not found",
        )

    complaint.status = ComplaintStatusEnum.ACKNOWLEDGED
    db.commit()

    return ComplaintStatusActionResponse(
        id=complaint.id,
        status="acknowledged",
        message=f"Complaint #{complaint.id} marked as acknowledged by {current_user.name}.",
    )


@router.post(
    "/{complaint_id}/resolve",
    response_model=ComplaintStatusActionResponse,
    summary="Resolve a complaint",
    description="Planner or Admin marks a blocker as resolved.",
)
def resolve_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint #{complaint_id} not found",
        )

    now = datetime.now(timezone.utc)
    complaint.status = ComplaintStatusEnum.RESOLVED
    complaint.resolved_at = now
    complaint.resolved_by = current_user.id
    db.commit()

    return ComplaintStatusActionResponse(
        id=complaint.id,
        status="resolved",
        message=f"Complaint #{complaint.id} successfully resolved by {current_user.name}.",
        resolved_at=now,
        resolved_by_name=current_user.name,
    )
