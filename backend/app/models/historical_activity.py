from sqlalchemy import Column, Integer, Float, String, Date, DateTime, func
from pgvector.sqlalchemy import Vector
from app.core.database import Base


class HistoricalActivity(Base):
    """
    Closed project historical activity actuals (Institutional Memory).
    Captured from reconciled past projects (e.g. project_H1, project_H2).
    """
    __tablename__ = "historical_activities"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(100), nullable=False, index=True)
    project_name = Column(String(255), nullable=False)
    activity_id = Column(String(100), nullable=False, index=True)
    activity_name = Column(String(500), nullable=False)
    discipline = Column(String(100), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    pipe_diameter_in = Column(Float, nullable=True, index=True)
    planned_start = Column(Date, nullable=True)
    planned_finish = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_finish = Column(Date, nullable=True)
    planned_duration_days = Column(Integer, nullable=True)
    actual_duration_days = Column(Integer, nullable=True)
    delay_days = Column(Integer, nullable=False, default=0)
    delay_reason = Column(String(500), nullable=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)

    # Embedding of activity_name + delay_reason (dimension 384 for all-MiniLM-L6-v2)
    embedding = Column(Vector(384), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
