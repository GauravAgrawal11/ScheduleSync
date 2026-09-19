"""
Verification test for Feature 1 (Constraint-aware completion gate)
and Feature 2 (Daily activity checker).
"""

import sys
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.activity import Activity
from app.models.match import Match
from app.models.report import Report
from app.models.progress_event import ProgressEvent
from app.models.audit_log import AuditLog
from app.models.enums import DecisionEnum, SourceTypeEnum, EventTypeEnum
from app.analytics.sequence import SequenceViolation
from app.linking.service import apply_match_link
from app.analytics.daily_summary import get_daily_summary, get_daily_summary_by_supervisor


def run_tests():
    db = SessionLocal()
    client = TestClient(app)

    print("\n========================================================")
    print("TEST 1: Constraint-Aware Completion Gate")
    print("========================================================")

    # Pick a predecessor-successor pair from synthetic dataset
    # L6-PIP-103 depends on L6-PIP-101
    pred_act = db.query(Activity).filter(Activity.activity_id == "L6-PIP-101").first()
    succ_act = db.query(Activity).filter(Activity.activity_id == "L6-PIP-103").first()

    assert pred_act is not None, "Predecessor L6-PIP-101 not found"
    assert succ_act is not None, "Successor L6-PIP-103 not found"

    # Ensure predecessor is NOT completed
    pred_act.status = "IN_PROGRESS"
    pred_act.actual_finish = None
    succ_act.status = "IN_PROGRESS"
    succ_act.actual_finish = None
    db.commit()

    # Create dummy report for high-confidence match attempting completion
    rep = Report(
        project_id=succ_act.project_id,
        file_name="test_site_radio_note.txt",
        source_type=SourceTypeEnum.VOICE,
        raw_text="Hydrotest Line 24 manifold completed and signed off today.",
    )
    db.add(rep)
    db.flush()

    match_violating = Match(
        report_id=rep.id,
        activity_id=succ_act.id,
        semantic_score=0.95,
        entity_score=0.92,
        metadata_score=0.90,
        final_confidence=0.93,  # > 90% HIGH confidence
        decision=DecisionEnum.AUTO,  # Initial matching proposal
    )
    db.add(match_violating)
    db.commit()

    # Invoke apply_match_link as system auto-approve path (approved_by_user_id=None)
    res_event = apply_match_link(
        match=match_violating,
        approved_by_user_id=None,
        db=db,
        actual_finish=date(2026, 3, 1),
        action_note="AUTO_APPROVE_HIGH_CONFIDENCE",
    )

    # Verify Criterion 1: Held for review, not auto-applied
    assert res_event is None, "Expected apply_match_link to return None when held for sequence violation"
    assert match_violating.decision == DecisionEnum.REVIEW, f"Expected match decision REVIEW, got {match_violating.decision}"
    
    # Verify baseline schedule activity is protected (NOT completed)
    db.refresh(succ_act)
    assert succ_act.status != "COMPLETED", f"Successor should NOT be marked completed, got {succ_act.status}"

    # Verify audit log entry
    audit = (
        db.query(AuditLog)
        .filter(AuditLog.action == "HELD_FOR_SEQUENCE_VIOLATION")
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert audit is not None, "Expected AuditLog with action HELD_FOR_SEQUENCE_VIOLATION"
    assert "held for sequence violation" in str(audit.new_value), f"Expected reason in audit log, got {audit.new_value}"
    print("[PASS] Test 1 Passed: Match with high confidence (>90%) for activity with sequence violation is held for review, activity status unchanged, audit log recorded.")

    print("\n========================================================")
    print("TEST 2: Match with High Confidence and NO Violation Auto-Applies")
    print("========================================================")

    # An activity with no predecessor (e.g. L6-CIV-201 or head activity)
    head_act = db.query(Activity).filter(Activity.activity_id == "L6-CIV-201").first()
    assert head_act is not None, "Head activity L6-CIV-201 not found"
    head_act.status = "IN_PROGRESS"
    head_act.actual_finish = None
    db.commit()

    rep2 = Report(
        project_id=head_act.project_id,
        file_name="test_head_activity.txt",
        source_type=SourceTypeEnum.TEXT,
        raw_text="Excavation footing F-12 completed successfully.",
    )
    db.add(rep2)
    db.flush()

    match_valid = Match(
        report_id=rep2.id,
        activity_id=head_act.id,
        semantic_score=0.96,
        entity_score=0.94,
        metadata_score=0.90,
        final_confidence=0.94,
        decision=DecisionEnum.AUTO,
    )
    db.add(match_valid)
    db.commit()

    res_event2 = apply_match_link(
        match=match_valid,
        approved_by_user_id=None,
        db=db,
        actual_finish=date(2026, 3, 2),
        action_note="AUTO_APPROVE_HIGH_CONFIDENCE",
    )

    assert res_event2 is not None, "Expected progress event returned for valid auto-apply"
    assert match_valid.decision == DecisionEnum.AUTO, f"Expected AUTO decision, got {match_valid.decision}"
    db.refresh(head_act)
    assert head_act.status == "COMPLETED", f"Expected COMPLETED status, got {head_act.status}"
    assert head_act.actual_finish == date(2026, 3, 2)
    print("[PASS] Test 2 Passed: Match with high confidence and NO violation auto-applies exactly as before.")

    print("\n========================================================")
    print("TEST 3: Daily Activity Checker Endpoints & Totals Consistency")
    print("========================================================")

    test_date = date(2026, 3, 15)
    proj_id = 1

    # Insert 2 known progress events on test_date
    act_a = db.query(Activity).filter(Activity.project_id == proj_id).all()[0]
    act_b = db.query(Activity).filter(Activity.project_id == proj_id).all()[1]

    pe1 = ProgressEvent(
        activity_id=act_a.id,
        source_report_id=rep.id,
        event_type=EventTypeEnum.FINISH,
        actual_finish=test_date,
        status="COMPLETED",
        confidence=0.95,
    )
    pe2 = ProgressEvent(
        activity_id=act_b.id,
        source_report_id=rep.id,
        event_type=EventTypeEnum.FINISH,
        actual_finish=test_date,
        status="COMPLETED",
        confidence=0.91,
    )
    db.add(pe1)
    db.add(pe2)
    db.commit()

    # Direct function test
    ds = get_daily_summary(project_id=proj_id, target_date=test_date, db=db)
    dss = get_daily_summary_by_supervisor(project_id=proj_id, target_date=test_date, db=db)

    print(f"Discipline Totals: Completed Today = {ds.completed_today_count}, Remaining = {ds.remaining_count}, Total = {ds.total_activities}")
    print(f"Supervisor Totals: Completed Today = {dss.totals['completed_today_count']}, Remaining = {dss.totals['remaining_count']}, Total = {dss.totals['total_activities']}")

    # Acceptance criteria verification
    assert ds.completed_today_count >= 2, f"Expected at least 2 completed today, got {ds.completed_today_count}"
    assert ds.completed_today_count == dss.totals["completed_today_count"], "Completed today count mismatch between discipline and supervisor summary!"
    assert ds.remaining_count == dss.totals["remaining_count"], "Remaining count mismatch between discipline and supervisor summary!"
    assert ds.total_activities == dss.totals["total_activities"], "Total activities mismatch between discipline and supervisor summary!"

    # Also sum supervisor individual items
    sum_sup_completed = sum(s.completed_today for s in dss.by_supervisor)
    sum_sup_remaining = sum(s.remaining for s in dss.by_supervisor)
    sum_sup_total = sum(s.total for s in dss.by_supervisor)

    assert sum_sup_completed == ds.completed_today_count, f"Sum of supervisor completed ({sum_sup_completed}) != {ds.completed_today_count}"
    assert sum_sup_remaining == ds.remaining_count, f"Sum of supervisor remaining ({sum_sup_remaining}) != {ds.remaining_count}"
    assert sum_sup_total == ds.total_activities, f"Sum of supervisor total ({sum_sup_total}) != {ds.total_activities}"

    # HTTP Endpoint test via TestClient
    resp1 = client.get(f"/analytics/daily-summary?project_id={proj_id}&date={test_date.isoformat()}")
    assert resp1.status_code == 200, f"Expected 200, got {resp1.status_code}: {resp1.text}"
    body1 = resp1.json()
    assert body1["completed_today_count"] == ds.completed_today_count
    assert len(body1["completed_today"]) == ds.completed_today_count
    assert body1["remaining_count"] == ds.remaining_count

    resp2 = client.get(f"/analytics/daily-summary/by-supervisor?project_id={proj_id}&date={test_date.isoformat()}")
    assert resp2.status_code == 200, f"Expected 200, got {resp2.status_code}: {resp2.text}"
    body2 = resp2.json()
    assert body2["totals"]["completed_today_count"] == ds.completed_today_count
    assert body2["totals"]["remaining_count"] == ds.remaining_count
    assert body2["totals"]["total_activities"] == ds.total_activities

    print("[PASS] Test 3 Passed: GET /analytics/daily-summary and /analytics/daily-summary/by-supervisor return accurate counts and exact matching totals.")
    print("\nALL VERIFICATION CRITERIA MET SUCCESSFULLY!")

    db.close()


if __name__ == "__main__":
    run_tests()
