from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditLogResponse(BaseModel):
    """
    Schema for audit log queries, ensuring explainability and traceability.
    """
    id: int = Field(..., description="Unique Audit Log ID", examples=[1001])
    progress_event_id: int = Field(..., description="Linked Progress Event ID", examples=[501])
    actor: Optional[int] = Field(default=None, description="User ID who performed the action")
    action: str = Field(..., description="Action performed", examples=["AUTO_APPROVE"])
    old_value: Optional[Any] = Field(default=None, description="Previous state snapshot (JSON)")
    new_value: Optional[Any] = Field(default=None, description="New state snapshot (JSON)")
    timestamp: datetime = Field(..., description="Timestamp of audit entry")

    model_config = ConfigDict(from_attributes=True)
