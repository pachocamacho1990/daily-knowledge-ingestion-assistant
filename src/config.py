import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("GRAPHRAG_DB_PATH", str(BASE_DIR / "notebooks" / "graphrag.db"))
