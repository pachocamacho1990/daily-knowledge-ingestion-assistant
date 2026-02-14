import re


def clean_text(text: str, max_length: int = 6000) -> str:
    """Clean and truncate text content."""
    if not text:
        return ""

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # Truncate to max length at word boundary
    if len(text) > max_length:
        text = text[:max_length]
        last_space = text.rfind(" ")
        if last_space > max_length * 0.8:
            text = text[:last_space]
        text += "..."

    return text


def estimate_reading_time(text: str) -> int:
    """Estimate reading time in minutes (assuming ~200 words per minute)."""
    word_count = len(text.split())
    minutes = max(1, round(word_count / 200))
    return minutes
