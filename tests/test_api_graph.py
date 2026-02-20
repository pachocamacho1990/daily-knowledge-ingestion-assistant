def test_get_graph_data_endpoint(client):
    response = client.get("/api/graph/data")
    assert response.status_code == 200
    data = response.json()
    assert "metaElements" in data
    assert "communityData" in data
    assert "error" not in data

def test_get_graph_data_endpoint_top_communities(client):
    response = client.get("/api/graph/data?top_communities=1")
    assert response.status_code == 200
    data = response.json()
    assert "metaElements" in data
    assert "communityData" in data
    assert "error" not in data
