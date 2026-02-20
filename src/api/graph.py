import os
from fastapi import APIRouter
from src.config import DB_PATH
from src.services.graph_service import get_graph_data

router = APIRouter()

# Simple in-memory cache
_cache = {
    "data": None,
    "mtime": 0
}

@router.get("/data")
async def get_graph_data_api(top_communities: int = 0):
    """
    Returns the knowledge graph nodes and edges.
    Automatically caches the payload based on the SQLite database's last modification time.
    """
    try:
        current_mtime = os.path.getmtime(DB_PATH)
    except OSError:
        current_mtime = 0

    # Cache hit logic (only cache the default query)
    if top_communities == 0 and _cache["data"] is not None and current_mtime == _cache["mtime"] and current_mtime != 0:
        return _cache["data"]

    # Cache miss
    data = get_graph_data(DB_PATH, top_communities=top_communities)
    
    # Store in cache if default query and successful
    if top_communities == 0 and "error" not in data:
        _cache["data"] = data
        _cache["mtime"] = current_mtime

    return data
