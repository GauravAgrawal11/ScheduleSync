import math
from typing import Optional, List
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.project import Project
from app.models.activity import Activity
from app.models.enums import DisciplineEnum, UserRoleEnum
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectListResponse
from app.schemas.activity import ActivityResponse, ActivityListResponse
from app.schemas.schedule import ScheduleImportResponse
from app.auth.dependencies import get_current_user, require_role
from app.schedule.service import import_excel_schedule, import_xer_schedule

router = APIRouter(prefix="/schedule", tags=["Schedule & Baseline"])


# -----------------------------------------------------------------------------
# PROJECTS
# -----------------------------------------------------------------------------


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Create an infrastructure project baseline container. Restricted to planners and admins.",
)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    project = Project(
        name=project_in.name,
        client=project_in.client,
        start_date=project_in.start_date,
        end_date=project_in.end_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    resp = ProjectResponse.model_validate(project)
    resp.activity_count = 0
    return resp


@router.get(
    "/projects",
    response_model=ProjectListResponse,
    summary="List all projects",
    description="Retrieve all projects with total WBS activity counts.",
)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = db.query(Project).all()
    results = []
    for p in projects:
        act_count = db.query(func.count(Activity.id)).filter(Activity.project_id == p.id).scalar() or 0
        p_resp = ProjectResponse.model_validate(p)
        p_resp.activity_count = act_count
        p_resp.status = "RUNNING"
        results.append(p_resp)

    return ProjectListResponse(total=len(results), projects=results)


@router.get(
    "/projects/{id}",
    response_model=ProjectResponse,
    summary="Get project detail",
    description="Retrieve single project metadata and activity count.",
)
def get_project(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {id} not found.",
        )
    act_count = db.query(func.count(Activity.id)).filter(Activity.project_id == project.id).scalar() or 0
    resp = ProjectResponse.model_validate(project)
    resp.activity_count = act_count
    return resp


# -----------------------------------------------------------------------------
# SCHEDULE IMPORT
# -----------------------------------------------------------------------------


@router.post(
    "/import/excel",
    response_model=ScheduleImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import schedule from MS Project Excel (.xlsx)",
    description=(
        "Upload an .xlsx spreadsheet containing columns: "
        "'Activity ID', 'Activity Name', 'WBS', 'Discipline', 'Location', 'Planned Start', 'Planned Finish'. "
        "Returns 422 with missing column names if invalid. Restricted to planners and admins."
    ),
)
async def import_excel(
    project_id: int = Form(..., description="Target project ID to import activities into"),
    file: UploadFile = File(..., description="Excel spreadsheet (.xlsx) file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must have an .xlsx, .xls, or .csv extension.",
        )

    file_bytes = await file.read()
    return import_excel_schedule(file_bytes=file_bytes, project_id=project_id, db=db, filename=file.filename)


@router.post(
    "/import/xer",
    response_model=ScheduleImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import schedule from Primavera P6 (.xer)",
    description=(
        "Upload a Primavera .xer file. Reads PROJWBS and TASK tables using xerparser, "
        "maps task attributes to our schema, infers disciplines, and bulk inserts into activities. "
        "Restricted to planners and admins."
    ),
)
async def import_xer(
    project_id: int = Form(..., description="Target project ID to import activities into"),
    file: UploadFile = File(..., description="Primavera .xer schedule file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("planner", "admin")),
):
    if not file.filename.lower().endswith(".xer"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must have a .xer extension.",
        )

    file_bytes = await file.read()
    return import_xer_schedule(file_bytes=file_bytes, project_id=project_id, db=db)


# -----------------------------------------------------------------------------
# ACTIVITIES CRUD & QUERY
# -----------------------------------------------------------------------------


@router.get(
    "/activities",
    response_model=ActivityListResponse,
    summary="List activities for a project (paginated)",
    description="Query baseline WBS activities for a given project with pagination and discipline/status filters.",
)
def list_activities(
    project_id: int = Query(..., description="Project ID to list activities for"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=50, ge=1, le=200, description="Items per page"),
    discipline: Optional[DisciplineEnum] = Query(default=None, description="Filter by discipline"),
    status: Optional[str] = Query(default=None, description="Filter by status (e.g. PLANNED)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    query = db.query(Activity).filter(Activity.project_id == project_id)

    if discipline:
        query = query.filter(Activity.discipline == discipline)
    if status:
        query = query.filter(Activity.status == status)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    activities = (
        query.order_by(Activity.planned_start.asc().nulls_last(), Activity.id.asc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return ActivityListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        activities=[ActivityResponse.model_validate(a) for a in activities],
    )


@router.get(
    "/activities/{id}",
    response_model=ActivityResponse,
    summary="Get single activity detail",
    description="Retrieve full details of an activity by its database primary key.",
)
def get_activity(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = db.query(Activity).filter(Activity.id == id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with ID {id} not found.",
        )
    return ActivityResponse.model_validate(activity)
