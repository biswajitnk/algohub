from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from app.notifications import notifier

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    notifier.register_websocket(websocket)
    try:
        # Send initial welcome
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to Delta Algo Trading Live Stream"
        })
        while True:
            # Keep connection alive, listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        notifier.unregister_websocket(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        notifier.unregister_websocket(websocket)
