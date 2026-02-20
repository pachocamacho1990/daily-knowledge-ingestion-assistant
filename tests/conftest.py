import pytest
import sqlite3
import os
import tempfile
from fastapi.testclient import TestClient

from src.main import app
from src import config
from src.api import graph

@pytest.fixture(scope="module")
def mock_db_path():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    
    conn = sqlite3.connect(path)
    c = conn.cursor()
    c.execute("CREATE TABLE entities (id INTEGER PRIMARY KEY, name TEXT, type TEXT, description TEXT, pagerank REAL, degree_centrality REAL, betweenness REAL, community_id INTEGER, source_refs TEXT, num_sources INTEGER)")
    c.execute("CREATE TABLE relationships (id INTEGER PRIMARY KEY, source_id INTEGER, target_id INTEGER, description TEXT, weight REAL)")
    c.execute("CREATE TABLE community_summaries (community_id INTEGER PRIMARY KEY, title TEXT, summary TEXT, key_entities TEXT, key_insights TEXT)")
    c.execute("CREATE TABLE chunks (chunk_index INTEGER PRIMARY KEY, content TEXT, source_ref TEXT)")
    c.execute("CREATE TABLE semantic_groups (group_id INTEGER PRIMARY KEY, canonical TEXT, members TEXT, member_similarities TEXT)")
    c.execute("CREATE TABLE entity_chunk_map (entity_name TEXT, chunk_index INTEGER, source_id TEXT)")
    
    # Dummy data
    c.execute("INSERT INTO entities (id, name, type, community_id, pagerank) VALUES (1, 'EntityA', 'PERSON', 0, 0.5)")
    c.execute("INSERT INTO entities (id, name, type, community_id, pagerank) VALUES (2, 'EntityB', 'ORGANIZATION', 0, 0.8)")
    c.execute("INSERT INTO relationships (source_id, target_id, description, weight) VALUES (1, 2, 'works at', 1.0)")
    c.execute("INSERT INTO community_summaries (community_id, title, summary, key_entities, key_insights) VALUES (0, 'Test Comm', 'Testing summary', '[]', '[]')")
    
    conn.commit()
    conn.close()
    
    yield path
    os.remove(path)

@pytest.fixture(scope="module")
def client(mock_db_path):
    old_base_path = config.DB_PATH
    old_graph_path = graph.DB_PATH
    
    config.DB_PATH = mock_db_path
    graph.DB_PATH = mock_db_path
    
    with TestClient(app) as c:
        yield c
        
    config.DB_PATH = old_base_path
    graph.DB_PATH = old_graph_path
