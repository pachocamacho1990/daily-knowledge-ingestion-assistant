import logging
import sqlite3

import httpx
import trafilatura

from src.database import get_connection
from src.ingestion.text_extractor import clean_text, estimate_reading_time

logger = logging.getLogger(__name__)

MAX_CONTENT_LENGTH = 6000


async def submit_url(url: str) -> dict:
    """Fetch a URL, extract content, and store as a pending item.

    Returns the item dict. If URL already exists, returns existing item.
    """
    conn = get_connection()
    try:
        # Check for existing URL (dedup)
        existing = conn.execute("SELECT * FROM items WHERE url = ?", (url,)).fetchone()
        if existing:
            return dict(existing)

        # Fetch the page
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, timeout=30.0)
            resp.raise_for_status()
            html = resp.text

        # Extract title from HTML
        title = _extract_title(html) or url

        # Extract clean text via trafilatura
        extracted = trafilatura.extract(html, include_comments=False, include_tables=True)
        content_text = clean_text(extracted or "", MAX_CONTENT_LENGTH)

        # Store item
        cursor = conn.execute(
            "INSERT INTO items (url, title, content_text, content_html, status) "
            "VALUES (?, ?, ?, ?, 'pending')",
            (url, title, content_text, html[:50000]),
        )
        conn.commit()
        item_id = cursor.lastrowid
        item = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return dict(item)

    except sqlite3.IntegrityError:
        # Race condition: URL was inserted between check and insert
        conn.rollback()
        existing = conn.execute("SELECT * FROM items WHERE url = ?", (url,)).fetchone()
        return dict(existing)
    except Exception as e:
        logger.error(f"Failed to fetch URL {url}: {e}")
        raise
    finally:
        conn.close()


def submit_text(text: str, title: str | None = None) -> dict:
    """Store raw text as a pending item (for paywalled content, PDF text, etc.)."""
    conn = get_connection()
    try:
        content_text = clean_text(text, MAX_CONTENT_LENGTH)
        reading_time = estimate_reading_time(content_text)
        final_title = title or f"Text submission ({reading_time} min read)"

        cursor = conn.execute(
            "INSERT INTO items (title, content_text, status) VALUES (?, ?, 'pending')",
            (final_title, content_text),
        )
        conn.commit()
        item_id = cursor.lastrowid
        item = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return dict(item)
    finally:
        conn.close()


def _extract_title(html: str) -> str | None:
    """Extract title from HTML <title> tag."""
    import re

    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if match:
        title = match.group(1).strip()
        # Clean up common suffixes
        for sep in [" | ", " - ", " — ", " – "]:
            if sep in title:
                title = title.split(sep)[0].strip()
        return title[:200] if title else None
    return None
