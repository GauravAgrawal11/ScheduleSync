"""
Comprehensive Smoke Test for ScheduleSync Backend
Verifies authentication, core modules, database models, and API endpoints.
"""
import sys
import os

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("STARTING SCHEDULESYNC BACKEND COMPREHENSIVE CHECKS")
    print("==================================================")
    
    checks_passed = 0
    total_checks = 0

    def check(name, fn):
        nonlocal checks_passed, total_checks
        total_checks += 1
        try:
            fn()
            print(f"[PASS] {name}")
            checks_passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")

    # 1. Health endpoint
    def test_health():
        res = client.get("/health")
        assert res.status_code == 200, f"Status: {res.status_code}"
        assert res.json().get("status") == "healthy"
    check("GET /health", test_health)

    # 2. Authentication: Login as planner to obtain JWT token
    token = None
    headers = {}
    def test_login():
        nonlocal token, headers
        res = client.post(
            "/auth/login",
            data={"username": "planner@oilindia.in", "password": "SecurePlannerPassword123!"},
        )
        assert res.status_code == 200, f"Status: {res.status_code}, error: {res.text}"
        data = res.json()
        assert "access_token" in data
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    check("POST /auth/login (JWT Auth)", test_login)

    # 3. Schedule: Projects list & Activities
    def test_schedule():
        res = client.get("/schedule/projects", headers=headers)
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert "projects" in data and len(data["projects"]) > 0

        res_act = client.get("/schedule/activities?project_id=1", headers=headers)
        assert res_act.status_code == 200, f"Status: {res_act.status_code}"
        act_data = res_act.json()
        assert "activities" in act_data
    check("GET /schedule/projects & /schedule/activities?project_id=1", test_schedule)

    # 4. Analytics: Daily Summary
    def test_daily_summary():
        res = client.get("/analytics/daily-summary?project_id=1")
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert "completed_today" in data
        assert "remaining_by_discipline" in data
        assert "completed_today_count" in data
        assert "remaining_count" in data
        assert "total_activities" in data
    check("GET /analytics/daily-summary", test_daily_summary)

    # 5. Analytics: Daily Summary by Supervisor
    def test_daily_summary_supervisor():
        res = client.get("/analytics/daily-summary/by-supervisor?project_id=1")
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert "by_supervisor" in data
    check("GET /analytics/daily-summary/by-supervisor", test_daily_summary_supervisor)

    # 6. Analytics: Sequence Violations
    def test_sequence_violations():
        res = client.get("/analytics/sequence-violations")
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert isinstance(data, list)
    check("GET /analytics/sequence-violations", test_sequence_violations)

    # 7. Review Queue (Authenticated)
    def test_review_queue():
        res = client.get("/review/queue?project_id=1", headers=headers)
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert isinstance(data, list)
    check("GET /review/queue", test_review_queue)

    # 8. Live Workflow & Network Graph
    def test_workflow():
        res = client.get("/workflow/live?project_id=1", headers=headers)
        assert res.status_code == 200, f"Status: {res.status_code}"
        res2 = client.get("/workflow/network?project_id=1", headers=headers)
        assert res2.status_code == 200, f"Status: {res2.status_code}"
    check("GET /workflow/live & /workflow/network", test_workflow)

    # 9. Supervisor Assignment: Admin Workload View
    def test_assignment():
        res = client.get("/assignment/admin-view?project_id=1", headers=headers)
        assert res.status_code == 200, f"Status: {res.status_code}"
    check("GET /assignment/admin-view", test_assignment)

    # 10. OpenAPI Docs generation
    def test_openapi():
        res = client.get("/openapi.json")
        assert res.status_code == 200, f"Status: {res.status_code}"
        schema = res.json()
        assert "paths" in schema
    check("GET /openapi.json", test_openapi)

    print("==================================================")
    print(f"RESULTS: {checks_passed}/{total_checks} CHECKS PASSED")
    print("==================================================")
    if checks_passed != total_checks:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
