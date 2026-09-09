"""
Member C: Institutional Memory - Historical Projects Ingestion
Loads reconciled actuals from closed historical projects into the `historical_activities` table.
Computes 384-dimensional dense semantic embeddings using all-MiniLM-L6-v2
for RAG similarity queries (e.g., 'why did Line 24-type activities historically delay?').
"""

import csv
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.historical_activity import HistoricalActivity

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def get_embedding_model():
    """Load all-MiniLM-L6-v2 ONNX embedding pipeline via fastembed."""
    try:
        from fastembed import TextEmbedding
        return TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    except Exception as e:
        logger.warning(f"Could not load fastembed TextEmbedding: {e}. Falling back to zero-vectors.")
        return None


def parse_date(date_str: Optional[str]):
    if not date_str or date_str.strip() in ("", "None", "NULL"):
        return None
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_float(val: Optional[str]):
    if not val or val.strip() in ("", "None", "NULL"):
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


def parse_int(val: Optional[str]):
    if not val or val.strip() in ("", "None", "NULL"):
        return None
    try:
        return int(float(val.strip()))
    except ValueError:
        return None


def load_historical_data(db: Optional[Session] = None) -> int:
    """
    Ingests project_H1_actuals.csv and project_H2_actuals.csv into historical_activities.
    Generates embeddings for activity_name + delay_reason.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Determine paths to historical csvs
        # 1. Check relative to backend/app/analytics
        base_dir = Path(__file__).resolve().parents[3]  # Workspace root
        csv_dir = base_dir / "sample_data" / "historical_projects"

        projects_file = csv_dir / "projects.csv"
        activities_file = csv_dir / "historical_activities.csv"

        if not activities_file.exists():
            # Fallback check relative to cwd
            alt_dir = Path("sample_data/historical_projects")
            projects_file = alt_dir / "projects.csv"
            activities_file = alt_dir / "historical_activities.csv"

        if not activities_file.exists():
            raise FileNotFoundError(f"Could not find historical CSV files in {csv_dir} or {alt_dir}")

        # Map project_id to project_name
        project_name_map = {
            "HIST-P1": "Kaziranga Tank Farm Expansion",
            "HIST-P2": "Dhemaji Pipeline Corridor Upgrade",
        }
        if projects_file.exists():
            with open(projects_file, mode="r", encoding="utf-8") as f:
                p_reader = csv.DictReader(f)
                for p_row in p_reader:
                    pid = p_row.get("project_id", "").strip()
                    pname = p_row.get("project_name", "").strip()
                    if pid and pname:
                        project_name_map[pid] = pname

        # Read activities
        import re
        all_raw_rows = []
        logger.info(f"Reading historical records from {activities_file.name}...")
        with open(activities_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pid = row.get("project_id", "").strip()
                row["project_name"] = project_name_map.get(pid, pid)

                act_name = row.get("activity_name", "").strip()
                m = re.search(r'Erect Line\s+(\d+)', act_name, re.IGNORECASE)
                if m:
                    row["pipe_diameter_in"] = float(m.group(1))

                all_raw_rows.append(row)

        logger.info(f"Loaded {len(all_raw_rows)} total raw rows from {activities_file.name}.")

        # Prepare text strings for embedding: concatenation of activity_name + delay_reason
        texts_to_embed = []
        for row in all_raw_rows:
            act_name = (row.get("activity_name") or "").strip()
            delay_reason = (row.get("delay_reason") or "").strip()
            if delay_reason and delay_reason.lower() != "none":
                text = f"{act_name} {delay_reason}"
            else:
                text = act_name
            texts_to_embed.append(text)

        # Generate embeddings in batch
        embedder = get_embedding_model()
        embeddings = []
        if embedder:
            logger.info("Generating 384-d embeddings using all-MiniLM-L6-v2...")
            embed_gen = embedder.embed(texts_to_embed)
            embeddings = [emb.tolist() for emb in embed_gen]
        else:
            embeddings = [[0.0] * 384 for _ in texts_to_embed]

        # Check existing records to prevent duplication
        # Delete existing historical_activities to make script idempotent
        deleted_count = db.query(HistoricalActivity).delete()
        if deleted_count > 0:
            logger.info(f"Cleared {deleted_count} existing historical_activities for fresh reload.")
        db.commit()

        # Insert records
        db_records = []
        for i, row in enumerate(all_raw_rows):
            delay_reason = (row.get("delay_reason") or "").strip()
            if delay_reason.lower() == "none":
                delay_reason = None

            delay_days = parse_int(row.get("variance_days"))
            if delay_days is None:
                delay_days = parse_int(row.get("delay_days")) or 0

            record = HistoricalActivity(
                project_id=row.get("project_id", "").strip(),
                project_name=row.get("project_name", "").strip(),
                activity_id=row.get("activity_id", "").strip(),
                activity_name=row.get("activity_name", "").strip(),
                discipline=row.get("discipline", "").strip(),
                location=row.get("location", "").strip() or None,
                pipe_diameter_in=parse_float(str(row.get("pipe_diameter_in", ""))),
                planned_start=parse_date(row.get("planned_start")),
                planned_finish=parse_date(row.get("planned_finish")),
                actual_start=parse_date(row.get("actual_start")),
                actual_finish=parse_date(row.get("actual_finish")),
                planned_duration_days=parse_int(row.get("planned_duration_days")),
                actual_duration_days=parse_int(row.get("actual_duration_days")),
                delay_days=delay_days,
                delay_reason=delay_reason,
                quantity=parse_float(row.get("quantity")),
                unit=row.get("unit", "").strip() or None,
                embedding=embeddings[i],
            )
            db_records.append(record)

        db.add_all(db_records)
        db.commit()
        logger.info(f"Successfully loaded and embedded {len(db_records)} historical activities into database.")
        return len(db_records)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to load historical data: {e}", exc_info=True)
        raise
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    load_historical_data()
