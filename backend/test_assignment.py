from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.project import Project
from app.models.activity import Activity
from app.models.enums import DisciplineEnum, UserRoleEnum
from app.models.activity_assignment import ActivityAssignment, ActivityAssignmentHistory, AssignmentSourceEnum
from app.auth.security import get_password_hash, create_access_token

test_engine = create_engine("sqlite:///./test_runner.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = lambda: TestingSessionLocal()
    db = TestingSessionLocal()
    # Clean up test tables
    db.query(ActivityAssignmentHistory).delete()
    db.query(ActivityAssignment).delete()
    db.query(Activity).delete()
    db.query(Project).delete()
    db.query(User).delete()
    db.commit()

    # Seed Users:
    # 1 Planner
    planner = User(
        id=1,
        name="Pranab Planner",
        email="planner@oilindia.in",
        hashed_password=get_password_hash("Password123!"),
        role=UserRoleEnum.PLANNER,
        discipline="piping",
    )
    # 2 Piping Supervisors (for balanced workload testing)
    sup_pip_1 = User(
        id=2,
        name="Biren Das (Piping 1)",
        email="biren@oilindia.in",
        hashed_password=get_password_hash("Password123!"),
        role=UserRoleEnum.SUPERVISOR,
        discipline="piping",
    )
    sup_pip_2 = User(
        id=3,
        name="Dipak Kalita (Piping 2)",
        email="dipak@oilindia.in",
        hashed_password=get_password_hash("Password123!"),
        role=UserRoleEnum.SUPERVISOR,
        discipline="piping",
    )
    # 1 Civil Supervisor (to test single supervisor routing & overload)
    sup_civ = User(
        id=4,
        name="Sanjay Supervisor (Civil)",
        email="sanjay@oilindia.in",
        hashed_password=get_password_hash("Password123!"),
        role=UserRoleEnum.SUPERVISOR,
        discipline="civil",
    )
    # 0 Electrical supervisors (to test graceful unassigned handling)

    db.add_all([planner, sup_pip_1, sup_pip_2, sup_civ])
    db.commit()

    # Seed Project
    project = Project(
        id=1,
        name="Assignment Test Project",
        client="Oil India Limited",
        start_date=date(2026, 2, 1),
        end_date=date(2026, 3, 31),
    )
    db.add(project)
    db.commit()

    # Seed Activities:
    # 4 Piping activities in Week 1 (Feb 1 to Feb 7)
    pip_acts = [
        Activity(
            id=101,
            project_id=1,
            activity_id="PIP-001",
            activity_name="Erect Line 24 spool 1",
            discipline=DisciplineEnum.PIPING,
            planned_start=date(2026, 2, 1),
            planned_finish=date(2026, 2, 3),  # 3 days
        ),
        Activity(
            id=102,
            project_id=1,
            activity_id="PIP-002",
            activity_name="Erect Line 24 spool 2",
            discipline=DisciplineEnum.PIPING,
            planned_start=date(2026, 2, 2),
            planned_finish=date(2026, 2, 4),  # 3 days
        ),
        Activity(
            id=103,
            project_id=1,
            activity_id="PIP-003",
            activity_name="Hydrotest Line 24",
            discipline=DisciplineEnum.PIPING,
            planned_start=date(2026, 2, 3),
            planned_finish=date(2026, 2, 5),  # 3 days
        ),
        Activity(
            id=104,
            project_id=1,
            activity_id="PIP-004",
            activity_name="Bolt-up Line 24",
            discipline=DisciplineEnum.PIPING,
            planned_start=date(2026, 2, 4),
            planned_finish=date(2026, 2, 6),  # 3 days
        ),
    ]

    # 3 Civil activities in Week 1 (total 3 + 3 + 3 = 9 days, which exceeds 6 days capacity -> tests overload for single supervisor!)
    civ_acts = [
        Activity(
            id=201,
            project_id=1,
            activity_id="CIV-001",
            activity_name="Excavate Footing F-1",
            discipline=DisciplineEnum.CIVIL,
            planned_start=date(2026, 2, 1),
            planned_finish=date(2026, 2, 3),  # 3 days
        ),
        Activity(
            id=202,
            project_id=1,
            activity_id="CIV-002",
            activity_name="Pour PCC Footing F-1",
            discipline=DisciplineEnum.CIVIL,
            planned_start=date(2026, 2, 3),
            planned_finish=date(2026, 2, 5),  # 3 days
        ),
        Activity(
            id=203,
            project_id=1,
            activity_id="CIV-003",
            activity_name="Cast RCC Column C-1",
            discipline=DisciplineEnum.CIVIL,
            planned_start=date(2026, 2, 4),
            planned_finish=date(2026, 2, 6),  # 3 days
        ),
    ]

    # 1 Electrical activity (discipline with 0 supervisors -> tests graceful unassigned handling)
    elec_acts = [
        Activity(
            id=301,
            project_id=1,
            activity_id="ELE-001",
            activity_name="Pull 11kV Cable",
            discipline=DisciplineEnum.ELECTRICAL,
            planned_start=date(2026, 2, 1),
            planned_finish=date(2026, 2, 3),
        )
    ]

    db.add_all(pip_acts + civ_acts + elec_acts)
    db.commit()
    db.close()
    yield


def get_planner_token():
    return create_access_token({"sub": "1", "role": "planner"})


def test_auto_assignment_run():
    """
    Test POST /assignment/run
    - 2+ supervisors in Piping: activities distributed evenly by workload
    - 1 supervisor in Civil: all route to him; overloaded flag set (9 days > 6 days capacity)
    - 0 supervisors in Electrical: does not crash; reported as unassigned
    """
    token = get_planner_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/assignment/run?project_id=1", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["project_id"] == 1
    assert data["total_activities"] == 8
    assert data["total_assigned"] == 7  # 4 piping + 3 civil
    assert data["unassigned_no_supervisor"] == 1  # 1 electrical
    assert len(data["unassigned_activities"]) == 1
    assert data["unassigned_activities"][0]["activity_id"] == "ELE-001"

    # Check workload balancing for Piping supervisors (Biren ID 2, Dipak ID 3)
    db = TestingSessionLocal()
    biren_asgns = db.query(ActivityAssignment).filter(ActivityAssignment.supervisor_id == 2).all()
    dipak_asgns = db.query(ActivityAssignment).filter(ActivityAssignment.supervisor_id == 3).all()
    assert len(biren_asgns) == 2
    assert len(dipak_asgns) == 2
    # Both carry 6 days each
    assert sum(a.planned_duration_days for a in biren_asgns) == 6.0
    assert sum(a.planned_duration_days for a in dipak_asgns) == 6.0

    # Check Civil supervisor (Sanjay ID 4): has 3 activities, 9 days -> overloaded!
    sanjay_asgns = db.query(ActivityAssignment).filter(ActivityAssignment.supervisor_id == 4).all()
    assert len(sanjay_asgns) == 3
    assert sum(a.planned_duration_days for a in sanjay_asgns) == 9.0

    # Overload detection
    assert data["overloaded_count"] >= 1
    overloaded_names = [o["supervisor_name"] for o in data["overloaded_supervisors"]]
    assert "Sanjay Supervisor (Civil)" in overloaded_names
    db.close()


def test_manual_override_reassignment():
    """
    Test POST /assignment/{activity_id}/reassign
    - Reassign an activity to a different supervisor
    - Preserves previous supervisor
    - Shows updated workload & overload status immediately
    """
    token = get_planner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Reassign PIP-001 from Biren (ID 2) to Dipak (ID 3)
    res = client.post(
        "/assignment/PIP-001/reassign",
        json={"new_supervisor_id": 3, "reason": "Biren on personal leave"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["activity_id"] == "PIP-001"
    assert data["new_supervisor_id"] == 3
    assert data["previous_supervisor_id"] == 2
    assert data["assignment_source"] == "manual"
    # Dipak now has 6 + 3 = 9 days -> overloaded!
    assert data["supervisor_total_week_days"] == 9.0
    assert data["is_overloaded"] is True


def test_idempotency_preserves_manual_override():
    """
    Test running auto-assign again:
    - Leaves manually reassigned PIP-001 untouched!
    - Does not silently undo planner's override
    """
    token = get_planner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Run auto-assign again
    res = client.post("/assignment/run?project_id=1", headers=headers)
    assert res.status_code == 200

    # Check that PIP-001 is STILL assigned to Dipak (ID 3) with manual source
    db = TestingSessionLocal()
    pip_001_asgn = (
        db.query(ActivityAssignment)
        .join(Activity, ActivityAssignment.activity_id == Activity.id)
        .filter(Activity.activity_id == "PIP-001")
        .first()
    )
    assert pip_001_asgn.supervisor_id == 3
    assert pip_001_asgn.assignment_source == AssignmentSourceEnum.MANUAL
    assert pip_001_asgn.previous_supervisor_id == 2
    db.close()


def test_supervisor_tasks_endpoint():
    """
    Test GET /assignment/supervisor/{supervisor_id}?week=1
    - Only ever returns that supervisor's own activities
    """
    token = get_planner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Get Dipak's tasks (ID 3)
    res = client.get("/assignment/supervisor/3?week=1", headers=headers)
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) >= 1
    for t in tasks:
        assert t["discipline"] == "Piping"

    # Get Sanjay's tasks (ID 4)
    res_sanjay = client.get("/assignment/supervisor/4?week=1", headers=headers)
    assert res_sanjay.status_code == 200
    s_tasks = res_sanjay.json()
    assert len(s_tasks) == 3
    for t in s_tasks:
        assert t["discipline"] == "Civil"


def test_admin_workload_view():
    """
    Test GET /assignment/admin-view?project_id=1
    - Renders one row per supervisor/week
    - Supplies activities and overload flag for UI direct reassign action
    """
    token = get_planner_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/assignment/admin-view?project_id=1", headers=headers)
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) >= 3

    # Check that every row contains supervisor name, week, activities list
    for row in rows:
        assert "supervisor_name" in row
        assert "project_week" in row
        assert "total_activities" in row
        assert "total_duration_days" in row
        assert "is_overloaded" in row
        assert "activities" in row


def test_activity_history_endpoint():
    """
    Test GET /assignment/activity/{activity_id}/history
    - Returns chronological audit log oldest to newest
    """
    token = get_planner_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/assignment/activity/PIP-001/history", headers=headers)
    assert res.status_code == 200
    history = res.json()
    assert len(history) >= 2
    # First was auto
    assert history[0]["assignment_source"] == "auto"
    # Second was manual
    assert history[1]["assignment_source"] == "manual"
    assert history[1]["supervisor_id"] == 3
    assert history[1]["previous_supervisor_id"] == 2
    assert "personal leave" in (history[1]["reason"] or "")


def test_discipline_based_supervisor_assignment():
    """
    Verify full 6-supervisor setup by discipline:
    - Supervisor 1 - Piping & Supervisor 2 - Piping
    - Supervisor 1 - Civil & Supervisor 2 - Civil
    - Supervisor 1 - Electrical & Supervisor 2 - Electrical
    Verify activities are assigned strictly by discipline and balanced across Supervisor 1 & 2.
    """
    from app.assignment.engine import assign_activities_for_project
    db = TestingSessionLocal()
    try:
        # Create Project 2
        p2 = Project(
            id=2,
            name="Discipline Assignment Verification Project",
            client="Oil India Limited",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        db.add(p2)

        # Create 6 supervisors
        sups = [
            User(name="Supervisor 1 - Piping", email="test.pip1@oilindia.in", hashed_password=get_password_hash("Pass123!"), role=UserRoleEnum.SUPERVISOR, discipline="piping"),
            User(name="Supervisor 2 - Piping", email="test.pip2@oilindia.in", hashed_password=get_password_hash("Pass123!"), role=UserRoleEnum.SUPERVISOR, discipline="piping"),
            User(name="Supervisor 1 - Civil", email="test.civ1@oilindia.in", hashed_password=get_password_hash("Pass123!"), role=UserRoleEnum.SUPERVISOR, discipline="civil"),
            User(name="Supervisor 2 - Civil", email="test.civ2@oilindia.in", hashed_password=get_password_hash("Pass123!"), role=UserRoleEnum.SUPERVISOR, discipline="civil"),
            User(name="Supervisor 1 - Electrical", email="test.ele1@oilindia.in", hashed_password=get_password_hash("Pass123!"), role=UserRoleEnum.SUPERVISOR, discipline="electrical"),
            User(name="Supervisor 2 - Electrical", email="test.ele2@oilindia.in", hashed_password=get_password_hash("Pass123!"), role=UserRoleEnum.SUPERVISOR, discipline="electrical"),
        ]
        db.add_all(sups)
        db.commit()

        pip_sup_ids = {sups[0].id, sups[1].id}
        civ_sup_ids = {sups[2].id, sups[3].id}
        ele_sup_ids = {sups[4].id, sups[5].id}

        # Create 12 activities: 4 Piping, 4 Civil, 4 Electrical
        acts = []
        for i in range(1, 5):
            acts.append(Activity(project_id=2, activity_id=f"P2-PIP-{i}", activity_name=f"Pipe Work {i}", discipline=DisciplineEnum.PIPING, planned_start=date(2026, 2, 1), planned_finish=date(2026, 2, 4)))
            acts.append(Activity(project_id=2, activity_id=f"P2-CIV-{i}", activity_name=f"Civil Work {i}", discipline=DisciplineEnum.CIVIL, planned_start=date(2026, 2, 1), planned_finish=date(2026, 2, 4)))
            acts.append(Activity(project_id=2, activity_id=f"P2-ELE-{i}", activity_name=f"Elec Work {i}", discipline=DisciplineEnum.ELECTRICAL, planned_start=date(2026, 2, 1), planned_finish=date(2026, 2, 4)))
        db.add_all(acts)
        db.commit()

        summary = assign_activities_for_project(project_id=2, db=db)
        assert summary["total_assigned"] == 12
        assert summary["unassigned_no_supervisor"] == 0

        # Verify assignments by discipline: piping to piping, civil to civil, electrical to electrical
        asgns = db.query(ActivityAssignment, Activity, User).join(Activity, ActivityAssignment.activity_id==Activity.id).join(User, ActivityAssignment.supervisor_id==User.id).filter(Activity.project_id == 2).all()
        assert len(asgns) == 12

        for asgn, act, user in asgns:
            assert user.discipline.lower() == act.discipline.value.lower()

        # Verify workload balance within each discipline
        discipline_sups = {}
        for asgn, act, user in asgns:
            discipline_sups.setdefault(user.discipline.lower(), set()).add(user.name)

        assert len(discipline_sups["piping"]) >= 2
        assert len(discipline_sups["civil"]) >= 2
        assert len(discipline_sups["electrical"]) >= 2
    finally:
        db.close()


def test_timeline_status_and_capacity_allocation(setup_test_db):
    from app.assignment.engine import compute_activity_timeline_status
    from datetime import date

    # Test 1: An active task finishes 2026-02-07, ref_date is 2026-02-06 -> 1 day remaining
    # Queued task should get 'Assigned after 1 day'
    active_act = Activity(
        id=901,
        project_id=1,
        activity_id="TEST-ACTIVE-1",
        activity_name="Active Hydrotest",
        status="IN_PROGRESS",
        planned_start=date(2026, 2, 1),
        planned_finish=date(2026, 2, 7),
    )
    queued_act = Activity(
        id=902,
        project_id=1,
        activity_id="TEST-QUEUED-1",
        activity_name="Queued Inspection",
        status="PLANNED",
        planned_start=date(2026, 2, 7),
        planned_finish=date(2026, 2, 10),
    )

    state, days, text = compute_activity_timeline_status(
        queued_act,
        [active_act, queued_act],
        ref_date=date(2026, 2, 6),
    )
    assert state == "queued"
    assert days == 1
    assert text == "Assigned after 1 day"

    # Test 2: Active now
    state2, days2, text2 = compute_activity_timeline_status(
        active_act,
        [active_act],
        ref_date=date(2026, 2, 6),
    )
    assert state2 == "active_now"
    assert text2 == "Assigned (Active Now)"

    # Test 3: Completed
    completed_act = Activity(
        id=903,
        project_id=1,
        activity_id="TEST-COMP-1",
        activity_name="Finished Foundation",
        status="COMPLETED",
        planned_start=date(2026, 1, 10),
        planned_finish=date(2026, 1, 20),
    )
    state3, days3, text3 = compute_activity_timeline_status(
        completed_act,
        [completed_act],
        ref_date=date(2026, 2, 6),
    )
    assert state3 == "completed"
    assert text3 == "Completed"
