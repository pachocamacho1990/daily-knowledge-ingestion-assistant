# PLAN: Extract Visualization into Standalone Script

> Created: 2026-02-17
> Updated: 2026-02-17 (supersedes multi-level notebook plan)
> Status: Ready for execution
> Target files: `notebooks/02_graph_construction_communities.ipynb`, `scripts/generate_viz.py`, `scripts/templates/knowledge_graph.html`

## Why

The Cytoscape.js visualization (cells 34-35 in notebook 02) is tightly coupled to the data processing pipeline. Any change to the viz requires re-running the entire notebook (~6+ hours for full extraction). The visualization should be a standalone script that reads from the SQLite database and can be regenerated in seconds.

This also aligns with the production architecture: the script's data-loading logic becomes `src/graph/api.py`, and the template becomes `src/web/templates/graph.html`.

## New Workflow After Execution

```
Run notebook 02 (pipeline) → graphrag.db updated (with 2 new tables)
Run: python scripts/generate_viz.py → knowledge_graph.html regenerated instantly
```

## Overview of Changes

1. **Add 2 new SQLite tables** to notebook 02's schema so ALL viz data is in `graphrag.db`
2. **Create `scripts/generate_viz.py`** — standalone script, reads only from SQLite
3. **Extract HTML template** to `scripts/templates/knowledge_graph.html`
4. **Remove cells 34-35** from notebook 02, replace with pointer to script

---

## Step 1: Add New SQLite Tables (Notebook 02, Cell 22)

Two data structures needed by the visualization currently live only in `extraction_results.json`:
- `semantic_entity_groups` — compound node overlay
- `entity_chunk_map` — entity-to-chunk provenance for drill-down

**Add to `cursor.executescript(...)` in cell 22**, after the `chunks` table:

```sql
-- Semantic entity groups (compound node overlay from cross-doc merge)
CREATE TABLE IF NOT EXISTS semantic_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER UNIQUE NOT NULL,
    canonical TEXT NOT NULL,
    members TEXT NOT NULL,            -- JSON array of entity names
    member_similarities TEXT,         -- JSON object {name: score}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity-to-chunk provenance (which chunks an entity was extracted from)
CREATE TABLE IF NOT EXISTS entity_chunk_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    source_id TEXT NOT NULL,
    FOREIGN KEY (entity_name) REFERENCES entities(name)
);

CREATE INDEX idx_entity_chunk_map_entity ON entity_chunk_map(entity_name);
CREATE INDEX idx_semantic_groups_gid ON semantic_groups(group_id);
```

---

## Step 2: Add Insert Cells (Notebook 02, After Cell 28)

**New cell A** — Insert semantic groups (after the "Insert source records" cell):

```python
# Insert semantic entity groups
for group in semantic_entity_groups:
    cursor.execute(
        "INSERT INTO semantic_groups (group_id, canonical, members, member_similarities) VALUES (?, ?, ?, ?)",
        (group["group_id"], group["canonical"],
         json.dumps(group["members"]), json.dumps(group.get("member_similarities", {}))),
    )
conn.commit()
print(f"Inserted {len(semantic_entity_groups)} semantic entity groups")
```

**New cell B** — Insert entity-chunk map:

```python
# Insert entity-chunk provenance map
ecm_count = 0
for entity_name, refs in entity_chunk_map.items():
    for ref in refs:
        cursor.execute(
            "INSERT INTO entity_chunk_map (entity_name, chunk_index, source_id) VALUES (?, ?, ?)",
            (entity_name, ref["chunk_index"], ref["source_id"]),
        )
        ecm_count += 1
conn.commit()
print(f"Inserted {ecm_count} entity-chunk provenance records")
```

---

## Step 3: Update Verification Cell (Cell 29)

**Current** table list:
```python
for table in ["sources", "entities", "relationships", "claims", "community_summaries", "chunks"]:
```

**Replace** with:
```python
for table in ["sources", "entities", "relationships", "claims", "community_summaries", "chunks", "semantic_groups", "entity_chunk_map"]:
```

---

## Step 4: Create HTML Template (`scripts/templates/knowledge_graph.html`)

Extract the HTML template string from current cell 35 — everything between the opening `"""<!DOCTYPE html>` and closing `</html>"""`. This is ~900 lines of HTML/CSS/JS with these placeholders:

- `COMMUNITY_META_JSON` — Level 0 meta-nodes + inter-community edges
- `COMMUNITY_ENTITIES_JSON` — Level 1 per-community entity data
- `CHUNK_TEXTS_JSON` — Deduplicated chunk texts
- `CHUNK_REFS_JSON` — Entity-to-chunk reference mappings
- `COMMUNITY_SUMMARIES_JSON` — Community summary data
- `SEMANTIC_GROUPS_JSON` — Semantic group data
- `LEGEND_HTML` — Pre-rendered legend HTML
- `LEGEND_COUNT` — Number of legend items
- `META_NODES` — Count of meta-nodes
- `TOTAL_ENTITIES` — Total entity count
- `COMM_COUNT` — Community count

**No changes to the template content.** Same HTML/CSS/JS as currently in cell 35.

**Layout fix**: Use `grid` layout for Level 0 (the `cose` layout has been failing with disconnected components). The template should use:
```javascript
layout: {
  name: 'grid',
  animate: false,
  fit: true,
  padding: 40,
},
```

`cose` is still used in `expandCommunity()` for Level 1 entity children (they have edges, so cose works there).

**CDN check**: Add at the start of `<script>`:
```javascript
if (typeof cytoscape === 'undefined') {
  document.getElementById('cy').innerHTML = '<div style="color:#ff4444;padding:40px;font-size:18px"><b>Cytoscape.js CDN failed to load!</b></div>';
  throw new Error('CDN not loaded');
}
```

**Error handling**: Wrap `cytoscape()` init in try-catch that displays errors visually in the `#cy` div.

---

## Step 5: Create `scripts/generate_viz.py`

Standalone Python script. **No NetworkX dependency** — all graph metrics are already in SQLite.

### CLI

```
python scripts/generate_viz.py                          # defaults
python scripts/generate_viz.py --db path/to/graphrag.db # custom DB
python scripts/generate_viz.py --output path/to/out.html
python scripts/generate_viz.py --no-open                # don't open browser
```

Defaults: `--db notebooks/graphrag.db`, `--output notebooks/knowledge_graph.html`

### Function Structure

```python
#!/usr/bin/env python3
"""Generate knowledge graph HTML visualization from SQLite database."""

import argparse, json, sqlite3, webbrowser
from pathlib import Path

# --- Constants ---
COMMUNITY_COLORS = [...]      # same 15 colors
MAX_COMPOUND_SIZE = 15
SEMANTIC_GROUP_COLOR = "#bfef45"
MIN_COMMUNITY_SIZE_FOR_VIZ = 2

# --- Data Loading (SQLite only) ---

def load_entities(cursor) -> dict[str, dict]:
    """Load all entities as {name: {type, description, pagerank, community, ...}}"""
    cursor.execute("""
        SELECT name, type, description, pagerank, degree_centrality,
               betweenness, community_id, source_refs, num_sources
        FROM entities
    """)
    return {row[0]: {"type": row[1], "description": row[2], "pagerank": row[3],
                      "degree_centrality": row[4], "betweenness": row[5],
                      "community": row[6], "source_refs": row[7],
                      "num_sources": row[8]} for row in cursor.fetchall()}

def load_relationships(cursor) -> list[tuple[str, str, dict]]:
    """Load edges as [(src_name, tgt_name, {description, weight}), ...]"""
    cursor.execute("""
        SELECT e1.name, e2.name, r.description, r.weight
        FROM relationships r
        JOIN entities e1 ON r.source_id = e1.id
        JOIN entities e2 ON r.target_id = e2.id
    """)
    return [(row[0], row[1], {"description": row[2], "weight": row[3]})
            for row in cursor.fetchall()]

def load_community_summaries(cursor) -> dict[int, dict]:
    """Load {community_id: {title, summary, key_entities, key_insights}}"""
    cursor.execute("SELECT community_id, title, summary, key_entities, key_insights FROM community_summaries")
    return {row[0]: {"title": row[1], "summary": row[2],
                      "key_entities": json.loads(row[3]),
                      "key_insights": json.loads(row[4])} for row in cursor.fetchall()}

def load_chunk_lookup(cursor) -> dict[int, dict]:
    """Load {chunk_index: {text, source_id}}"""
    cursor.execute("SELECT chunk_index, content, source_ref FROM chunks")
    return {row[0]: {"text": row[1], "source_id": row[2]} for row in cursor.fetchall()}

def load_semantic_groups(cursor) -> list[dict]:
    """Load [{group_id, canonical, members, member_similarities}, ...]"""
    cursor.execute("SELECT group_id, canonical, members, member_similarities FROM semantic_groups")
    return [{"group_id": row[0], "canonical": row[1],
             "members": json.loads(row[2]),
             "member_similarities": json.loads(row[3])} for row in cursor.fetchall()]

def load_entity_chunk_map(cursor) -> dict[str, list]:
    """Load {entity_name: [{chunk_index, source_id}, ...]}"""
    cursor.execute("SELECT entity_name, chunk_index, source_id FROM entity_chunk_map")
    result: dict[str, list] = {}
    for row in cursor.fetchall():
        result.setdefault(row[0], []).append({"chunk_index": row[1], "source_id": row[2]})
    return result

# --- Viz Data Preparation ---
# (Port logic from current cell 34, replacing G.nodes[n] with entities[n])

def prepare_viz_data(entities, edges, community_summaries, chunk_lookup,
                     semantic_groups, entity_chunk_map):
    """Build all visualization data structures from raw DB data."""
    # 1. Compute node degrees from edges (replaces NetworkX G.degree)
    # 2. Filter to connected nodes (degree > 0)
    # 3. Build community meta-elements (Level 0)
    # 4. Build inter-community edges
    # 5. Build per-community entity data (Level 1)
    # 6. Build chunk data (Level 2, deduplicated)
    # 7. Build legend HTML
    # Returns all JSON-serializable structures
    ...

# --- HTML Rendering ---

def render_html(viz_data, template_path):
    """Read template, substitute placeholders, return HTML string."""
    template = template_path.read_text()
    html = template
    html = html.replace("COMMUNITY_META_JSON", json.dumps(viz_data["meta_elements"]))
    html = html.replace("COMMUNITY_ENTITIES_JSON", json.dumps(viz_data["entity_data"]))
    # ... all other replacements
    return html

# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Generate knowledge graph visualization")
    parser.add_argument("--db", default="notebooks/graphrag.db", help="Path to SQLite database")
    parser.add_argument("--output", default="notebooks/knowledge_graph.html", help="Output HTML path")
    parser.add_argument("--no-open", action="store_true", help="Don't open in browser")
    args = parser.parse_args()

    # Load from SQLite
    conn = sqlite3.connect(args.db)
    cursor = conn.cursor()
    # ... load all data ...
    conn.close()

    # Prepare visualization data
    viz_data = prepare_viz_data(...)

    # Render HTML
    template_path = Path(__file__).parent / "templates" / "knowledge_graph.html"
    html = render_html(viz_data, template_path)

    # Write and optionally open
    Path(args.output).write_text(html)
    if not args.no_open:
        webbrowser.open(f"file://{Path(args.output).absolute()}")

if __name__ == "__main__":
    main()
```

### Key Translation: NetworkX → Dict

| Notebook pattern (NetworkX) | Script pattern (dict) |
|---|---|
| `G.nodes[n].get("pagerank", 0)` | `entities[n]["pagerank"]` |
| `G.nodes[n].get("community", -1)` | `entities[n].get("community", -1)` |
| `for src, tgt, attrs in G.edges(data=True):` | `for src, tgt, attrs in edges:` |
| `G.nodes` iteration | `entities.keys()` iteration |
| `G.number_of_nodes()` | `len(entities)` |
| `pagerank.get(x, 0)` | `entities[x]["pagerank"]` |

The `filter_connected_nodes` logic computes `node_degree` from the edges list (same as cell 34 already does — it doesn't use `G.degree()`).

---

## Step 6: Remove Viz Cells from Notebook 02

**Delete cells 34 and 35.**

**Replace cell 33** (currently `## Step 7: Interactive Graph Visualization` markdown) with:

```markdown
## Step 7: Generate Visualization

The interactive knowledge graph visualization is generated by a standalone script
that reads from the SQLite database:

```bash
python scripts/generate_viz.py
```

This produces a self-contained HTML file with multi-level Cytoscape.js drill-down:
- **Level 0**: Community meta-nodes (~20-40), sized by member count
- **Level 1**: Click community to expand → entity children with intra-community edges
- **Level 2**: Click entity → chunk expansion with source text tooltips

See `scripts/generate_viz.py` for details.
```

**Update cell 36** (Summary markdown) to mention the external script instead of inline visualization.

---

## Step 7: Update Documentation

**CLAUDE.md** — Add `scripts/` to project structure:
```
├── scripts/
│   ├── generate_viz.py                # Standalone visualization generator
│   └── templates/
│       └── knowledge_graph.html       # Cytoscape.js HTML template
```

**docs/CHANGELOG.md** — Add entry:
```
- **Feb 17, 2026**: Extracted visualization into standalone script:
  - Created `scripts/generate_viz.py` — reads from SQLite, generates `knowledge_graph.html`
  - Added `semantic_groups` and `entity_chunk_map` tables to SQLite schema
  - Removed visualization cells (34-35) from notebook 02
  - Visualization can now be regenerated in seconds without re-running the pipeline
```

**Delete**: `notebooks/PLAN_cytoscape_multilevel.md` (this file, after execution)
**Delete**: `notebooks/PLAN_leiden_community_detection.md` (already executed)

---

## Verification

1. **Re-run notebook 02 Step 6** (cells 22-32) to regenerate `graphrag.db` with the 2 new tables
2. Verify 8 tables in DB: `sources`, `entities`, `relationships`, `claims`, `community_summaries`, `chunks`, `semantic_groups`, `entity_chunk_map`
3. Run `python scripts/generate_viz.py` — should produce `knowledge_graph.html`
4. Open HTML in browser — should show multi-level community graph
5. Verify interactions: click community to expand, click entity for chunks, legend, collapse all
6. Run `python scripts/generate_viz.py --no-open` — should not open browser

## Files Modified

| File | Action |
|------|--------|
| `notebooks/02_graph_construction_communities.ipynb` | Add 2 tables (cell 22), add 2 insert cells, update verify (cell 29), remove cells 34-35, update markdown cells |
| `scripts/generate_viz.py` | **NEW** — standalone visualization generator (~250 lines) |
| `scripts/templates/knowledge_graph.html` | **NEW** — HTML template extracted from cell 35 (~900 lines) |
| `CLAUDE.md` | Add `scripts/` to project structure |
| `docs/CHANGELOG.md` | Add entry |
| `notebooks/PLAN_cytoscape_multilevel.md` | Delete after execution |
| `notebooks/PLAN_leiden_community_detection.md` | Delete after execution |
