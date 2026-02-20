import os
from fastapi import APIRouter
from src.config import DB_PATH
from src.services.graph_service import get_graph_data

router = APIRouter()

# Simple in-memory cache
_cache = {
    "key": None,
    "data": None,
    "mtime": 0
}

@router.get("/data")
async def get_graph_data_api(top_communities: int = 0, include_orphans: bool = False, min_community_size: int = 2):
    """
    Returns the knowledge graph nodes and edges.
    Automatically caches the payload based on the SQLite database's last modification time and query parameters.
    """
    try:
        current_mtime = os.path.getmtime(DB_PATH)
    except OSError:
        current_mtime = 0

    cache_key = f"{top_communities}_{include_orphans}_{min_community_size}"

    # Cache hit logic
    if _cache.get("key") == cache_key and _cache.get("data") is not None and current_mtime == _cache.get("mtime") and current_mtime != 0:
        return _cache["data"]

    # Cache miss
    data = get_graph_data(DB_PATH, top_communities=top_communities, include_orphans=include_orphans, min_community_size=min_community_size)
    
    # Store in cache if successful
    if "error" not in data:
        _cache["key"] = cache_key
        _cache["data"] = data
        _cache["mtime"] = current_mtime

    return data
