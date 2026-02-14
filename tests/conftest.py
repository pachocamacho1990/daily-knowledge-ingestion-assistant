import os
import tempfile

import pytest
from fastapi.testclient import TestClient

# Set test database path before importing app
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_PATH"] = os.path.join(_tmp, "test.db")
os.environ["OLLAMA_HOST"] = "http://localhost:11434"


@pytest.fixture
def client():
    from src.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_connection():
    from src.database import get_connection, init_db

    init_db()
    conn = get_connection()
    yield conn
    conn.close()
