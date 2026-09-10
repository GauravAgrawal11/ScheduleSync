from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

import logging

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
if "[" in db_url and "]" in db_url:
    logger.warning("Supabase password placeholder detected in DATABASE_URL. Falling back to local SQLite until user sets database password in .env.")
    db_url = "sqlite:///./sih26122.db"

# Configure engine based on DB dialect
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
