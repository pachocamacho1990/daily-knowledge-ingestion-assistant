import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from src.database import get_connection
from src.ingestion.fetcher import submit_text, submit_url

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/library")
templates = Jinja2Templates(directory="src/web/templates")


class UrlSubmission(BaseModel):
    url: str


class TextSubmission(BaseModel):
    text: str
    title: str | None = None


@router.get("", response_class=HTMLResponse)
async def library_page(request: Request):
    """Render the Library page."""
    items = _get_all_items()
    return templates.TemplateResponse(
        "library.html",
        {"request": request, "items": items},
    )


@router.post("/submit-url")
async def add_url(body: UrlSubmission, request: Request):
    """Submit a URL for processing."""
    url = body.url.strip()
    if not url:
        return {"error": "URL is required"}

    try:
        item = await submit_url(url)
        # Queue for processing if pending
        if item["status"] == "pending":
            await request.app.state.processing_queue.put(item["id"])
        return {"item": item}
    except Exception as e:
        logger.error(f"Failed to submit URL: {e}")
        return {"error": str(e)}


@router.post("/submit-text")
async def add_text(body: TextSubmission, request: Request):
    """Submit raw text for processing."""
    text = body.text.strip()
    if not text:
        return {"error": "Text is required"}

    try:
        item = submit_text(text, body.title)
        # Queue for processing
        await request.app.state.processing_queue.put(item["id"])
        return {"item": item}
    except Exception as e:
        logger.error(f"Failed to submit text: {e}")
        return {"error": str(e)}


@router.get("/items")
async def get_items():
    """Get all items with their processing status."""
    return _get_all_items()


@router.delete("/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item and its associated data."""
    conn = get_connection()
    try:
        # Delete from vec table first (no FK cascade on virtual tables)
        conn.execute("DELETE FROM item_embeddings WHERE item_id = ?", (item_id,))
        conn.execute("DELETE FROM processed_items WHERE item_id = ?", (item_id,))
        conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()
        return {"status": "deleted"}
    finally:
        conn.close()


@router.get("/status")
async def items_status():
    """Return current status of all items (for polling updates)."""
    conn = get_connection()
    try:
        rows = conn.execute("SELECT id, status FROM items ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def _get_all_items() -> list[dict]:
    """Get all items with processed data joined."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                i.id, i.url, i.title, i.status, i.error_message,
                i.submitted_at, i.processed_at,
                p.summary, p.key_points, p.categories,
                p.relevance_score, p.content_type, p.reading_time_minutes
            FROM items i
            LEFT JOIN processed_items p ON p.item_id = i.id
            ORDER BY i.submitted_at DESC
            """
        ).fetchall()

        items = []
        for r in rows:
            item = dict(r)
            if item["key_points"]:
                item["key_points"] = json.loads(item["key_points"])
            if item["categories"]:
                item["categories"] = json.loads(item["categories"])
            items.append(item)
        return items
    finally:
        conn.close()
