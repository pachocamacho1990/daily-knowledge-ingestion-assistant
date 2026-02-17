# PLAN: Replace Louvain with Leiden Community Detection

> Created: 2026-02-17
> Status: Ready for execution
> Target file: `notebooks/02_graph_construction_communities.ipynb`
> Cells modified: 0 (header), 2 (imports), 14 (step 4 markdown), 15 (detection), 16 (grouping), 36 (summary)
> Docs modified: `CLAUDE.md`, `docs/dev-setup.md`, `docs/architecture-plan.md`, `docs/CHANGELOG.md`

## Why

The GraphRAG paper (arxiv:2404.16130) uses the Leiden algorithm, not Louvain. Leiden fixes a known flaw: Louvain can produce **poorly connected or disconnected communities** because it optimizes modularity greedily without guaranteeing internal connectivity. Leiden adds a refinement phase that ensures every community is well-connected.

With multi-source data producing denser graphs, this difference matters. Leiden also tends to be faster on large graphs due to its smart local moving heuristic.

## Dependencies

Install `leidenalg` and `igraph` (C library, required by leidenalg):

```bash
.venv/bin/pip install leidenalg igraph
```

**Verify on Apple Silicon / Python 3.14:** `igraph` ships pre-built wheels for macOS ARM64. If pip fails, try:
```bash
brew install igraph
.venv/bin/pip install igraph --no-build-isolation
```

After install, verify:
```python
import igraph as ig
import leidenalg
print(ig.__version__, leidenalg.__version__)
```

`python-louvain` can be kept as a fallback or removed. The plan removes it from docs but does not uninstall it.

## Implementation Steps

### Step 1: Update imports (Cell 2)

**Anchor string** (cell-2, find this line):
```python
import community as community_louvain  # python-louvain
```

**Replace** with:
```python
import igraph as ig
import leidenalg
```

---

### Step 2: Fix Step 4 markdown cell type (Cell 14)

Cell 14 currently has `cell_type: raw` instead of `markdown`, so the heading doesn't render.

**Change cell type** to `markdown` and update text.

**Current content:**
```
## Step 4: Community Detection

Using Louvain algorithm to find clusters of related entities.
```

**Replace** with:
```
## Step 4: Community Detection

Using Leiden algorithm to find clusters of related entities. Leiden guarantees well-connected communities, fixing a known flaw in Louvain where communities can become internally disconnected.
```

---

### Step 3: Replace community detection logic (Cell 15)

**Anchor string** (cell-15, the entire cell):
```python
# Louvain community detection (works on undirected graphs)
partition = community_louvain.best_partition(G_undirected, weight="weight", resolution=1.0)

# Store community assignment on nodes
for node, community_id in partition.items():
    G.nodes[node]["community"] = community_id

# Count communities
num_communities = max(partition.values()) + 1
print(f"Detected {num_communities} communities")

# Modularity score (quality of partition)
modularity = community_louvain.modularity(partition, G_undirected, weight="weight")
print(f"Modularity score: {modularity:.4f}")
```

**Replace entire cell** with:
```python
# Leiden community detection (works on undirected graphs)
# Convert NetworkX -> igraph (Leiden requires igraph)
G_ig = ig.Graph.from_networkx(G_undirected)

# Map edge weights (from_networkx stores them as edge attributes)
weights = G_ig.es["weight"] if "weight" in G_ig.es.attributes() else None

# Run Leiden with modularity optimization
leiden_partition = leidenalg.find_partition(
    G_ig,
    leidenalg.ModularityVertexPartition,
    weights=weights,
)

# Build partition dict: node_name -> community_id
# igraph preserves node order from NetworkX via the _nx_name attribute
partition = {}
for comm_id, members in enumerate(leiden_partition):
    for vertex_idx in members:
        node_name = G_ig.vs[vertex_idx]["_nx_name"]
        partition[node_name] = comm_id

# Store community assignment on nodes
for node, community_id in partition.items():
    G.nodes[node]["community"] = community_id

# Count communities
num_communities = max(partition.values()) + 1 if partition else 0
print(f"Detected {num_communities} communities (Leiden)")

# Modularity score (quality of partition)
modularity = leiden_partition.modularity
print(f"Modularity score: {modularity:.4f}")
```

**Key differences from Louvain:**
- `ig.Graph.from_networkx()` converts the graph; node names stored in `_nx_name` vertex attribute
- `leidenalg.find_partition()` returns a `VertexPartition` object (list of member lists), not a flat dict
- Modularity is a property of the partition object, not computed separately
- `resolution` parameter is available via `resolution_parameter=1.0` kwarg if needed (default is 1.0)

---

### Step 4: Update notebook header and summary (Cells 0 and 36)

**Cell 0 anchor** (find this line):
```
4. **Community detection** - Louvain algorithm for topic clustering
```
**Replace** with:
```
4. **Community detection** - Leiden algorithm for topic clustering
```

**Cell 36 anchor** (find this line):
```
3. **Community Detection** - Applied Louvain algorithm to find cross-domain topic clusters
```
**Replace** with:
```
3. **Community Detection** - Applied Leiden algorithm to find cross-domain topic clusters
```

---

### Step 5: Update documentation

**CLAUDE.md** — Tech stack table, find:
```
| Graph | NetworkX + python-louvain |
```
Replace with:
```
| Graph | NetworkX + igraph + leidenalg |
```

**docs/dev-setup.md** — Install command (line 49), find:
```
pip install ipykernel httpx langchain-text-splitters networkx python-louvain scipy sqlite-vec arxiv trafilatura pymupdf gliner langdetect
```
Replace with:
```
pip install ipykernel httpx langchain-text-splitters networkx igraph leidenalg scipy sqlite-vec arxiv trafilatura pymupdf gliner langdetect
```

**docs/dev-setup.md** — Dependency table (line 85), find:
```
| python-louvain | Community detection (Louvain algorithm) |
```
Replace with:
```
| leidenalg + igraph | Community detection (Leiden algorithm) |
```

**docs/architecture-plan.md** — Update references (4 occurrences):
- Line 86: `python-louvain` -> `igraph + leidenalg`
- Line 516: `Louvain` -> `Leiden`
- Lines 48, 257: Already say "Leiden/Louvain" — change to just "Leiden"

**docs/CHANGELOG.md** — Add entry:
```
- **Feb 17, 2026**: Replaced Louvain with Leiden community detection:
  - Switched from python-louvain to leidenalg + igraph
  - Leiden guarantees well-connected communities (fixes Louvain's disconnected community flaw)
  - Aligns with GraphRAG paper (arxiv:2404.16130) which specifies Leiden
  - NetworkX -> igraph conversion via ig.Graph.from_networkx()
```

---

## Verification

After running modified cells (15 and 16), verify:

1. **Communities detected:** Should produce communities (count may differ from Louvain)
2. **Modularity:** Should be >= 0.3 (comparable to Louvain's 0.9228 on sparse graph)
3. **Partition dict:** `partition` should map all 466 node names to integer community IDs
4. **Downstream cells work:** Cells 16-35 should run without changes (they all use the `partition` dict and `communities` dict which have the same structure)
5. **Plotly viz:** Cell 13 is unaffected (runs before community detection)
6. **Cytoscape viz:** Cells 34-35 should render with Leiden communities

## Post-Execution

1. **Delete this file** (`notebooks/PLAN_leiden_community_detection.md`)
2. **Update GitHub Wiki:**
   - Update `Knowledge-Graph-and-Communities.md`: replace Louvain references with Leiden, explain why
   - Update `Algorithm-Reference.md` if it references Louvain specifically
   - Update `Key-Learnings-and-Design-Decisions.md` with the Louvain->Leiden migration rationale
3. **Update CHANGELOG.md** with the changes
4. **Commit** with message: "Replace Louvain with Leiden community detection"
