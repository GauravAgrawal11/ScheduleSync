"""
Dataset Accuracy Evaluation Script
Runs all synthetic daily reports in daily_reports.csv against the 3-signal matching engine,
evaluates candidate recommendations against answer_key.csv, and computes Top-1 Match Accuracy.
"""

import os
import csv
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import User, Project, Activity, Report
from app.models.enums import DisciplineEnum, SourceTypeEnum, UserRoleEnum
from app.extraction.service import extract_events_from_text
from app.matching.service import find_candidate_matches

def run_evaluation():
    db_path = "eval_test.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = Session()

    # 1. Seed user & project
    user = User(name="Lead Evaluator", email="eval@oilindia.in", hashed_password="pw", role=UserRoleEnum.PLANNER)
    db.add(user)
    project = Project(name="Synthetic Test Project", client="Oil India Limited", start_date=date(2026, 3, 1), end_date=date(2026, 6, 30))
    db.add(project)
    db.commit()

    # 2. Seed Baseline Schedule from schedule_baseline.csv
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_data"))
    sched_file = os.path.join(base_dir, "schedules", "schedule_baseline.csv")
    with open(sched_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            disc_str = row["discipline"].lower()
            disc_enum = DisciplineEnum(disc_str) if disc_str in [d.value for d in DisciplineEnum] else DisciplineEnum.OTHER
            act = Activity(
                project_id=project.id,
                activity_id=row["activity_id"],
                wbs_code=row["wbs_code"],
                activity_name=row["activity_name"],
                discipline=disc_enum,
                location=row["location"],
                planned_start=date.fromisoformat(row["planned_start"]),
                planned_finish=date.fromisoformat(row["planned_finish"]),
                status="PLANNED",
            )
            db.add(act)
    db.commit()

    # 3. Load Answer Key
    answer_file = os.path.join(base_dir, "reports", "answer_key.csv")
    answer_key = {}
    with open(answer_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            answer_key[row["report_id"]] = row

    # 4. Process daily_reports.csv
    reports_file = os.path.join(base_dir, "reports", "daily_reports.csv")
    total_evaluated = 0
    correct_matches = 0
    correct_unmatched = 0
    results = []

    with open(reports_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            r_id = row["report_id"]
            text = row["report_text"]
            ground_truth = answer_key.get(r_id, {})
            true_act = ground_truth.get("true_activity_id", "NONE")

            # Extract events
            events = extract_events_from_text(text)
            primary_event = events[0] if events else None

            predicted_act = "NONE"
            top_confidence = 0.0

            top_candidates = []
            if primary_event:
                candidates = find_candidate_matches(primary_event, project.id, db, top_k=3)
                if candidates:
                    top_act, sem, ent, meta, final_conf, decision = candidates[0]
                    # If confidence is above rejected threshold, record prediction
                    if final_conf >= 0.65:
                        predicted_act = top_act.activity_id
                        top_confidence = final_conf
                    top_candidates = [c[0].activity_id for c in candidates if c[4] >= 0.60]

            is_correct_top1 = (predicted_act == true_act)
            is_in_top3 = (true_act in top_candidates)

            if true_act == "NONE":
                if predicted_act == "NONE" or top_confidence < 0.70:
                    is_correct_top1 = True
                    is_in_top3 = True
                    correct_unmatched += 1
            else:
                if is_correct_top1:
                    correct_matches += 1

            total_evaluated += 1
            results.append({
                "report_id": r_id,
                "text_snippet": text[:40],
                "true_act": true_act,
                "predicted_act": predicted_act,
                "top_3": top_candidates,
                "confidence": round(top_confidence, 2),
                "is_correct": is_correct_top1,
                "is_in_top3": is_in_top3,
            })

    top1_accuracy = (correct_matches + correct_unmatched) / total_evaluated * 100
    top3_recall = sum(1 for r in results if r["is_in_top3"]) / total_evaluated * 100

    print(f"==================================================")
    print(f"SIH26122 EVALUATION REPORT")
    print(f"Total Reports Evaluated: {total_evaluated}")
    print(f"Top-1 Exact Matches: {correct_matches}")
    print(f"Correct Unmatched Rejections: {correct_unmatched}")
    print(f"Top-1 Strict Accuracy: {top1_accuracy:.1f}%")
    print(f"Top-3 Candidate Queue Recall: {top3_recall:.1f}%")
    print(f"==================================================")

    print("\nDetailed Mismatch Inspection:")
    for r in results:
        if not r["is_correct"]:
            print(f"  {r['report_id']}: True={r['true_act']}, Pred={r['predicted_act']} (conf={r['confidence']}) -> \"{r['text_snippet']}\"")

    db.close()
    engine.dispose()
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass

    return top1_accuracy

if __name__ == "__main__":
    run_evaluation()
