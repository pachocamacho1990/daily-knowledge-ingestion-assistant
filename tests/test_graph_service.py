from src.services.graph_service import get_graph_data

def test_get_graph_data_service(mock_db_path):
    data = get_graph_data(mock_db_path)
    assert "metaElements" in data
    assert "communityData" in data
    assert "error" not in data
    
    # Based on dummy data in conftest.py
    # 2 entities, 1 community summary
    assert len(data["metaElements"]) > 0

def test_get_graph_data_service_filters(mock_db_path):
    data = get_graph_data(mock_db_path, include_orphans=True, min_community_size=1)
    assert "metaElements" in data
    assert "communityData" in data
    assert "error" not in data
    assert len(data["metaElements"]) > 0
