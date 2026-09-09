import asyncio
import json
import logging
from typing import Optional, Dict, Set
from sqlalchemy.orm import Session
from app.notifications.models import Notification

logger = logging.getLogger(__name__)

# Active SSE subscriber queues: user_id -> set of asyncio.Queue
_subscribers: Dict[int, Set[asyncio.Queue]] = {}


def register_subscriber(user_id: int) -> asyncio.Queue:
    """Register an SSE queue for real-time push."""
    q: asyncio.Queue = asyncio.Queue()
    if user_id not in _subscribers:
        _subscribers[user_id] = set()
    _subscribers[user_id].add(q)
    return q


def unregister_subscriber(user_id: int, q: asyncio.Queue):
    """Clean up subscriber on disconnect."""
    if user_id in _subscribers:
        _subscribers[user_id].discard(q)
        if not _subscribers[user_id]:
            del _subscribers[user_id]


async def broadcast_to_user(user_id: int, data: dict):
    """Push an SSE payload to active subscribers for a user."""
    if user_id in _subscribers:
        for q in list(_subscribers[user_id]):
            try:
                await q.put(data)
            except Exception as e:
                logger.debug(f"Broadcast error: {e}")


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "INFO",
    link: Optional[str] = None,
) -> Notification:
    """
    Persist notification to database and push to active SSE listeners.
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        link=link,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Trigger async push to any active browser tabs
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            payload = {
                "id": notif.id,
                "title": notif.title,
                "message": notif.message,
                "type": notif.type,
                "link": notif.link,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
            }
            asyncio.create_task(broadcast_to_user(user_id, payload))
    except Exception as e:
        logger.debug(f"Async push scheduling note: {e}")

    return notif
