import json
import logging
import struct

from src.config import settings
from src.database import get_connection
from src.llm.client import ollama_client

logger = logging.getLogger(__name__)


async def retrieve_relevant_items(query: str, top_k: int = 5) -> list[dict]:
    """Retrieve most relevant items using semantic search via sqlite-vec KNN.

    Returns enriched items with title, url, summary, key_points, categories, and distance score.
    """
    # Generate query embedding
    embeddings = await ollama_client.embed([query])
    if not embeddings or not embeddings[0]:
        logger.error("Failed to generate query embedding")
        return []

    query_embedding = embeddings[0]
    query_blob = struct.pack(f"{len(query_embedding)}f", *query_embedding)

    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                e.item_id,
                e.distance,
                i.title,
                i.url,
                i.submitted_at,
                p.summary,
                p.key_points,
                p.categories,
                p.relevance_score,
                p.content_type,
                p.reading_time_minutes
            FROM item_embeddings e
            JOIN items i ON i.id = e.item_id
            JOIN processed_items p ON p.item_id = e.item_id
            WHERE e.embedding MATCH ?
                AND k = ?
            ORDER BY e.distance
            """,
            (query_blob, top_k),
        ).fetchall()

        results = []
        for row in rows:
            item = dict(row)
            item["key_points"] = json.loads(item["key_points"])
            item["categories"] = json.loads(item["categories"])
            results.append(item)

        return results
    finally:
        conn.close()
