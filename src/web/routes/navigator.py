import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from src.database import get_connection
from src.navigator.agent import navigator_agent

logger = logging.getLogger(__name__)
router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")


class ChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None


@router.get("/", response_class=HTMLResponse)
async def navigator_page(request: Request):
    """Render the Navigator chat page."""
    conn = get_connection()
    try:
        conversations = conn.execute(
            "SELECT id, title, last_message_at FROM conversations "
            "ORDER BY last_message_at DESC LIMIT 20"
        ).fetchall()
        conversations = [dict(c) for c in conversations]
    finally:
        conn.close()

    return templates.TemplateResponse(
        "navigator.html",
        {"request": request, "conversations": conversations},
    )


@router.post("/chat")
async def chat(request: Request):
    """SSE endpoint for streaming chat responses."""
    body = await request.json()
    message = body.get("message", "").strip()
    conversation_id = body.get("conversation_id")

    if not message:
        return EventSourceResponse(
            _error_stream("Message cannot be empty"), media_type="text/event-stream"
        )

    # Create or get conversation
    if not conversation_id:
        conn = get_connection()
        try:
            cursor = conn.execute("INSERT INTO conversations DEFAULT VALUES")
            conn.commit()
            conversation_id = cursor.lastrowid
        finally:
            conn.close()

    async def event_generator():
        try:
            # Send conversation_id first
            yield {"event": "conversation", "data": json.dumps({"id": conversation_id})}

            async for chunk in navigator_agent.chat_stream(conversation_id, message):
                yield {"event": "message", "data": json.dumps({"content": chunk})}

            yield {"event": "done", "data": json.dumps({"status": "complete"})}
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    return EventSourceResponse(event_generator(), media_type="text/event-stream")


async def _error_stream(msg: str):
    yield {"event": "error", "data": json.dumps({"error": msg})}


@router.get("/conversations")
async def list_conversations():
    """List all conversations."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, title, started_at, last_message_at FROM conversations "
            "ORDER BY last_message_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: int):
    """Get all messages for a conversation."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, role, content, context_item_ids, created_at FROM chat_messages "
            "WHERE conversation_id = ? ORDER BY created_at",
            (conversation_id,),
        ).fetchall()
        messages = []
        for r in rows:
            msg = dict(r)
            msg["context_item_ids"] = json.loads(msg["context_item_ids"])
            messages.append(msg)
        return messages
    finally:
        conn.close()
