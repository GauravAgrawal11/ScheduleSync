import os
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.models import User, Project, Activity, Report, Match, ProgressEvent, AuditLog

test_engine = create_engine("sqlite:///./test_runner.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = lambda: TestingSessionLocal()
    db = TestingSessionLocal()
    db.query(AuditLog).delete()
    db.query(ProgressEvent).delete()
    db.query(Match).delete()
    db.query(Report).delete()
    db.query(Activity).delete()
    db.query(Project).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    yield
    app.dependency_overrides.clear()


def test_member_b_and_c_end_to_end():
    # 1. Setup Planner & Supervisor accounts
    planner_res = client.post("/auth/register", json={
        "name": "Pranab Planner",
        "email": "planner@oilindia.in",
        "password": "Password123!",
        "role": "planner",
        "discipline": "Piping"
    })
    assert planner_res.status_code == 201

    sup_res = client.post("/auth/register", json={
        "name": "Sanjay Supervisor",
        "email": "supervisor@oilindia.in",
        "password": "Password123!",
        "role": "supervisor",
        "discipline": "Civil"
    })
    assert sup_res.status_code == 201

    p_tok = client.post("/auth/login", data={"username": "planner@oilindia.in", "password": "Password123!"}).json()["access_token"]
    s_tok = client.post("/auth/login", data={"username": "supervisor@oilindia.in", "password": "Password123!"}).json()["access_token"]

    p_headers = {"Authorization": f"Bearer {p_tok}"}
    s_headers = {"Authorization": f"Bearer {s_tok}"}

    # 2. Create Project and Import Schedule
    proj = client.post("/schedule/projects", json={
        "name": "OIL Duliajan Compressor Expansion",
        "client": "Oil India Limited",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31"
    }, headers=p_headers).json()
    project_id = proj["id"]

    schedule_path = os.path.join(os.path.dirname(__file__), "..", "sample_data", "schedules", "baseline_schedule.csv")
    with open(schedule_path, "rb") as f:
        csv_bytes = f.read()

    import_res = client.post(
        "/schedule/import/excel",
        data={"project_id": project_id},
        files={"file": ("baseline_schedule.csv", csv_bytes, "text/csv")},
        headers=p_headers
    )
    assert import_res.status_code == 201

    # 3. Test Voice Transcription endpoint
    fake_wav = b"RIFF....WAVEfmt ...."
    v_res = client.post(
        "/voice/transcribe",
        files={"file": ("test.wav", fake_wav, "audio/wav")},
        headers=s_headers
    )
    assert v_res.status_code == 200
    assert "text" in v_res.json()

    # 4. Member B: Ingestion of site report (Text report matching piping activity)
    report_text = """
    DAILY PROGRESS REPORT
    Date: 2026-03-05
    Location: Area 01
    Discipline: Piping
    Supervisor: Sanjay

    Activity: Completed welding of 12 joint spools on Line 28 in Area 01.
    Status: completed
    Line Number: Line-28
    """
    ingest_res = client.post(
        "/ingestion/report",
        data={
            "project_id": project_id,
            "discipline": "Piping",
            "source_type": "text",
            "extracted_text": report_text,
            "shift": "day"
        },
        headers=s_headers
    )
    assert ingest_res.status_code == 201
    report_data = ingest_res.json()
    assert report_data["report_id"] is not None
    assert len(report_data["extracted_events"]) >= 1

    # 5. Member C: Verify Candidate Matches & Review Queue
    queue_res = client.get(f"/review/queue", headers=p_headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert len(queue) >= 1
    first_match = queue[0]
    match_id = first_match["match_id"]
    assert "signals" in first_match
    assert first_match["signals"]["semantic"] >= 0
    assert first_match["signals"]["entity"] >= 0
    assert first_match["signals"]["metadata"] >= 0
    assert first_match["final_confidence"] >= 0

    # 6. Member C: Planner Approval
    approve_res = client.post(
        f"/review/{match_id}/approve",
        headers=p_headers
    )
    assert approve_res.status_code == 200
    approved_match = approve_res.json()
    assert approved_match["success"] is True
    assert approved_match["status"] in ["IN_PROGRESS", "COMPLETED", "in_progress", "completed"]

    # 7. Member C: Analytics Summary
    summary_res = client.get(f"/analytics/summary?project_id={project_id}", headers=p_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_activities"] >= 36
    assert "delay_hotspots" in summary
    assert "discipline_productivity" in summary

    # 8. Member C: Gantt data
    gantt_res = client.get(f"/analytics/gantt?project_id={project_id}", headers=p_headers)
    assert gantt_res.status_code == 200
    gantt = gantt_res.json()
    assert len(gantt) >= 36

    # 9. Member C: Activity Audit History
    act_code = first_match["suggested_activity"]["activity_id"]
    hist_res = client.get(f"/activities/{act_code}/history", headers=p_headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 1
    assert "event_type" in hist[0]
