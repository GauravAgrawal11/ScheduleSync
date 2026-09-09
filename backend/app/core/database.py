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

# Configure connect_args based on DB dialect
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
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
