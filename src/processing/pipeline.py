import asyncio
import json
import logging

from src.database import get_connection
from src.ingestion.text_extractor import estimate_reading_time
from src.processing.embedder import generate_and_store_embedding
from src.processing.summarizer import summarize_item

logger = logging.getLogger(__name__)


async def process_item(item_id: int):
    """Full processing pipeline for a single item.

    Steps: set status='processing' -> summarize -> store processed_item -> embed -> status='done'.
    On error: status='error' with message.
    """
    conn = get_connection()
    try:
        # Get item
        item = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        if not item:
            logger.error(f"Item {item_id} not found")
            return

        if item["status"] == "done":
            logger.info(f"Item {item_id} already processed, skipping")
            return

        # Mark as processing
        conn.execute("UPDATE items SET status = 'processing' WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()

    try:
        title = item["title"] or "Untitled"
        content = item["content_text"] or ""

        # Step 1: Summarize
        logger.info(f"Summarizing item {item_id}: {title[:50]}")
        summary_result = await summarize_item(title, content)

        # Step 2: Store processed item
        reading_time = estimate_reading_time(content)
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO processed_items "
                "(item_id, summary, key_points, categories, relevance_score, content_type, reading_time_minutes) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    item_id,
                    summary_result["summary"],
                    json.dumps(summary_result["key_points"]),
                    json.dumps(summary_result["categories"]),
                    summary_result["relevance_score"],
                    summary_result["content_type"],
                    reading_time,
                ),
            )
            conn.commit()
        finally:
            conn.close()

        # Step 3: Generate and store embedding
        logger.info(f"Generating embedding for item {item_id}")
        await generate_and_store_embedding(item_id, title, summary_result["summary"])

        # Step 4: Mark as done
        conn = get_connection()
        try:
            conn.execute(
                "UPDATE items SET status = 'done', processed_at = datetime('now') WHERE id = ?",
                (item_id,),
            )
            conn.commit()
        finally:
            conn.close()

        logger.info(f"Item {item_id} processed successfully")

    except Exception as e:
        logger.error(f"Error processing item {item_id}: {e}")
        conn = get_connection()
        try:
            conn.execute(
                "UPDATE items SET status = 'error', error_message = ? WHERE id = ?",
                (str(e)[:500], item_id),
            )
            conn.commit()
        finally:
            conn.close()


async def process_worker(queue: asyncio.Queue):
    """Background worker that processes items from the queue sequentially."""
    logger.info("Processing worker started")
    while True:
        item_id = await queue.get()
        try:
            await process_item(item_id)
        except Exception as e:
            logger.error(f"Worker error processing item {item_id}: {e}")
        finally:
            queue.task_done()
