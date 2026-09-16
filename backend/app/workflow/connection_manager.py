import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WorkflowConnectionManager:
    """
    Manages active WebSocket connections grouped per project_id.
    Ensures safe broadcasting and clean handling of disconnects.
    """

    def __init__(self):
        # project_id -> set of active WebSockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, project_id: int, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        self.active_connections[project_id].add(websocket)
        logger.info(f"WebSocket connected for project {project_id}. Total active: {len(self.active_connections[project_id])}")

        # Send initial acknowledgment
        await websocket.send_json({
            "type": "connected",
            "project_id": project_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def disconnect(self, project_id: int, websocket: WebSocket):
        if project_id in self.active_connections:
            self.active_connections[project_id].discard(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        logger.info(f"WebSocket disconnected for project {project_id}.")

    async def broadcast(self, project_id: int, data: dict):
        """Broadcast payload to all active WebSocket clients on project_id."""
        if project_id not in self.active_connections:
            return

        dead_connections = set()
        for ws in list(self.active_connections[project_id]):
            try:
                await ws.send_json(data)
            except Exception as e:
                logger.warning(f"Failed to send to client in project {project_id}: {e}")
                dead_connections.add(ws)

        for dead_ws in dead_connections:
            self.disconnect(project_id, dead_ws)

    def broadcast_sync(self, project_id: int, activity_id: str, new_status: str):
        """
        Thread-safe synchronous helper to broadcast incremental workflow updates.
        Pushes payload: {activity_id, new_status, updated_at}
        """
        payload = {
            "project_id": project_id,
            "activity_id": activity_id,
            "new_status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            # Check if there is an active running loop
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = self._loop

            if loop and loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(project_id, payload), loop)
            else:
                # If no loop is active, attempt to schedule in a temporary loop or ignore
                pass
        except Exception as e:
            logger.debug(f"Could not broadcast workflow update: {e}")


manager = WorkflowConnectionManager()
