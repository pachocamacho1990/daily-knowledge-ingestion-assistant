import json
import logging
import struct

from src.database import get_connection
from src.llm.client import ollama_client

logger = logging.getLogger(__name__)


async def generate_and_store_embedding(item_id: int, title: str, summary: str):
    """Generate embedding for title + summary and store in vec0 table."""
    text = f"{title}\n\n{summary}"

    embeddings = await ollama_client.embed([text])
    if not embeddings or not embeddings[0]:
        logger.error(f"Empty embedding returned for item {item_id}")
        return

    embedding = embeddings[0]
    embedding_blob = struct.pack(f"{len(embedding)}f", *embedding)

    conn = get_connection()
    try:
        # INSERT OR REPLACE for vec0 table
        conn.execute(
            "INSERT OR REPLACE INTO item_embeddings (item_id, embedding) VALUES (?, ?)",
            (item_id, embedding_blob),
        )
        conn.commit()
    finally:
        conn.close()
