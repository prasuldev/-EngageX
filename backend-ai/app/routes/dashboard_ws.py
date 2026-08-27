from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth.jwt_utils import decode_access_token
from app import database

router = APIRouter()

# ============================================================
# TEMPORARY: this route currently checks the OLD users/roles
# tables and does NOT check the `scope` claim, because the
# internal/customer auth split hasn't been fully applied yet
# (auth_routes.py and role_guard.py are still on the pre-split
# version as of this change).
#
# This means: a valid CUSTOMER token that happens to have an id
# matching an admin/marketing_manager row will be accepted here.
# Low risk today, but revert this block once the split is
# finished — see APPLY_THESE_CHANGES.md, and swap this back to
# checking payload.get("scope") == "internal" against
# internal_users / internal_roles, matching get_current_internal_user.
# ============================================================


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
    # Validate BEFORE accepting — reject the handshake outright on a bad
    # token instead of accepting then immediately closing. This also
    # keeps manager.connect() as the only place that ever calls accept(),
    # which is what fixed the original double-accept crash.
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