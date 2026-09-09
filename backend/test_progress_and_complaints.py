from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models import User, Project, Activity, UserRoleEnum, DisciplineEnum
from app.models.activity_assignment import ActivityAssignment, AssignmentSourceEnum
from app.models.progress_event import ProgressEvent, EventTypeEnum
from app.complaints.models import Complaint, ComplaintCategoryEnum, ComplaintStatusEnum
from app.progress_tracking.summary import get_supervisor_progress
from app.auth.security import get_password_hash, create_access_token

test_engine = create_engine("sqlite:///./test_runner.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

client = TestClient(app)


def get_token_for(user_id: int, role: str, email: str):
    return create_access_token(data={"sub": str(user_id), "role": role, "email": email})


@pytest.fixture(scope="module", autouse=True)
def setup_progress_and_complaints_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = lambda: TestingSessionLocal()
    db = TestingSessionLocal()
    try:
        db.query(Complaint).delete()
        db.query(ActivityAssignment).delete()
        db.query(ProgressEvent).delete()
        db.query(Activity).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()

        # Seed Project
        proj = Project(
            id=1,
            name="Numaligarh Test Project",
            client="Oil India Limited",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        db.add(proj)

        # Seed 1 Planner and 3 Supervisors
        planner = User(
            id=1,
            name="Admin Planner",
            email="planner.test@oilindia.in",
            hashed_password=get_password_hash("Pass123!"),
            role=UserRoleEnum.PLANNER,
            discipline="Piping",
        )
        sup_ontrack = User(
            id=2,
            name="Supervisor OnTrack",
            email="sup.ontrack@oilindia.in",
            hashed_password=get_password_hash("Pass123!"),
            role=UserRoleEnum.SUPERVISOR,
            discipline="Civil",
        )
        sup_delayed = User(
            id=3,
            name="Supervisor Delayed",
            email="sup.delayed@oilindia.in",
            hashed_password=get_password_hash("Pass123!"),
            role=UserRoleEnum.SUPERVISOR,
            discipline="Piping",
        )
        sup_completed = User(
            id=4,
            name="Supervisor Completed",
            email="sup.completed@oilindia.in",
            hashed_password=get_password_hash("Pass123!"),
            role=UserRoleEnum.SUPERVISOR,
            discipline="Electrical",
        )
        db.add_all([planner, sup_ontrack, sup_delayed, sup_completed])
        db.commit()

        # Ref date for testing: 2026-02-10
        # Activities for Supervisor Completed (all completed before planned)
        act_comp_1 = Activity(
            id=10, project_id=1, activity_id="ACT-COMP-1", activity_name="Completed Act 1",
            discipline=DisciplineEnum.ELECTRICAL, planned_start=date(2026, 2, 1), planned_finish=date(2026, 2, 8),
            status="COMPLETED"
        )
        act_comp_2 = Activity(
            id=11, project_id=1, activity_id="ACT-COMP-2", activity_name="Completed Act 2",
            discipline=DisciplineEnum.ELECTRICAL, planned_start=date(2026, 2, 3), planned_finish=date(2026, 2, 10),
            status="COMPLETED"
        )

        # Activities for Supervisor Delayed (one overdue incomplete)
        act_del_1 = Activity(
            id=20, project_id=1, activity_id="ACT-DEL-1", activity_name="Delayed Overdue Act",
            discipline=DisciplineEnum.PIPING, planned_start=date(2026, 2, 1), planned_finish=date(2026, 2, 5),  # 5 days overdue as of Feb 10
            status="DELAYED"
        )
        act_del_2 = Activity(
            id=21, project_id=1, activity_id="ACT-DEL-2", activity_name="Future Act",
            discipline=DisciplineEnum.PIPING, planned_start=date(2026, 2, 8), planned_finish=date(2026, 2, 15),
            status="IN_PROGRESS"
        )

        # Activities for Supervisor OnTrack (future deadline)
        act_ont_1 = Activity(
            id=30, project_id=1, activity_id="ACT-ONT-1", activity_name="OnTrack Act 1",
            discipline=DisciplineEnum.CIVIL, planned_start=date(2026, 2, 5), planned_finish=date(2026, 2, 14),  # 4 days left as of Feb 10
            status="IN_PROGRESS"
        )

        db.add_all([act_comp_1, act_comp_2, act_del_1, act_del_2, act_ont_1])
        db.commit()

        # Add assignments
        asgns = [
            ActivityAssignment(activity_id=10, supervisor_id=4, project_week=5, planned_duration_days=8.0, assignment_source=AssignmentSourceEnum.AUTO),
            ActivityAssignment(activity_id=11, supervisor_id=4, project_week=5, planned_duration_days=8.0, assignment_source=AssignmentSourceEnum.AUTO),
            ActivityAssignment(activity_id=20, supervisor_id=3, project_week=5, planned_duration_days=5.0, assignment_source=AssignmentSourceEnum.AUTO),
            ActivityAssignment(activity_id=21, supervisor_id=3, project_week=6, planned_duration_days=8.0, assignment_source=AssignmentSourceEnum.AUTO),
            ActivityAssignment(activity_id=30, supervisor_id=2, project_week=5, planned_duration_days=10.0, assignment_source=AssignmentSourceEnum.AUTO),
        ]
        db.add_all(asgns)
        db.commit()

        # Add progress event for completed activity (finished 2 days early)
        ev1 = ProgressEvent(
            activity_id=10, source_report_id=1, event_type=EventTypeEnum.FINISH,
            actual_start=date(2026, 2, 1), actual_finish=date(2026, 2, 6), status="COMPLETED", confidence=0.95
        )
        ev2 = ProgressEvent(
            activity_id=11, source_report_id=1, event_type=EventTypeEnum.FINISH,
            actual_start=date(2026, 2, 3), actual_finish=date(2026, 2, 8), status="COMPLETED", confidence=0.95
        )
        db.add_all([ev1, ev2])
        db.commit()
    finally:
        db.close()
    yield
    app.dependency_overrides.clear()


def test_supervisor_progress_all_completed():
    """Supervisor 4 has 0 remaining tasks and finished early."""
    db = TestingSessionLocal()
    try:
        ref_date = date(2026, 2, 10)
        prog = get_supervisor_progress(4, 1, db, ref_date=ref_date)
        assert prog.remaining_count == 0
        assert prog.completed_count == 2
        assert prog.overall_status == "completed"
        assert "Completed all tasks" in prog.status_detail
        assert "days early" in prog.status_detail or "on schedule" in prog.status_detail
    finally:
        db.close()


def test_supervisor_progress_delayed():
    """Supervisor 3 has an overdue incomplete activity."""
    db = TestingSessionLocal()
    try:
        ref_date = date(2026, 2, 10)
        prog = get_supervisor_progress(3, 1, db, ref_date=ref_date)
        assert prog.remaining_count == 2
        assert prog.overall_status == "delayed"
        assert prog.delayed_by_days is not None
        assert prog.delayed_by_days >= 5
        assert "Delayed by" in prog.status_detail
    finally:
        db.close()


def test_supervisor_progress_on_track():
    """Supervisor 2 has all remaining tasks in the future."""
    db = TestingSessionLocal()
    try:
        ref_date = date(2026, 2, 10)
        prog = get_supervisor_progress(2, 1, db, ref_date=ref_date)
        assert prog.remaining_count == 1
        assert prog.overall_status == "on_track"
        assert prog.nearest_deadline_days == 4
        assert prog.status_detail == "4 days left."
    finally:
        db.close()


def test_progress_endpoints():
    """Test GET /progress/supervisor/{id} and GET /progress/delayed."""
    token_planner = get_token_for(1, "planner", "planner.test@oilindia.in")
    headers = {"Authorization": f"Bearer {token_planner}"}

    # 1. Single supervisor progress
    resp = client.get("/progress/supervisor/2?project_id=1&ref_date=2026-02-10", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["supervisor_id"] == 2
    assert data["overall_status"] == "on_track"
    assert data["status_detail"] == "4 days left."

    # 2. Delayed supervisors list
    resp_delayed = client.get("/progress/delayed?project_id=1&ref_date=2026-02-10", headers=headers)
    assert resp_delayed.status_code == 200
    delayed_list = resp_delayed.json()
    assert len(delayed_list) >= 1
    assert delayed_list[0]["supervisor_id"] == 3
    assert delayed_list[0]["delayed_by_days"] >= 5


def test_admin_workload_includes_progress_fields():
    """GET /assignment/admin-view includes remaining_count, overall_status, status_detail."""
    token_planner = get_token_for(1, "planner", "planner.test@oilindia.in")
    headers = {"Authorization": f"Bearer {token_planner}"}

    resp = client.get("/assignment/admin-view?project_id=1", headers=headers)
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) > 0
    for row in rows:
        assert "remaining_count" in row
        assert "completed_count" in row
        assert "overall_status" in row
        assert row["overall_status"] in ["completed", "on_track", "delayed"]
        assert "status_detail" in row


def test_complaints_workflow():
    """
    Test full complaint lifecycle:
    1. Supervisor 2 raises complaint tied to ACT-ONT-1
    2. Supervisor 3 raises a general complaint with no activity_id
    3. Supervisor 2 checks /complaints/mine
    4. Admin lists /complaints?status=open
    5. Admin acknowledges complaint
    6. Admin resolves complaint
    """
    token_sup2 = get_token_for(2, "supervisor", "sup.ontrack@oilindia.in")
    headers_sup2 = {"Authorization": f"Bearer {token_sup2}"}

    token_sup3 = get_token_for(3, "supervisor", "sup.delayed@oilindia.in")
    headers_sup3 = {"Authorization": f"Bearer {token_sup3}"}

    token_planner = get_token_for(1, "planner", "planner.test@oilindia.in")
    headers_planner = {"Authorization": f"Bearer {token_planner}"}

    # 1. Raise activity-specific complaint
    payload1 = {
        "project_id": 1,
        "activity_id": "ACT-ONT-1",
        "category": "material_delay",
        "description": "Cement bags delivery delayed by supplier due to rain.",
    }
    r1 = client.post("/complaints", json=payload1, headers=headers_sup2)
    assert r1.status_code == 201
    c1 = r1.json()
    assert c1["supervisor_id"] == 2  # Attributed to authenticated user
    assert c1["status"] == "open"
    assert c1["category"] == "material_delay"
    assert c1["activity_code"] == "ACT-ONT-1"
    c1_id = c1["id"]

    # 2. Raise general complaint (no activity_id)
    payload2 = {
        "project_id": 1,
        "activity_id": None,
        "category": "weather",
        "description": "Heavy thunderstorms across Numaligarh site; safety stoppage.",
    }
    r2 = client.post("/complaints", json=payload2, headers=headers_sup3)
    assert r2.status_code == 201
    c2 = r2.json()
    assert c2["supervisor_id"] == 3
    assert c2["activity_id"] is None
    assert c2["category"] == "weather"
    c2_id = c2["id"]

    # 3. GET /complaints/mine
    r_mine = client.get("/complaints/mine", headers=headers_sup2)
    assert r_mine.status_code == 200
    my_complaints = r_mine.json()
    assert len(my_complaints) == 1
    assert my_complaints[0]["id"] == c1_id

    # 4. Admin lists /complaints?status=open
    r_open = client.get("/complaints?project_id=1&status=open", headers=headers_planner)
    assert r_open.status_code == 200
    open_list = r_open.json()
    assert len(open_list) == 2

    # 5. Acknowledge complaint 1
    r_ack = client.post(f"/complaints/{c1_id}/acknowledge", headers=headers_planner)
    assert r_ack.status_code == 200
    assert r_ack.json()["status"] == "acknowledged"

    # Verify complaint 1 is no longer in status=open
    r_open2 = client.get("/complaints?project_id=1&status=open", headers=headers_planner)
    open_ids = [c["id"] for c in r_open2.json()]
    assert c1_id not in open_ids
    assert c2_id in open_ids

    # 6. Resolve complaint 1
    r_res = client.post(f"/complaints/{c1_id}/resolve", headers=headers_planner)
    assert r_res.status_code == 200
    assert r_res.json()["status"] == "resolved"
    assert "resolved_by_name" in r_res.json()

    # Verify complaint 1 appears under status=resolved
    r_resolved = client.get("/complaints?project_id=1&status=resolved", headers=headers_planner)
    resolved_ids = [c["id"] for c in r_resolved.json()]
    assert c1_id in resolved_ids
