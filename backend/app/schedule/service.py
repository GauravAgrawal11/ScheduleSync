import io
from datetime import datetime, date
from typing import Optional, List, Dict, Any
import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.activity import Activity
from app.models.enums import DisciplineEnum
from app.schemas.schedule import ScheduleImportResponse

REQUIRED_EXCEL_COLUMNS = [
    "Activity ID",
    "Activity Name",
    "WBS",
    "Discipline",
    "Location",
    "Planned Start",
    "Planned Finish",
]


def infer_discipline_from_text(text: str) -> Optional[DisciplineEnum]:
    """Infer discipline enum from text (activity ID, name, or code)."""
    if not text:
        return None
    lower = text.lower()
    if any(k in lower for k in ["pip", "pipe", "piping", "spool"]):
        return DisciplineEnum.PIPING
    if any(k in lower for k in ["civ", "civil", "concrete", "found", "excav", "earthwork"]):
        return DisciplineEnum.CIVIL
    if any(k in lower for k in ["elec", "electrical", "cable", "substation", "switchgear", "power"]):
        return DisciplineEnum.ELECTRICAL
    if any(k in lower for k in ["inst", "instrument", "sensor", "scada", "plc", "loop"]):
        return DisciplineEnum.INSTRUMENTATION
    if any(k in lower for k in ["hse", "safety", "fire", "hazard", "environ"]):
        return DisciplineEnum.HSE
    return None


def parse_discipline(val: Any) -> Optional[DisciplineEnum]:
    """Parse discipline field from spreadsheet."""
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip().lower()
    # Check direct enum value matches
    for d in DisciplineEnum:
        if s == d.value.lower():
            return d
    # Check heuristic matching
    inferred = infer_discipline_from_text(s)
    if inferred:
        return inferred
    return DisciplineEnum.OTHER


def parse_date(val: Any) -> Optional[date]:
    """Parse date from cell value handling timestamps, strings, and NaT."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    try:
        dt = pd.to_datetime(val)
        if pd.isna(dt):
            return None
        return dt.date()
    except Exception:
        return None


COLUMN_ALIASES = {
    "activity id": "Activity ID",
    "activity_id": "Activity ID",
    "activity name": "Activity Name",
    "activity_name": "Activity Name",
    "wbs": "WBS",
    "wbs code": "WBS",
    "wbs_code": "WBS",
    "discipline": "Discipline",
    "location": "Location",
    "planned start": "Planned Start",
    "planned_start": "Planned Start",
    "planned finish": "Planned Finish",
    "planned_finish": "Planned Finish",
}


def import_excel_schedule(
    file_bytes: bytes, project_id: int, db: Session, filename: str = "schedule.xlsx"
) -> ScheduleImportResponse:
    """
    Parse MS Project export (.xlsx, .xls, or .csv) and bulk-insert/update activities.
    Validates that required columns are present and returns clear 422 if missing.
    """
    # 1. Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    # 2. Read spreadsheet (support both Excel and CSV)
    df = None
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
    except Exception:
        # Fallback try CSV if Excel read failed or vice versa
        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unable to read spreadsheet file. Please ensure it is a valid .xlsx or .csv file. Error: {str(exc)}",
            )

    # 3. Normalize column names using alias map
    raw_columns = [str(c).strip() for c in df.columns]
    normalized_columns = [
        COLUMN_ALIASES.get(c.lower().replace("-", "_").replace(" ", "_"), COLUMN_ALIASES.get(c.lower(), c))
        for c in raw_columns
    ]
    df.columns = normalized_columns

    missing_columns = [col for col in REQUIRED_EXCEL_COLUMNS if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required columns in Excel file: {', '.join(missing_columns)}. Required columns are: {', '.join(REQUIRED_EXCEL_COLUMNS)}",
        )

    # 4. Parse rows and upsert activities
    imported_activities: List[str] = []
    for _, row in df.iterrows():
        raw_act_id = row.get("Activity ID")
        if pd.isna(raw_act_id) or str(raw_act_id).strip() == "":
            continue  # skip blank rows

        activity_id = str(raw_act_id).strip()
        activity_name = str(row.get("Activity Name", "")).strip()
        wbs_code = None if pd.isna(row.get("WBS")) else str(row.get("WBS")).strip()
        discipline = parse_discipline(row.get("Discipline"))
        # If discipline is null, attempt inference from activity name or ID
        if not discipline:
            discipline = infer_discipline_from_text(activity_id) or infer_discipline_from_text(activity_name)
        location = None if pd.isna(row.get("Location")) else str(row.get("Location")).strip()
        planned_start = parse_date(row.get("Planned Start"))
        planned_finish = parse_date(row.get("Planned Finish"))

        # Upsert: check if activity already exists in this project
        existing = (
            db.query(Activity)
            .filter(Activity.project_id == project_id, Activity.activity_id == activity_id)
            .first()
        )
        if existing:
            existing.activity_name = activity_name
            existing.wbs_code = wbs_code
            existing.discipline = discipline
            existing.location = location
            existing.planned_start = planned_start
            existing.planned_finish = planned_finish
        else:
            new_act = Activity(
                project_id=project_id,
                activity_id=activity_id,
                activity_name=activity_name,
                wbs_code=wbs_code,
                discipline=discipline,
                location=location,
                planned_start=planned_start,
                planned_finish=planned_finish,
                status="PLANNED",
            )
            db.add(new_act)

        imported_activities.append(activity_id)

    db.commit()

    sample_ids = imported_activities[:5]
    return ScheduleImportResponse(
        project_id=project_id,
        imported_count=len(imported_activities),
        source_type="excel",
        sample_activity_ids=sample_ids,
        message=f"Successfully imported {len(imported_activities)} activities from Excel into project ID {project_id}.",
    )


def import_xer_schedule(
    file_bytes: bytes, project_id: int, db: Session
) -> ScheduleImportResponse:
    """
    Parse Primavera .xer file and bulk-insert/update activities.
    Reads PROJWBS and TASK tables using xerparser.
    """
    # 1. Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    # 2. Parse XER file using xerparser
    from xerparser import Xer
    from xerparser.src.errors import CorruptXerFile

    try:
        xer = Xer.reader(io.BytesIO(file_bytes))
    except CorruptXerFile as cxe:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Corrupt or incomplete Primavera .xer file: {str(cxe)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to parse Primavera .xer file: {str(exc)}",
        )

    # 3. Process TASK table
    imported_activities: List[str] = []
    for task in xer.tasks.values():
        activity_id = str(task.task_code).strip()
        activity_name = str(task.name).strip()
        planned_start = task.target_start_date.date() if task.target_start_date else None
        planned_finish = task.target_end_date.date() if task.target_end_date else None

        # Extract WBS code if present
        wbs_code = None
        if task.wbs:
            wbs_code = getattr(task.wbs, "wbs_short_name", None) or getattr(task.wbs, "code", None)

        # Infer discipline: check activity_codes, activity_id, or name
        discipline = None
        if hasattr(task, "activity_codes") and task.activity_codes:
            for actv_type, actv_val in task.activity_codes.items():
                code_text = f"{getattr(actv_type, 'actv_code_type', '')} {getattr(actv_val, 'actv_code_val', '')} {getattr(actv_val, 'actv_code_name', '')}"
                discipline = infer_discipline_from_text(code_text)
                if discipline:
                    break

        if not discipline:
            discipline = infer_discipline_from_text(activity_id) or infer_discipline_from_text(activity_name)

        # Status
        status_str = "PLANNED"
        if hasattr(task, "status") and hasattr(task.status, "name"):
            status_str = task.status.name

        # Upsert into database
        existing = (
            db.query(Activity)
            .filter(Activity.project_id == project_id, Activity.activity_id == activity_id)
            .first()
        )
        if existing:
            existing.activity_name = activity_name
            existing.wbs_code = wbs_code
            existing.discipline = discipline
            existing.planned_start = planned_start
            existing.planned_finish = planned_finish
            existing.status = status_str
        else:
            new_act = Activity(
                project_id=project_id,
                activity_id=activity_id,
                activity_name=activity_name,
                wbs_code=wbs_code,
                discipline=discipline,
                planned_start=planned_start,
                planned_finish=planned_finish,
                status=status_str,
            )
            db.add(new_act)

        imported_activities.append(activity_id)

    db.commit()

    sample_ids = imported_activities[:5]
    return ScheduleImportResponse(
        project_id=project_id,
        imported_count=len(imported_activities),
        source_type="xer",
        sample_activity_ids=sample_ids,
        message=f"Successfully imported {len(imported_activities)} activities from Primavera .xer into project ID {project_id}.",
    )
