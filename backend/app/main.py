from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.auth import auth_router
from app.schedule import schedule_router
from app.models.enums import SourceTypeEnum, DecisionEnum, EventTypeEnum
from app.schemas import (
    ReportCreateScaffold,
    ReportResponse,
    MatchCreateScaffold,
    MatchResponse,
    ProgressEventCreateScaffold,
    ProgressEventApproval,
    ProgressEventResponse,
    AuditLogResponse,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=settings.PROJECT_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User registration, OAuth2 JWT login, and session validation.",
        },
        {
            "name": "Schedule & Baseline",
            "description": "Project baseline creation, Primavera (.xer) / Excel (.xlsx) schedule ingestion, and activities CRUD.",
        },
        {
            "name": "Member B: Ingestion & Extraction (External Module)",
            "description": "Scaffolded placeholder for Member B's daily report uploads (PDF/scans/voice/Excel) and LLM entity extraction.",
        },
        {
            "name": "Member C: Matching, Review & Analytics (External Module)",
            "description": "Scaffolded placeholder for Member C's 3-signal candidate scoring engine, hero review screen, and actuals write-back.",
        },
    ],
)

# -----------------------------------------------------------------------------
# CORS Middleware Configuration
# Enables frontend development on Vite (http://localhost:5173) and other origins
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Member A Routers (Core Domain, Schedule & Auth)
# -----------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(schedule_router)


# -----------------------------------------------------------------------------
# Member B Routers: Ingestion & Extraction Modules
# -----------------------------------------------------------------------------
from app.ingestion.router import router as ingestion_router
from app.voice.router import router as voice_router

app.include_router(ingestion_router, prefix="/ingestion", tags=["Ingestion"])
app.include_router(ingestion_router, prefix="/reports", tags=["Reports"])
app.include_router(voice_router, prefix="/voice", tags=["Voice"])

# -----------------------------------------------------------------------------
# Member C Routers: Matching, Confidence, Review & Analytics Modules
# -----------------------------------------------------------------------------
from app.review.router import router as review_router
from app.analytics.router import router as analytics_router

app.include_router(review_router, prefix="/review", tags=["Review Queue"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics & Gantt"])
app.include_router(analytics_router, tags=["Activities History"])

# -----------------------------------------------------------------------------
# Supervisor Assignment Module (Auto-Assign & Manual Overrides)
# -----------------------------------------------------------------------------
from app.assignment.router import router as assignment_router
app.include_router(assignment_router, prefix="/assignment", tags=["Supervisor Assignment"])

# -----------------------------------------------------------------------------
# Supervisor Progress Tracking Module
# -----------------------------------------------------------------------------
from app.progress_tracking.router import router as progress_router
app.include_router(progress_router, prefix="/progress", tags=["Progress Tracking"])

# -----------------------------------------------------------------------------
# Complaints & Blockers Tracking Module
# -----------------------------------------------------------------------------
from app.complaints.router import router as complaints_router
app.include_router(complaints_router, prefix="/complaints", tags=["Complaints & Blockers"])

# -----------------------------------------------------------------------------
# Real-Time Notifications Module (SSE & Alerts)
# -----------------------------------------------------------------------------
from app.notifications.router import router as notifications_router
app.include_router(notifications_router)
def custom_openapi():
    """
    Publish complete Pydantic schema contracts in /docs for Member B and C,
    allowing frontend and backend teammates to build against final contracts.
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
    )

    components = openapi_schema.setdefault("components", {}).setdefault("schemas", {})

    # Register domain enums
    for en in [SourceTypeEnum, DecisionEnum, EventTypeEnum]:
        if en.__name__ not in components:
            components[en.__name__] = {
                "title": en.__name__,
                "enum": [e.value for e in en],
                "type": "string",
            }

    # Register scaffolded contracts for Members B & C
    scaffold_models = [
        ReportCreateScaffold,
        ReportResponse,
        MatchCreateScaffold,
        MatchResponse,
        ProgressEventCreateScaffold,
        ProgressEventApproval,
        ProgressEventResponse,
        AuditLogResponse,
    ]
    for model in scaffold_models:
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        defs = schema.pop("$defs", {})
        for def_name, def_schema in defs.items():
            if def_name not in components:
                components[def_name] = def_schema
        components[model.__name__] = schema

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/", tags=["System"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "owner": "Member A: Core domain, schedule & auth",
    }


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "module": "member_a_core"}
