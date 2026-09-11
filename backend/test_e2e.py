import os
import io
import pytest
from fastapi.testclient import TestClient
import pandas as pd

from app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.models import User, Project, Activity

test_engine = create_engine("sqlite:///./test_runner.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure clean tables are created on isolated test database and cleared of past test runs."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = lambda: TestingSessionLocal()
    db = TestingSessionLocal()
    db.query(Activity).delete()
    db.query(Project).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    yield
    app.dependency_overrides.clear()


def test_root_and_health():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"
    assert "owner" in resp.json()

    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"


def test_auth_registration_and_login():
    # 1. Register planner user
    planner_payload = {
        "name": "Admin",
        "email": "planner.arun@oilindia.in",
        "password": "SecurePlannerPassword123!",
        "role": "planner",
        "discipline": "Piping",
    }
    resp = client.post("/auth/register", json=planner_payload)
    assert resp.status_code == 201
    planner_data = resp.json()
    assert planner_data["email"] == "planner.arun@oilindia.in"
    assert planner_data["role"] == "planner"
    assert "hashed_password" not in planner_data

    # 2. Duplicate registration should fail with 400
    resp_dup = client.post("/auth/register", json=planner_payload)
    assert resp_dup.status_code == 400
    assert "already exists" in resp_dup.json()["detail"]

    # 3. Register supervisor user
    supervisor_payload = {
        "name": "Bikash Gogoi (Site Supervisor)",
        "email": "supervisor.bikash@oilindia.in",
        "password": "SecureSupervisorPassword123!",
        "role": "supervisor",
        "discipline": "Civil",
    }
    resp_sup = client.post("/auth/register", json=supervisor_payload)
    assert resp_sup.status_code == 201

    # 4. Form login (OAuth2PasswordRequestForm standard)
    login_form = {
        "username": "planner.arun@oilindia.in",
        "password": "SecurePlannerPassword123!",
    }
    login_resp = client.post("/auth/login", data=login_form)
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    planner_token = token_data["access_token"]

    # 5. JSON login
    json_login = {
        "email": "supervisor.bikash@oilindia.in",
        "password": "SecureSupervisorPassword123!",
    }
    json_resp = client.post("/auth/login/json", json=json_login)
    assert json_resp.status_code == 200
    assert "access_token" in json_resp.json()

    # 6. Test /auth/me
    headers = {"Authorization": f"Bearer {planner_token}"}
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "planner.arun@oilindia.in"


def test_project_crud_and_role_authorization():
    # Login as planner
    p_login = client.post(
        "/auth/login",
        data={"username": "planner.arun@oilindia.in", "password": "SecurePlannerPassword123!"},
    )
    planner_token = p_login.json()["access_token"]
    planner_headers = {"Authorization": f"Bearer {planner_token}"}

    # Login as supervisor
    s_login = client.post(
        "/auth/login",
        data={"username": "supervisor.bikash@oilindia.in", "password": "SecureSupervisorPassword123!"},
    )
    supervisor_token = s_login.json()["access_token"]
    supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

    # Supervisor attempts to create a project -> MUST fail with 403 Forbidden
    proj_payload = {
        "name": "Numaligarh Refinery Unit 4 Expansion",
        "client": "Oil India Limited",
        "start_date": "2026-03-01",
        "end_date": "2027-03-31",
    }
    fail_resp = client.post("/schedule/projects", json=proj_payload, headers=supervisor_headers)
    assert fail_resp.status_code == 403
    assert "Access forbidden" in fail_resp.json()["detail"]

    # Planner creates project -> MUST succeed with 201 Created
    create_resp = client.post("/schedule/projects", json=proj_payload, headers=planner_headers)
    assert create_resp.status_code == 201
    project = create_resp.json()
    assert project["id"] is not None
    assert project["name"] == "Numaligarh Refinery Unit 4 Expansion"
    project_id = project["id"]

    # List projects (available to authenticated users)
    list_resp = client.get("/schedule/projects", headers=supervisor_headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # Get single project
    detail_resp = client.get(f"/schedule/projects/{project_id}", headers=planner_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == project_id


def test_excel_schedule_import():
    # Get planner token
    p_login = client.post(
        "/auth/login",
        data={"username": "planner.arun@oilindia.in", "password": "SecurePlannerPassword123!"},
    )
    planner_headers = {"Authorization": f"Bearer {p_login.json()['access_token']}"}

    # Fetch existing project ID
    proj_resp = client.get("/schedule/projects", headers=planner_headers)
    project_id = proj_resp.json()["projects"][0]["id"]

    # 1. Test missing columns in Excel -> 422 Unprocessable Entity
    bad_df = pd.DataFrame([{"Bad Column 1": "A", "Bad Column 2": "B"}])
    bad_buffer = io.BytesIO()
    bad_df.to_excel(bad_buffer, index=False, engine="openpyxl")
    bad_buffer.seek(0)

    bad_upload = client.post(
        "/schedule/import/excel",
        data={"project_id": project_id},
        files={"file": ("invalid.xlsx", bad_buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=planner_headers,
    )
    assert bad_upload.status_code == 422
    assert "Missing required columns in Excel file" in bad_upload.json()["detail"]

    # 2. Test valid upload from sample_data/schedules/baseline_schedule.csv
    schedule_path = os.path.join(os.path.dirname(__file__), "..", "sample_data", "schedules", "baseline_schedule.csv")
    with open(schedule_path, "rb") as f:
        file_bytes = f.read()

    good_upload = client.post(
        "/schedule/import/excel",
        data={"project_id": project_id},
        files={"file": ("baseline_schedule.csv", file_bytes, "text/csv")},
        headers=planner_headers,
    )
    assert good_upload.status_code == 201
    import_result = good_upload.json()
    assert import_result["imported_count"] == 36
    assert import_result["source_type"] == "excel"
    assert "L6-PIP-101" in import_result["sample_activity_ids"]

    # 3. Query activities with pagination
    act_resp = client.get(f"/schedule/activities?project_id={project_id}&page=1&page_size=5", headers=planner_headers)
    assert act_resp.status_code == 200
    page_data = act_resp.json()
    assert page_data["total"] == 36
    assert page_data["page"] == 1
    assert page_data["page_size"] == 5
    assert len(page_data["activities"]) == 5

    # 4. Filter activities by discipline=piping
    piping_resp = client.get(
        f"/schedule/activities?project_id={project_id}&discipline=piping",
        headers=planner_headers,
    )
    assert piping_resp.status_code == 200
    piping_acts = piping_resp.json()["activities"]
    assert len(piping_acts) == 12
    assert all(a["discipline"] == "piping" for a in piping_acts)

    # 5. Get single activity detail
    first_act_id = piping_acts[0]["id"]
    single_resp = client.get(f"/schedule/activities/{first_act_id}", headers=planner_headers)
    assert single_resp.status_code == 200
    assert single_resp.json()["id"] == first_act_id
    assert single_resp.json()["activity_id"] == piping_acts[0]["activity_id"]


def test_xer_schedule_import():
    p_login = client.post(
        "/auth/login",
        data={"username": "planner.arun@oilindia.in", "password": "SecurePlannerPassword123!"},
    )
    planner_headers = {"Authorization": f"Bearer {p_login.json()['access_token']}"}

    proj_resp = client.get("/schedule/projects", headers=planner_headers)
    project_id = proj_resp.json()["projects"][0]["id"]

    xer_sample_bytes = b'''ERMHDR\t20.12\t2026-03-05\tPROJECT\tTABNAME\tadmin\tdb\tdb\tUSD
%T\tCALENDAR
%F\tclndr_id\tdefault_flag\tclndr_name\tclndr_type\tday_hr_cnt\tweek_hr_cnt\tyear_hr_cnt\tbase_clndr_id\tlast_chng_date\tclndr_data\tproj_id
%R\t1\tY\tStandard 5 Day\tCA_Base\t8.0\t40.0\t2000.0\t\t\t()\t
%T\tSCHEDOPTIONS
%F\tschedoptions_id\tproj_id\tsched_float_type\tsched_lag_early_start_flag\tsched_open_critical_flag\tsched_outer_depend_type\tsched_progress_override\tsched_retained_logic\tsched_setplantoforecast\tsched_use_expect_end_flag
%R\t1\t1\tFT_Total\tN\tN\tOD_Total\tN\tY\tN\tN
%T\tPROJECT
%F\tproj_id\tproj_short_name\tclndr_id\tplan_start_date\tplan_end_date\tscd_end_date\tadd_date\tlast_recalc_date\texport_flag\tstatus_code
%R\t1\tOIL_NUMALIGARH\t1\t2026-01-01 08:00\t2026-12-31 17:00\t2026-12-31 17:00\t2026-01-01 08:00\t2026-01-01 08:00\tY\tPS_Open
%T\tPROJWBS
%F\twbs_id\tproj_id\twbs_short_name\twbs_name\tparent_wbs_id\tseq_num\tproj_node_flag\tstatus_code
%R\t10\t1\tOIL_NUMALIGARH\tNumaligarh Root\t\t1\tY\tWS_Open
%R\t11\t1\tWBS-PIP\tPiping Works\t10\t2\tN\tWS_Open
%T\tTASK
%F\ttask_id\tproj_id\twbs_id\tclndr_id\tphys_complete_pct\tcomplete_pct_type\ttask_type\tstatus_code\ttask_code\ttask_name\tduration_type\tremain_drtn_hr_cnt\ttarget_drtn_hr_cnt\tdriving_path_flag\ttarget_start_date\ttarget_end_date\tact_start_date\tact_end_date\tlate_start_date\tlate_end_date\texpect_end_date\tearly_start_date\tearly_end_date\trem_late_start_date\trem_late_end_date\trestart_date\treend_date\tsuspend_date\tresume_date\tcreate_date\tupdate_date\tcstr_date\tcstr_type\tcstr_date2\tcstr_type2\ttotal_float_hr_cnt\tfree_float_hr_cnt\tfloat_path\tfloat_path_order\ttarget_work_qty\tact_work_qty\ttarget_equip_qty\tact_equip_qty
%R\t101\t1\t11\t1\t0.0\tCP_Drtn\tTT_Task\tTK_NotStart\tL6-PIP-XER\tErect Line 28 Spools\tDT_Fixed\t80.0\t80.0\tY\t2026-03-01 08:00\t2026-03-15 17:00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t0\t\t\t0\t0\t0\t0
%E
'''

    xer_upload = client.post(
        "/schedule/import/xer",
        data={"project_id": project_id},
        files={"file": ("sample_schedule.xer", xer_sample_bytes, "application/octet-stream")},
        headers=planner_headers,
    )
    assert xer_upload.status_code == 201
    xer_res = xer_upload.json()
    assert xer_res["imported_count"] == 1
    assert xer_res["source_type"] == "xer"
    assert "L6-PIP-XER" in xer_res["sample_activity_ids"]

    # Verify total activities in project is now 36 + 1 = 37
    total_resp = client.get(f"/schedule/activities?project_id={project_id}", headers=planner_headers)
    assert total_resp.status_code == 200
    assert total_resp.json()["total"] == 37


def test_openapi_contract_documentation():
    """Verify FastAPI /openapi.json contains complete schemas for team contracts."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    spec = resp.json()
    schemas = spec["components"]["schemas"]

    expected_schemas = [
        "UserRegister",
        "UserResponse",
        "Token",
        "ProjectCreate",
        "ProjectResponse",
        "ActivityResponse",
        "ActivityListResponse",
        "ScheduleImportResponse",
        "DisciplineEnum",
        "SourceTypeEnum",
        "DecisionEnum",
        "EventTypeEnum",
        "UserRoleEnum",
    ]
    for s in expected_schemas:
        assert s in schemas, f"Missing schema contract: {s}"
