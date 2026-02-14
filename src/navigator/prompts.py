def format_context_items(items: list[dict]) -> str:
    """Format retrieved items into numbered context blocks for the LLM."""
    if not items:
        return ""

    blocks = []
    for i, item in enumerate(items, 1):
        key_points_str = ""
        if item.get("key_points"):
            key_points_str = "\n".join(f"  - {kp}" for kp in item["key_points"])
            key_points_str = f"\nKey points:\n{key_points_str}"

        url_str = f"\nURL: {item['url']}" if item.get("url") else ""
        categories_str = ""
        if item.get("categories"):
            categories_str = f"\nCategories: {', '.join(item['categories'])}"

        block = f"""[{i}] {item.get('title', 'Untitled')}{url_str}
Summary: {item.get('summary', 'No summary available.')}{key_points_str}{categories_str}"""
        blocks.append(block)

    return "\n\n".join(blocks)
