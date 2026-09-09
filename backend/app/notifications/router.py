import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.notifications.models import Notification
from app.notifications.service import register_subscriber, unregister_subscriber

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    link: Optional[str]
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int


@router.get("/mine", response_model=List[NotificationResponse])
def get_my_notifications(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve recent notifications for the logged-in user."""
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type,
            link=n.link,
            is_read=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in notifs
    ]


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get total unread notifications count."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return UnreadCountResponse(unread_count=count)


@router.patch("/{id}/read", status_code=status.HTTP_200_OK)
def mark_notification_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"success": True}


@router.post("/read-all", status_code=status.HTTP_200_OK)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


@router.get("/stream")
async def stream_notifications(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Server-Sent Events (SSE) real-time push endpoint.
    Browsers listen via EventSource or fetch reader.
    """
    queue = register_subscriber(current_user.id)

    async def event_generator():
        try:
            # Send initial ping
            yield f"event: connected\ndata: {json.dumps({'status': 'connected'})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait up to 25s for an event, then send keepalive comment
                    data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"event: notification\ndata: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            unregister_subscriber(current_user.id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
