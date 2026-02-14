import json
import logging

from src.llm.client import ollama_client
from src.llm.prompts import SUMMARIZE_ITEM_SYSTEM, SUMMARIZE_ITEM_USER

logger = logging.getLogger(__name__)

DEFAULT_SUMMARY = {
    "summary": "Summary could not be generated.",
    "key_points": [],
    "categories": [],
    "relevance_score": 0.5,
    "content_type": "other",
}


async def summarize_item(title: str, content: str) -> dict:
    """Generate a structured summary using Ollama.

    Returns dict with: summary, key_points, categories, relevance_score, content_type.
    Falls back to defaults if parsing fails.
    """
    if not content or len(content.strip()) < 50:
        return {**DEFAULT_SUMMARY, "summary": "Content too short to summarize."}

    messages = [
        {"role": "system", "content": SUMMARIZE_ITEM_SYSTEM},
        {"role": "user", "content": SUMMARIZE_ITEM_USER.format(title=title, content=content)},
    ]

    try:
        response = await ollama_client.chat(
            messages=messages,
            format="json",
            temperature=0.3,
        )
        result = json.loads(response)

        # Validate and normalize
        return {
            "summary": str(result.get("summary", DEFAULT_SUMMARY["summary"]))[:1000],
            "key_points": _ensure_list(result.get("key_points", []))[:5],
            "categories": _ensure_list(result.get("categories", []))[:3],
            "relevance_score": _clamp(float(result.get("relevance_score", 0.5)), 0.0, 1.0),
            "content_type": result.get("content_type", "other"),
        }
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        return {**DEFAULT_SUMMARY}


def _ensure_list(val) -> list:
    if isinstance(val, list):
        return [str(item) for item in val]
    return []


def _clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, val))
