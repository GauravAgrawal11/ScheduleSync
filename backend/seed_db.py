"""
ScheduleSync: Seed Database with Official Running Project & 36 Activities
Project 1: Numaligarh Refinery Expansion (Unit 3 & Offsites) - 36 Activities
"""

from datetime import date
from sqlalchemy import text
from app.core.database import SessionLocal, Base, engine
from app.models.project import Project
from app.models.activity import Activity
from app.models.enums import DisciplineEnum
from app.models.user import User
from app.models.match import Match
from app.models.enums import DecisionEnum, SourceTypeEnum
from app.models.progress_event import ProgressEvent
from app.models.enums import EventTypeEnum
from app.auth.security import get_password_hash

def seed():
    if engine.dialect.name == "postgresql":
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.execute(text("TRUNCATE TABLE audit_log, complaints, matches, progress_events, reports, activity_assignments, activity_assignment_history, activity_embeddings, activities, projects RESTART IDENTITY CASCADE;"))
                conn.commit()
        except Exception as e:
            print(f"Note: pgvector / truncate setup: {e}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        from app.models.report import Report
        from app.complaints.models import Complaint
        from app.models.audit_log import AuditLog

        # Clear existing data for SQLite
        if engine.dialect.name != "postgresql":
            db.query(AuditLog).delete()
            db.query(Complaint).delete()
            db.query(Match).delete()
            db.query(ProgressEvent).delete()
            db.query(Report).delete()
            db.query(Activity).delete()
            db.query(Project).delete()
            db.commit()



        # 2. Seed Users
        users_to_seed = [
            ("Admin", "planner@oilindia.in", "planner", "piping", "SecurePlannerPassword123!"),
            ("Supervisor 1 - Piping", "piping.sup1@oilindia.in", "supervisor", "piping", "SecureSupervisorPassword123!"),
            ("Supervisor 2 - Piping", "piping.sup2@oilindia.in", "supervisor", "piping", "SecureSupervisorPassword123!"),
            ("Supervisor 1 - Civil", "supervisor@oilindia.in", "supervisor", "civil", "SecureSupervisorPassword123!"),
            ("Supervisor 2 - Civil", "civil.sup2@oilindia.in", "supervisor", "civil", "SecureSupervisorPassword123!"),
            ("Supervisor 1 - Electrical", "electrical.sup1@oilindia.in", "supervisor", "electrical", "SecureSupervisorPassword123!"),
            ("Supervisor 2 - Electrical", "electrical.sup2@oilindia.in", "supervisor", "electrical", "SecureSupervisorPassword123!"),
        ]

        from app.models.enums import UserRoleEnum
        for u_name, u_email, u_role, u_disc, u_pw in users_to_seed:
            role_enum = UserRoleEnum.PLANNER if u_role == "planner" else UserRoleEnum.SUPERVISOR
            existing = db.query(User).filter(User.email == u_email).first()
            if not existing:
                db.add(User(
                    name=u_name,
                    email=u_email,
                    hashed_password=get_password_hash(u_pw),
                    role=role_enum,
                    discipline=u_disc
                ))
            else:
                existing.name = u_name
                existing.role = role_enum
                existing.discipline = u_disc
                existing.hashed_password = get_password_hash(u_pw)
        db.commit()

        # 3. Create the Active Running Projects
        p1 = Project(
            id=1,
            name="Numaligarh Refinery Expansion (Unit 3 & Offsites)",
            client="Oil India Limited",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        p2 = Project(
            id=2,
            name="Duliajan Central Gas Gathering Station (CGGS-2)",
            client="Oil India Limited",
            start_date=date(2026, 1, 15),
            end_date=date(2026, 11, 30),
        )
        p3 = Project(
            id=3,
            name="Guwahati-Siliguri Pipeline Modernization (Phase II)",
            client="Oil India Limited",
            start_date=date(2026, 2, 1),
            end_date=date(2027, 3, 31),
        )
        db.add_all([p1, p2, p3])
        db.commit()

        # 4. Define all 36 activities
        # 14 COMPLETED
        completed_activities = [
            ("L6-PIP-101", "3.2.1.1", "Erect Line 24 (12in CS pipe)", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 1), date(2026, 2, 5)),
            ("L6-PIP-102", "3.2.1.2", "Erect Line 31 (8in CS pipe)", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 2), date(2026, 2, 6)),
            ("L6-PIP-103", "3.2.1.3", "Hydrotest Line 24 manifold", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 6), date(2026, 2, 8)),
            ("L6-PIP-105", "3.2.1.5", "Install gate valve GV-01", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 3), date(2026, 2, 6)),
            ("L6-PIP-106", "3.2.1.6", "Erect spool SP-044 on Line 24", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 4), date(2026, 2, 7)),
            ("L6-PIP-107", "3.2.1.7", "Weld joint J-12 on Line 31", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 5), date(2026, 2, 8)),
            ("L6-CIV-201", "3.1.1.1", "Excavate footing F-12", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 1), date(2026, 2, 4)),
            ("L6-CIV-202", "3.1.1.2", "Lay PCC for F-12 footing", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 4), date(2026, 2, 6)),
            ("L6-CIV-204", "3.1.1.4", "Backfill around footing F-12", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 6), date(2026, 2, 8)),
            ("L6-CIV-205", "3.1.1.5", "Excavate trench TR-03", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 2), date(2026, 2, 5)),
            ("L6-CIV-206", "3.1.1.6", "Lay blinding concrete TR-03", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 5), date(2026, 2, 7)),
            ("L6-ELE-301", "3.3.1.1", "Pull 11kV cable - Substation to MCC", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 2), date(2026, 2, 6)),
            ("L6-ELE-302", "3.3.1.2", "Install cable tray in MCC building", DisciplineEnum.ELECTRICAL, "Unit 3", date(2026, 2, 4), date(2026, 2, 8)),
            ("L6-ELE-304", "3.3.1.4", "Earthing conductor laying Substation", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 5), date(2026, 2, 8)),
        ]

        # 11 IN PROGRESS
        in_progress_activities = [
            ("L6-PIP-108", "3.2.1.8", "Erect spool SP-046 on Line 31", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 7), date(2026, 2, 14)),
            ("L6-PIP-109", "3.2.1.9", "Fit-up weld joint J-14", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 8), date(2026, 2, 13)),
            ("L6-PIP-110", "3.2.1.10", "Bolt-up flange FL-08 on Line 24", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 8), date(2026, 2, 14)),
            ("L6-PIP-111", "3.2.1.11", "Pressure gauge PG-102 installation", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 9), date(2026, 2, 15)),
            ("L6-CIV-207", "3.1.1.7", "Reinforcement bar tying column C-7", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 7), date(2026, 2, 13)),
            ("L6-CIV-208", "3.1.1.8", "Formwork erection column C-7", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 8), date(2026, 2, 14)),
            ("L6-CIV-209", "3.1.1.9", "Excavate pump house pit", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 7), date(2026, 2, 14)),
            ("L6-CIV-210", "3.1.1.10", "PCC pour pump house base", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 9), date(2026, 2, 15)),
            ("L6-ELE-305", "3.3.1.5", "MCC panel positioning ground floor", DisciplineEnum.ELECTRICAL, "Unit 3", date(2026, 2, 7), date(2026, 2, 14)),
            ("L6-ELE-306", "3.3.1.6", "Control cable termination panel A", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 8), date(2026, 2, 15)),
            ("L6-ELE-307", "3.3.1.7", "Lighting distribution board LDB-1 install", DisciplineEnum.ELECTRICAL, "Unit 3", date(2026, 2, 8), date(2026, 2, 14)),
        ]

        # 6 DELAYED (with explicit delay days)
        delayed_activities = [
            ("L6-PIP-104", "3.2.1.4", "Fit-up spool SP-045 (12in CS)", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 4), date(2026, 2, 6), 4),
            ("L6-ELE-303", "3.3.1.3", "Terminate 11kV feeder cable at switchgear", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 5), date(2026, 2, 7), 3),
            ("L6-PIP-112", "3.2.1.12", "Insulation wrap Line 40", DisciplineEnum.PIPING, "Unit 3", date(2026, 2, 5), date(2026, 2, 7), 3),
            ("L6-ELE-308", "3.3.1.8", "Install lighting fixtures Substation", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 5), date(2026, 2, 7), 3),
            ("L6-ELE-309", "3.3.1.9", "Terminate motor cable P-101A", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 5), date(2026, 2, 7), 3),
            ("L6-CIV-203", "3.1.1.3", "Cast column C-7 (RCC)", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 6), date(2026, 2, 9), 1),
        ]

        # 5 PLANNED / UPCOMING
        planned_activities = [
            ("L6-CIV-211", "3.1.1.11", "Grout column bases C-7 to C-10", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 15), date(2026, 2, 20)),
            ("L6-CIV-212", "3.1.1.12", "Stormwater drain construction", DisciplineEnum.CIVIL, "Unit 3", date(2026, 2, 16), date(2026, 2, 22)),
            ("L6-ELE-310", "3.3.1.10", "Testing & commissioning MCC-A", DisciplineEnum.ELECTRICAL, "Unit 3", date(2026, 2, 16), date(2026, 2, 24)),
            ("L6-ELE-311", "3.3.1.11", "Pre-commissioning substation lighting", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 17), date(2026, 2, 23)),
            ("L6-ELE-312", "3.3.1.12", "Final punchlist closeout Electrical", DisciplineEnum.ELECTRICAL, "Substation", date(2026, 2, 20), date(2026, 2, 28)),
        ]

        # Insert activities
        db_acts = []
        for aid, wbs, name, disc, loc, p_start, p_finish in completed_activities:
            db_acts.append(Activity(
                project_id=1, activity_id=aid, wbs_code=wbs, activity_name=name,
                discipline=disc, location=loc, planned_start=p_start, planned_finish=p_finish,
                status="COMPLETED"
            ))

        for aid, wbs, name, disc, loc, p_start, p_finish in in_progress_activities:
            db_acts.append(Activity(
                project_id=1, activity_id=aid, wbs_code=wbs, activity_name=name,
                discipline=disc, location=loc, planned_start=p_start, planned_finish=p_finish,
                status="IN_PROGRESS"
            ))

        for aid, wbs, name, disc, loc, p_start, p_finish, _ in delayed_activities:
            db_acts.append(Activity(
                project_id=1, activity_id=aid, wbs_code=wbs, activity_name=name,
                discipline=disc, location=loc, planned_start=p_start, planned_finish=p_finish,
                status="DELAYED"
            ))

        for aid, wbs, name, disc, loc, p_start, p_finish in planned_activities:
            db_acts.append(Activity(
                project_id=1, activity_id=aid, wbs_code=wbs, activity_name=name,
                discipline=disc, location=loc, planned_start=p_start, planned_finish=p_finish,
                status="PLANNED"
            ))

        db.add_all(db_acts)
        db.commit()

        # Seed predecessor relationships (demonstrable case: Hydrotest Line 24 -> Erect Line 24)
        predecessors_map = {
            "L6-PIP-103": "L6-PIP-101",  # Hydrotest Line 24 manifold -> Erect Line 24
            "L6-PIP-106": "L6-PIP-101",  # Erect spool SP-044 on Line 24 -> Erect Line 24
            "L6-PIP-107": "L6-PIP-102",  # Weld joint J-12 on Line 31 -> Erect Line 31
            "L6-PIP-108": "L6-PIP-102",  # Erect spool SP-046 on Line 31 -> Erect Line 31
            "L6-PIP-110": "L6-PIP-101",  # Bolt-up flange FL-08 on Line 24 -> Erect Line 24
            "L6-PIP-111": "L6-PIP-110",  # Pressure gauge PG-102 install -> Bolt-up flange FL-08 (in-progress pair)
            "L6-CIV-202": "L6-CIV-201",  # Lay PCC for F-12 footing -> Excavate footing F-12
            "L6-CIV-204": "L6-CIV-202",  # Backfill around footing F-12 -> Lay PCC for F-12
            "L6-CIV-203": "L6-CIV-201",  # Cast column C-7 -> Excavate footing F-12
            "L6-ELE-302": "L6-ELE-301",  # Cable tray in MCC -> Pull 11kV cable
        }
        for act in db_acts:
            if act.activity_id in predecessors_map:
                act.predecessor_activity_id = predecessors_map[act.activity_id]
        db.commit()

        try:
            from fastembed import TextEmbedding
            embed_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
            act_names = [a.activity_name for a in db_acts]
            vecs = list(embed_model.embed(act_names))
            for a, v in zip(db_acts, vecs):
                a.embedding = v.tolist()
            db.commit()
            print("Populated all-MiniLM-L6-v2 pgvector embeddings for baseline activities.")
        except Exception as e:
            print(f"Embedding auto-population note: {e}")


        from app.models.report import Report
        from app.models.enums import SourceTypeEnum

        rep = Report(
            project_id=1,
            file_name="daily_site_log_2026-02-06.txt",
            source_type=SourceTypeEnum.TEXT,
            raw_text="Cast column C-7 (RCC) formwork and tying reinforcement, pouring concrete ongoing Unit 3."
        )
        db.add(rep)
        db.flush()

        # Attach progress event for the 1 recovering delay (L6-CIV-203)
        civ_203 = db.query(Activity).filter(Activity.activity_id == "L6-CIV-203").first()
        if civ_203:
            db.add(ProgressEvent(
                activity_id=civ_203.id,
                source_report_id=rep.id,
                event_type=EventTypeEnum.START,
                actual_start=date(2026, 2, 6),
                status="IN_PROGRESS",
                confidence=0.92
            ))
        # 5. Initialize Auto-Assignment across the 6 discipline supervisors
        from app.assignment.engine import assign_activities_for_project
        from app.models.activity_assignment import ActivityAssignment
        db.query(ActivityAssignment).delete()
        db.commit()
        assign_summary = assign_activities_for_project(1, db)
        print(f"Auto-Assignment initialized: {assign_summary['total_assigned']} assigned, {assign_summary['unassigned_no_supervisor']} unassigned.")

        # 6. Seed Realistic Complaints / Blockers
        from app.complaints.models import Complaint, ComplaintCategoryEnum, ComplaintStatusEnum
        from datetime import datetime, timezone

        pip_104 = db.query(Activity).filter(Activity.activity_id == "L6-PIP-104").first()
        civ_203_act = db.query(Activity).filter(Activity.activity_id == "L6-CIV-203").first()
        ele_303 = db.query(Activity).filter(Activity.activity_id == "L6-ELE-303").first()
        pip_sup1 = db.query(User).filter(User.email == "piping.sup1@oilindia.in").first()
        civ_sup1 = db.query(User).filter(User.email == "supervisor@oilindia.in").first()
        ele_sup1 = db.query(User).filter(User.email == "electrical.sup1@oilindia.in").first()
        planner_user = db.query(User).filter(User.email == "planner@oilindia.in").first()

        sample_complaints = [
            Complaint(
                project_id=1,
                activity_id=pip_104.id if pip_104 else None,
                supervisor_id=pip_sup1.id if pip_sup1 else 4,
                category=ComplaintCategoryEnum.MATERIAL_DELAY,
                description="Awaiting 12-inch CS flange shipment from vendor warehouse. Consignment delayed by 4 days due to NH37 road blockages.",
                status=ComplaintStatusEnum.OPEN,
                created_at=datetime(2026, 2, 6, 9, 30, tzinfo=timezone.utc),
            ),
            Complaint(
                project_id=1,
                activity_id=civ_203_act.id if civ_203_act else None,
                supervisor_id=civ_sup1.id if civ_sup1 else 2,
                category=ComplaintCategoryEnum.EQUIPMENT_BREAKDOWN,
                description="Transit concrete mixer hydraulic failure during pour. Standby batching plant truck requested for column C-7.",
                status=ComplaintStatusEnum.ACKNOWLEDGED,
                created_at=datetime(2026, 2, 6, 11, 15, tzinfo=timezone.utc),
            ),
            Complaint(
                project_id=1,
                activity_id=ele_303.id if ele_303 else None,
                supervisor_id=ele_sup1.id if ele_sup1 else 7,
                category=ComplaintCategoryEnum.ACCESS_BLOCKED,
                description="Civil scaffold obstruction at Substation trench entry. Scaffolding cleared and access restored.",
                status=ComplaintStatusEnum.RESOLVED,
                created_at=datetime(2026, 2, 5, 14, 0, tzinfo=timezone.utc),
                resolved_at=datetime(2026, 2, 6, 8, 30, tzinfo=timezone.utc),
                resolved_by=planner_user.id if planner_user else 1,
            ),
        ]
        db.add_all(sample_complaints)
        # 8. Seed Sample Field Reports & Candidate Matches (Review Queue)
        pip_sup2 = db.query(User).filter(User.email == "piping.sup2@oilindia.in").first()
        civ_sup2 = db.query(User).filter(User.email == "civil.sup2@oilindia.in").first()
        ele_sup2 = db.query(User).filter(User.email == "electrical.sup2@oilindia.in").first()

        pip_101 = db.query(Activity).filter(Activity.activity_id == "L6-PIP-101").first()
        civ_201 = db.query(Activity).filter(Activity.activity_id == "L6-CIV-201").first()
        civ_207 = db.query(Activity).filter(Activity.activity_id == "L6-CIV-207").first()
        ele_301 = db.query(Activity).filter(Activity.activity_id == "L6-ELE-301").first()
        ele_302 = db.query(Activity).filter(Activity.activity_id == "L6-ELE-302").first()

        sample_reports_and_matches = [
            # 1. Medium Confidence Candidate - Piping (70-90% Planner Review)
            (
                Report(
                    project_id=1,
                    file_name="piping_spool_erection_log.txt",
                    source_type=SourceTypeEnum.TEXT,
                    raw_text="Piping crew completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up and bolt-up in progress.",
                    uploaded_by=pip_sup1.id if pip_sup1 else 4,
                    uploaded_at=datetime(2026, 2, 6, 16, 30, tzinfo=timezone.utc),
                ),
                Match(
                    activity_id=pip_101.id if pip_101 else 1,
                    semantic_score=0.88,
                    entity_score=0.85,
                    metadata_score=0.90,
                    final_confidence=0.82,
                    decision=DecisionEnum.REVIEW,
                ),
            ),
            # 2. Medium Confidence Candidate - Civil (70-90% Planner Review)
            (
                Report(
                    project_id=1,
                    file_name="civil_column_pour.csv",
                    source_type=SourceTypeEnum.TEXT,
                    raw_text="RCC pouring ongoing near column C-7 area, 6 cum poured with shuttering in place.",
                    uploaded_by=civ_sup1.id if civ_sup1 else 2,
                    uploaded_at=datetime(2026, 2, 6, 17, 0, tzinfo=timezone.utc),
                ),
                Match(
                    activity_id=civ_207.id if civ_207 else 15,
                    semantic_score=0.81,
                    entity_score=0.74,
                    metadata_score=0.78,
                    final_confidence=0.76,
                    decision=DecisionEnum.REVIEW,
                ),
            ),
            # 3. Medium Confidence Candidate - Electrical (70-90% Planner Review)
            (
                Report(
                    project_id=1,
                    file_name="electrical_cable_feeder.txt",
                    source_type=SourceTypeEnum.TEXT,
                    raw_text="11kV cable pulling from Substation yard towards MCC building. Feeder cable laid along trench TR-03.",
                    uploaded_by=ele_sup1.id if ele_sup1 else 7,
                    uploaded_at=datetime(2026, 2, 6, 17, 30, tzinfo=timezone.utc),
                ),
                Match(
                    activity_id=ele_301.id if ele_301 else 12,
                    semantic_score=0.85,
                    entity_score=0.78,
                    metadata_score=0.82,
                    final_confidence=0.80,
                    decision=DecisionEnum.REVIEW,
                ),
            ),
            # 4. UNMATCHED NOVEL SCOPE - Civil (<70% Held / Discrepancy)
            (
                Report(
                    project_id=1,
                    file_name="civil_soak_pit_memo.txt",
                    source_type=SourceTypeEnum.TEXT,
                    raw_text="Additional soak pit excavation near store shed for monsoon overflow drainage. 15 cum soil removed. Scope not found in current baseline WBS.",
                    uploaded_by=civ_sup2.id if civ_sup2 else 6,
                    uploaded_at=datetime(2026, 2, 6, 18, 0, tzinfo=timezone.utc),
                ),
                Match(
                    activity_id=civ_201.id if civ_201 else 7,
                    semantic_score=0.48,
                    entity_score=0.25,
                    metadata_score=0.50,
                    final_confidence=0.42,
                    decision=DecisionEnum.REJECTED,
                ),
            ),
            # 5. UNMATCHED NOVEL SCOPE - Piping (<70% Held / Discrepancy)
            (
                Report(
                    project_id=1,
                    file_name="piping_tie_in_urgent.txt",
                    source_type=SourceTypeEnum.TEXT,
                    raw_text="Insulation wrap on a bypass tie-in line near tank farm area not in WBS. Client engineer requested urgent completion before hydrostatic line charging.",
                    uploaded_by=pip_sup2.id if pip_sup2 else 5,
                    uploaded_at=datetime(2026, 2, 6, 18, 15, tzinfo=timezone.utc),
                ),
                Match(
                    activity_id=pip_101.id if pip_101 else 1,
                    semantic_score=0.42,
                    entity_score=0.30,
                    metadata_score=0.40,
                    final_confidence=0.38,
                    decision=DecisionEnum.REJECTED,
                ),
            ),
            # 6. UNMATCHED NOVEL SCOPE - Electrical (<70% Held / Discrepancy)
            (
                Report(
                    project_id=1,
                    file_name="electrical_pump_house_jb.txt",
                    source_type=SourceTypeEnum.TEXT,
                    raw_text="Client asked extra junction box near old pump house not in the original plan. Mounted non-standard JB and routed 20m conduit.",
                    uploaded_by=ele_sup2.id if ele_sup2 else 8,
                    uploaded_at=datetime(2026, 2, 6, 18, 45, tzinfo=timezone.utc),
                ),
                Match(
                    activity_id=ele_302.id if ele_302 else 13,
                    semantic_score=0.52,
                    entity_score=0.35,
                    metadata_score=0.45,
                    final_confidence=0.45,
                    decision=DecisionEnum.REJECTED,
                ),
            ),
        ]

        for rep, match in sample_reports_and_matches:
            db.add(rep)
            db.flush()
            match.report_id = rep.id
            db.add(match)
        db.commit()
        print(f"Seeded {len(sample_reports_and_matches)} sample field reports and candidate matches.")

        print(f"Successfully seeded Project 1 with {len(db_acts)} activities!")
        print(f"- Completed: {len(completed_activities)}")
        print(f"- In Progress: {len(in_progress_activities)}")
        print(f"- Delayed: {len(delayed_activities)}")
        print(f"- Planned: {len(planned_activities)}")
        print(f"Total: {len(completed_activities) + len(in_progress_activities) + len(delayed_activities) + len(planned_activities)}")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
