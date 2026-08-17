from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth.jwt_utils import decode_access_token
from app import database

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()


@router.websocket("/api/internal/dashboard/ws")
async def dashboard_ws(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    try:
        payload = decode_access_token(token)
        if payload is None:
            await websocket.close(code=4401, reason="Invalid or expired token")
            return

        user_id = int(payload["sub"])

        async with database.pool.acquire() as conn:
            user = await conn.fetchrow(
                """
                SELECT r.name AS role
                FROM users u JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1
                """,
                user_id
            )

        if not user or user["role"] not in ("admin", "marketing_manager"):
            await websocket.close(code=1008)
            return

        await manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()  # keep connection alive; content unused
        except WebSocketDisconnect:
            manager.disconnect(websocket)
            
    except Exception as e:
        import traceback
        print(f"[dashboard_ws] error for user token: {e}")
        traceback.print_exc()
        await websocket.close(code=1011, reason="Internal error")