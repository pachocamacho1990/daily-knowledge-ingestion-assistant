import os
import sqlite3
from pathlib import Path

from src.config import settings

# Resolve sqlite-vec extension path: prefer env var (Docker build from source),
# fall back to pip package path
_VEC_PATH = os.environ.get("SQLITE_VEC_PATH")
if not _VEC_PATH:
    try:
        import sqlite_vec

        _VEC_PATH = sqlite_vec.loadable_path()
    except ImportError:
        _VEC_PATH = None


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with WAL mode, Row factory, and sqlite-vec loaded."""
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    if _VEC_PATH:
        conn.enable_load_extension(True)
        # load_extension auto-appends platform suffix (.so/.dylib), so strip it
        path = _VEC_PATH
        for suffix in (".so", ".dylib"):
            if path.endswith(suffix):
                path = path[: -len(suffix)]
                break
        conn.load_extension(path)
        conn.enable_load_extension(False)
    return conn


def init_db():
    """Initialize database schema and vec0 virtual table. Idempotent."""
    os.makedirs(Path(settings.database_path).parent, exist_ok=True)
    conn = get_connection()
    try:
        schema_path = Path(__file__).parent / "schema.sql"
        schema = schema_path.read_text()
        conn.executescript(schema)

        # Create vec0 virtual table for embeddings (if not exists)
        # vec0 doesn't support IF NOT EXISTS, so check first
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='item_embeddings'"
        ).fetchone()
        if not row:
            conn.execute(
                f"CREATE VIRTUAL TABLE item_embeddings USING vec0("
                f"item_id INTEGER PRIMARY KEY, "
                f"embedding FLOAT[{settings.embedding_dim}])"
            )

        conn.commit()
    finally:
        conn.close()
