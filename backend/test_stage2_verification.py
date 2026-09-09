"""
Stage 2 Verification Script
Tests each endpoint individually via HTTP client against live server or TestClient fallback.
"""
import json
import os
import requests

BASE_URL = "http://127.0.0.1:8000"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

test_engine = create_engine("sqlite:///./test_runner.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def get_client():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = lambda: TestingSessionLocal()
    return TestClient(app)

def test_stage2():
    client = get_client()
    print("--- 1. Testing /auth/register and /auth/login ---")
    planner_payload = {
        "name": "Stage2 Admin",
        "email": "planner.stage2@oilindia.in",
        "password": "Password123!",
        "role": "planner",
        "discipline": "Piping",
    }
    # Register (or ignore if already exists)
    r_reg = client.post(f"{BASE_URL}/auth/register", json=planner_payload)
    print(f"Register status: {r_reg.status_code}")

    r_login = client.post(
        f"{BASE_URL}/auth/login",
        data={"username": "planner.stage2@oilindia.in", "password": "Password123!"}
    )
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token_data = r_login.json()
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login OK: received token (type: {token_data['token_type']})")

    r_me = client.get(f"{BASE_URL}/auth/me", headers=headers)
    assert r_me.status_code == 200, f"/auth/me failed: {r_me.text}"
    print(f"/auth/me OK: user={r_me.json()['email']}, role={r_me.json()['role']}")

    print("\n--- 2. Testing Project Creation & /schedule/import/excel ---")
    proj_res = client.post(
        f"{BASE_URL}/schedule/projects",
        json={"name": "Stage2 OIL Expansion", "client": "Oil India Limited", "start_date": "2026-01-01", "end_date": "2026-12-31"},
        headers=headers,
    )
    if proj_res.status_code == 201:
        project_id = proj_res.json()["id"]
    else:
        # Fetch existing
        list_proj = client.get(f"{BASE_URL}/schedule/projects", headers=headers).json()
        project_id = list_proj["projects"][0]["id"]
    print(f"Using Project ID: {project_id}")

    sched_file = os.path.join(os.path.dirname(__file__), "..", "sample_data", "schedules", "schedule_baseline.csv")
    with open(sched_file, "rb") as f:
        csv_bytes = f.read()

    r_import = client.post(
        f"{BASE_URL}/schedule/import/excel",
        data={"project_id": project_id},
        files={"file": ("schedule_baseline.csv", csv_bytes, "text/csv")},
        headers=headers,
    )
    assert r_import.status_code == 201, f"Schedule import failed: {r_import.text}"
    import_data = r_import.json()
    print(f"Import OK: count={import_data['imported_count']} activities. Samples: {import_data['sample_activity_ids'][:3]}")

    print("\n--- 3. Testing POST /ingestion/report with 3 sample reports ---")
    sample_reports = [
        ("Piping Line 24", "Piping crew completed spool erection on Line 24 in Unit 3 today. 4 joints fitted up and bolt-up in progress."),
        ("Spreadsheet Row", "Line 31 | Piping | Pipe Rack A | Erection of carbon steel pipe | Complete | 11-Mar-2026"),
        ("Delay Blocker", "Rain water accumulation in foundation F-12 pit delayed RCC pour by 24 hours. Dewatering pumps deployed."),
    ]
    ingested_reports = []
    for label, text in sample_reports:
        res = client.post(
            f"{BASE_URL}/ingestion/report",
            data={
                "project_id": project_id,
                "text": text,
                "discipline": "Piping",
                "location": "Unit 3",
            },
            headers=headers,
        )
        assert res.status_code == 201, f"Ingestion failed for {label}: {res.text}"
        data = res.json()
        ev = data["extracted_events"][0] if data["extracted_events"] else None
        print(f"Ingested '{label}': report_id={data['report_id']}, status={data['status']}")
        if ev:
            print(f"  Extracted: desc='{ev['activity_description'][:35]}...', line={ev['line_number']}, disc={ev['discipline']}, loc={ev['location']}, status={ev['status']}")
        if data.get("suggested_match"):
            sm = data["suggested_match"]
            print(f"  Suggested Match: match_id={sm['match_id']}, act={sm['activity_id']}, conf={sm['confidence']}, decision={sm['decision']}")
            ingested_reports.append(sm)

    print("\n--- 4. Testing Review Queue & Confidence Tier Gating ---")
    r_queue = client.get(f"{BASE_URL}/review/queue", headers=headers)
    assert r_queue.status_code == 200, f"Queue fetch failed: {r_queue.text}"
    queue = r_queue.json()
    print(f"Review Queue items: {len(queue)}")
    assert len(queue) >= 1, "Expected at least 1 item in review queue"
    target_match = queue[0]
    match_id = target_match["match_id"]
    print(f"Inspecting match #{match_id}: act={target_match['suggested_activity']['activity_id']}, confidence={target_match['final_confidence']}, decision={target_match['decision']}")
    print(f"  Signal Breakdown: semantic={target_match['signals']['semantic']}, entity={target_match['signals']['entity']}, metadata={target_match['signals']['metadata']}")

    print("\n--- 5. Testing POST /review/{match_id}/approve ---")
    r_approve = client.post(f"{BASE_URL}/review/{match_id}/approve", headers=headers)
    assert r_approve.status_code == 200, f"Approval failed: {r_approve.text}"
    print(f"Approval OK: {r_approve.json()}")

    # Verify Activity History has progress event & audit trail
    act_code = target_match["suggested_activity"]["activity_id"]
    r_hist = client.get(f"{BASE_URL}/activities/{act_code}/history", headers=headers)
    assert r_hist.status_code == 200, f"History fetch failed: {r_hist.text}"
    hist = r_hist.json()
    print(f"Activity {act_code} History: {len(hist)} events logged. Latest event: {hist[0]}")

    print("\n--- 6. Testing GET /analytics/summary ---")
    r_summary = client.get(f"{BASE_URL}/analytics/summary?project_id={project_id}", headers=headers)
    assert r_summary.status_code == 200, f"Summary failed: {r_summary.text}"
    summary = r_summary.json()
    print(f"Analytics Summary:")
    print(f"  Total Activities: {summary['total_activities']}")
    print(f"  In Progress: {summary['in_progress']}")
    print(f"  Completed: {summary['completed']}")
    print(f"  Needs Review: {summary['needs_review']}")
    print(f"  Delay Hotspots: {len(summary['delay_hotspots'])} identified")
    assert summary["total_activities"] > 0, "Summary total_activities should be > 0"
    print("\nSTAGE 2 VERIFICATION: ALL 6 ENDPOINT TESTS PASSED!")

if __name__ == "__main__":
    test_stage2()
