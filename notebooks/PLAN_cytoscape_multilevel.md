# PLAN: Multi-Level Cytoscape.js Visualization

> Created: 2026-02-17
> Status: Ready for execution
> Depends on: `PLAN_leiden_community_detection.md` (execute that first)
> Target file: `notebooks/02_graph_construction_communities.ipynb`
> Cells modified: 34 (data prep) and 35 (HTML generation) — full rewrite of both
> Cells unchanged: 0-33 (extraction, graph, metrics, Plotly, communities, summaries, SQLite)

## Problem

The current Cytoscape.js visualization renders **all data at once** in a single HTML file:
- ~148 entity nodes + ~18 semantic group containers + ~136 edges + all chunk refs + all community summaries
- A single layout pass over everything (slow, cluttered)
- No hierarchy navigation — communities, entities, and chunks are all at the same visual level
- File size ~230 KB even after optimization
- fCOSE CDN scripts failing causes total render failure

The GraphRAG paper's core insight is that **the community hierarchy IS the navigation structure**. The visualization should reflect that.

## Solution: Three-Level Drill-Down

```
Level 0 (default)    Level 1 (click comm)       Level 2 (click entity)
┌─────────────┐      ┌─────────────────────┐    ┌──────────────────────┐
│  [Comm A]---│---   │  ┌─Comm A──────────┐│    │  ┌─Comm A──────────┐│
│  [Comm B]   │      │  │ (ent1)---(ent2) ││    │  │ (ent1)---(ENT2) ││
│  [Comm C]---│---   │  │ (ent3)          ││    │  │ (ent3)   ○ ○ ○  ││
│  [Other]    │      │  └─────────────────┘│    │  │         chunks   ││
│             │      │  [Comm B]           │    │  └─────────────────┘│
│  ~20-40     │      │  [Comm C]           │    │  [Comm B]           │
│  nodes      │      │  [Other]            │    │  [Comm C]           │
└─────────────┘      └─────────────────────┘    └──────────────────────┘
```

- **Level 0**: Community meta-nodes only. One node per significant community (2+ visible members), sized by member count. Inter-community edges show cross-topic connections. ~20-40 nodes, renders instantly.
- **Level 1**: Click a community meta-node → it becomes a Cytoscape compound node, entity children appear inside. Intra-community edges shown. Other communities stay collapsed.
- **Level 2**: Click an entity node → chunk expansion (existing behavior, unchanged).

**Key design decisions:**
- Cross-community entity-to-entity edges are **not shown** at Level 1. The inter-community meta-edge already conveys "these communities are connected." This avoids complex dynamic edge re-routing.
- Semantic groups only appear inside expanded communities (compound-in-compound).
- Layout is **incremental**: expanding a community only positions its entity children, other nodes stay fixed.
- All data is still embedded in the HTML (no server needed for notebooks), but organized by level so only Level 0 data is parsed on initial render.

## Data Structures

### Cell 34: New data preparation

Replace the current flat `cyto_elements` construction with level-organized data:

```python
# ============================================================
# LEVEL 0: Community meta-nodes + inter-community edges
# ============================================================

# Only communities with 2+ visible members get meta-nodes
# (viz_nodes, viz_community_counts, cyto_community_summaries already computed above)

def scale_community_size(member_count, min_size=40, max_size=120):
    """Map community member count to meta-node pixel size."""
    counts = [viz_community_counts[c] for c in viz_community_counts
              if viz_community_counts[c] >= MIN_COMMUNITY_SIZE_FOR_VIZ]
    if not counts:
        return (min_size + max_size) // 2
    c_min, c_max = min(counts), max(counts)
    if c_max == c_min:
        return (min_size + max_size) // 2
    normalized = (member_count - c_min) / (c_max - c_min)
    return int(min_size + normalized * (max_size - min_size))

community_meta_elements = []  # Cytoscape elements for Level 0

for comm_id, summary_data in cyto_community_summaries.items():
    member_count = viz_community_counts[comm_id]
    color = COMMUNITY_COLORS[comm_id % len(COMMUNITY_COLORS)]
    top_members = sorted(
        [n for n in viz_nodes if G.nodes[n].get("community") == comm_id],
        key=lambda x: -pagerank.get(x, 0)
    )[:5]
    pr_sum = sum(pagerank.get(m, 0) for m in top_members)

    community_meta_elements.append({
        "data": {
            "id": f"comm-{comm_id}",
            "label": summary_data["title"][:35],
            "type": "COMMUNITY",
            "community": comm_id,
            "member_count": member_count,
            "top_members": [m[:25] for m in top_members],
            "color": color,
            "size": scale_community_size(member_count),
            "pagerank_sum": round(pr_sum, 4),
        }
    })

# "Other" meta-node for singleton communities
if other_node_count > 0:
    community_meta_elements.append({
        "data": {
            "id": "comm-other",
            "label": f"Other ({other_community_count} small)",
            "type": "COMMUNITY",
            "community": -1,
            "member_count": other_node_count,
            "top_members": [],
            "color": "#555555",
            "size": 40,
            "pagerank_sum": 0,
        }
    })

# Inter-community edges (aggregated from entity-level edges)
inter_comm_edges = {}  # (src_comm, tgt_comm) -> {count, descriptions}
for src, tgt, attrs in G.edges(data=True):
    if src not in viz_nodes or tgt not in viz_nodes:
        continue
    src_comm = G.nodes[src].get("community", -1)
    tgt_comm = G.nodes[tgt].get("community", -1)
    if src_comm == tgt_comm:
        continue
    # Only include edges between significant communities
    src_in = src_comm in cyto_community_summaries
    tgt_in = tgt_comm in cyto_community_summaries
    if not src_in and not tgt_in:
        continue
    src_id = f"comm-{src_comm}" if src_in else "comm-other"
    tgt_id = f"comm-{tgt_comm}" if tgt_in else "comm-other"
    key = (src_id, tgt_id)
    if key not in inter_comm_edges:
        inter_comm_edges[key] = {"count": 0, "descriptions": []}
    inter_comm_edges[key]["count"] += 1
    desc = attrs.get("description", "")
    if desc and len(inter_comm_edges[key]["descriptions"]) < 5:
        inter_comm_edges[key]["descriptions"].append(
            f"{src} → {tgt}: {desc[:80]}"
        )

for (src_id, tgt_id), data in inter_comm_edges.items():
    community_meta_elements.append({
        "data": {
            "id": f"{src_id}-->{tgt_id}",
            "source": src_id,
            "target": tgt_id,
            "weight": data["count"],
            "description": f"{data['count']} cross-community relationships",
            "details": data["descriptions"],
        }
    })

# ============================================================
# LEVEL 1: Per-community entity data (loaded on expand)
# ============================================================

community_entity_data = {}  # comm_id -> {entities: [...], edges: [...]}

for comm_id in cyto_community_summaries:
    comm_members = [n for n in viz_nodes if G.nodes[n].get("community") == comm_id]
    member_set = set(comm_members)

    entities = []
    for node in comm_members:
        attrs = G.nodes[node]
        pr = attrs.get("pagerank", 0)
        chunk_refs = entity_chunk_map.get(node, [])
        entities.append({
            "data": {
                "id": node,
                "label": node,
                "parent": f"comm-{comm_id}",  # compound containment
                "type": attrs.get("type", "UNKNOWN"),
                "description": attrs.get("description", ""),
                "community": comm_id,
                "pagerank": round(pr, 6),
                "degree_centrality": round(attrs.get("degree_centrality", 0), 4),
                "betweenness": round(attrs.get("betweenness", 0), 4),
                "num_sources": attrs.get("num_sources", 1),
                "source_refs": attrs.get("source_refs", "[]"),
                "color": COMMUNITY_COLORS[comm_id % len(COMMUNITY_COLORS)],
                "size": scale_pagerank_to_size(pr),
                "chunk_count": len(chunk_refs),
            }
        })

    # Intra-community edges only
    edges = []
    for src, tgt, attrs in G.edges(data=True):
        if src in member_set and tgt in member_set:
            edges.append({
                "data": {
                    "id": f"{src}-->{tgt}",
                    "source": src,
                    "target": tgt,
                    "description": attrs.get("description", ""),
                    "weight": attrs.get("weight", 1.0),
                }
            })

    # Semantic groups within this community
    sg_elements = []
    for group in semantic_entity_groups:
        gid = group["group_id"]
        valid_members = [m for m in group["members"]
                         if m in member_set and m in entity_node_ids]
        if len(valid_members) < 2 or len(group["members"]) > MAX_COMPOUND_SIZE:
            continue
        parent_id = f"sg-{gid}"
        sg_elements.append({
            "data": {
                "id": parent_id,
                "label": group["canonical"],
                "parent": f"comm-{comm_id}",  # nested compound
                "type": "SEMANTIC_GROUP",
                "group_id": gid,
                "canonical": group["canonical"],
                "member_count": len(valid_members),
                "color": SEMANTIC_GROUP_COLOR,
            }
        })
        # Re-parent entity nodes to semantic group (compound-in-compound)
        for ent in entities:
            if ent["data"]["id"] in valid_members:
                ent["data"]["parent"] = parent_id

    community_entity_data[comm_id] = {
        "entities": entities,
        "edges": edges,
        "semantic_groups": sg_elements,
    }

# ============================================================
# LEVEL 2: Chunk data (already deduplicated above)
# chunk_texts, cyto_chunk_refs — no changes needed
# ============================================================
```

### Cell 35: New HTML generation

The HTML template changes significantly in the JavaScript section. CSS remains mostly the same.

**JavaScript state management:**
```javascript
// Data organized by level
const metaElements = COMMUNITY_META_JSON;        // Level 0
const communityData = COMMUNITY_ENTITIES_JSON;   // Level 1 (keyed by comm_id)
const chunkTexts = CHUNK_TEXTS_JSON;             // Level 2
const chunkRefs = CHUNK_REFS_JSON;               // Level 2
const commSummaries = COMMUNITY_SUMMARIES_JSON;
const semanticGroups = SEMANTIC_GROUPS_JSON;

// State
const expandedCommunities = new Set();

// Initialize with Level 0 only
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: metaElements,
  // ... styles (see below)
  layout: { name: 'cose', animate: false, ... }
  // cose is fine for ~30 meta-nodes, no CDN needed
});
```

**Key functions:**
```javascript
function expandCommunity(commId) {
  // 1. Convert meta-node to compound parent
  const metaNode = cy.getElementById('comm-' + commId);
  if (!metaNode.length) return;

  // 2. Add entity children + intra edges + semantic groups
  const data = communityData[commId];
  if (!data) return;

  const toAdd = [...data.entities, ...data.edges, ...data.semantic_groups];
  cy.add(toAdd);

  // 3. Layout only the new children (keep other nodes fixed)
  const children = metaNode.children();
  children.layout({
    name: 'cose',
    animate: true,
    animationDuration: 300,
    boundingBox: metaNode.boundingBox(),  // keep within original area
    fit: false,
    nodeRepulsion: 4000,
    idealEdgeLength: 60,
  }).run();

  expandedCommunities.add(commId);

  // 4. Fit view to show expanded community
  cy.fit(metaNode.union(children), 60);
}

function collapseCommunity(commId) {
  // Remove entity children + edges + semantic groups
  const metaNode = cy.getElementById('comm-' + commId);
  const children = metaNode.children();
  // Also remove any chunk nodes attached to these entities
  children.forEach(function(child) {
    cy.remove(cy.elements('[id ^= "chunk-' + child.id() + '"]'));
  });
  cy.remove(children);
  cy.remove(metaNode.children());  // semantic group parents
  expandedCommunities.delete(commId);
}
```

**Tap handler (replaces current):**
```javascript
cy.on('tap', 'node', function(evt) {
  const node = evt.target;

  // Chunk node: ignore
  if (node.hasClass('chunk-node')) return;

  // Semantic group parent: show group info
  if (node.data('type') === 'SEMANTIC_GROUP') {
    // ... existing semantic group handler ...
    return;
  }

  // Community meta-node: expand/collapse
  if (node.data('type') === 'COMMUNITY') {
    const commId = node.data('community');
    if (expandedCommunities.has(commId)) {
      collapseCommunity(commId);
    } else {
      expandCommunity(commId);
    }
    // Show community summary in sidebar
    showCommunitySummary(commId, node.data('color'));
    return;
  }

  // Entity node: highlight neighborhood + show info + expand chunks
  // ... existing entity tap handler (buildCommSummaryHtml, showChunks, etc.)
});
```

**Styles additions for community meta-nodes:**
```javascript
{
  selector: 'node[type="COMMUNITY"]',
  style: {
    'shape': 'round-rectangle',
    'background-color': 'data(color)',
    'background-opacity': 0.3,
    'border-color': 'data(color)',
    'border-width': 3,
    'label': 'data(label)',
    'font-size': '11px',
    'text-valign': 'center',
    'text-halign': 'center',
    'text-wrap': 'wrap',
    'text-max-width': '100px',
    'color': '#fff',
    'width': 'data(size)',
    'height': 'data(size)',
  }
}
```

**When a community is expanded, it becomes a compound parent.** Cytoscape handles this automatically because entity nodes have `parent: "comm-{id}"`. The meta-node transitions from a standalone shape to a container. Apply the `:parent` style:
```javascript
{
  selector: ':parent[type="COMMUNITY"]',
  style: {
    'background-opacity': 0.1,
    'border-style': 'solid',
    'border-width': 2,
    'padding': '20px',
    'text-valign': 'top',
    'font-size': '10px',
    'shape': 'round-rectangle',
  }
}
```

**Layout strategy:**
- Level 0: Built-in `cose` layout (no CDN needed). ~30 nodes, instant.
- Level 1 expand: `cose` layout on children only, constrained to parent's bounding box.
- Level 2: Radial placement around entity (existing `showChunks` logic, unchanged).

**No fCOSE CDN needed.** Built-in `cose` handles 30 meta-nodes fine. When expanding a community, we layout 5-20 entity nodes inside it — also fine for `cose`.

### Python substitution (Cell 35, after HTML template)

Replace current substitution block with:
```python
html_content = html_content.replace("COMMUNITY_META_JSON", json.dumps(community_meta_elements))
html_content = html_content.replace("COMMUNITY_ENTITIES_JSON", json.dumps(community_entity_data))
html_content = html_content.replace("CHUNK_TEXTS_JSON", json.dumps(chunk_texts))
html_content = html_content.replace("CHUNK_REFS_JSON", json.dumps(cyto_chunk_refs))
html_content = html_content.replace("COMMUNITY_SUMMARIES_JSON", json.dumps(cyto_community_summaries))
html_content = html_content.replace("SEMANTIC_GROUPS_JSON", json.dumps(cyto_semantic_groups))
html_content = html_content.replace("LEGEND_HTML", "\n".join(legend_html_parts))
# ... other substitutions
```

### Legend changes

The legend shows communities (same as current), but clicking a legend item now:
1. If community is collapsed: expands it and fits view
2. If community is expanded: fits view to it
3. Shows community summary in sidebar

## Sidebar behavior by level

| Action | Sidebar shows |
|---|---|
| Click community meta-node | Community summary (title, text, insights, top members) + "Click to expand" hint |
| Click expanded community border | Community summary + "Click to collapse" hint |
| Click entity node | Entity details + community summary + chunk expansion |
| Click semantic group | Group members + similarity scores |
| Click "Other" in legend | Highlight all singleton community nodes |
| Click background | Reset to Level 0 view, collapse all |

## File size estimate

| Component | Current | Multi-level |
|---|---|---|
| Community meta (Level 0) | N/A | ~3 KB |
| Inter-community edges | N/A | ~2 KB |
| Community entities (Level 1) | 199 KB (all at once) | ~50 KB (organized by comm_id) |
| Chunk texts (Level 2) | ~73 KB (deduped) | ~73 KB (same) |
| Chunk refs | ~8 KB | ~8 KB |
| Community summaries | ~18 KB | ~18 KB |
| Semantic groups | ~5 KB | ~5 KB |
| CSS + JS + template | ~28 KB | ~35 KB (more JS logic) |
| **Total** | **~230 KB** | **~194 KB** |

File size doesn't change dramatically (data is the same, just reorganized), but **initial render uses only ~5 KB** of data (Level 0). The rest is parsed on demand.

## Verification

After running modified cells (34 and 35), verify:

1. **Level 0 renders instantly**: ~20-40 community nodes + inter-community edges. No layout delay.
2. **Click community**: Expands to show entity children inside compound container. Layout animates smoothly.
3. **Click entity inside expanded community**: Shows details sidebar + chunk expansion (Level 2).
4. **Click expanded community border**: Collapses back to meta-node.
5. **Click background**: Resets all to Level 0.
6. **Legend**: Click community in legend expands it and fits view.
7. **"Other" meta-node**: Shows singleton count, click highlights.
8. **No CDN dependencies**: Built-in `cose` layout only, no fCOSE scripts needed.
9. **Semantic groups**: Visible inside expanded communities as nested compound nodes.
10. **File size**: Should be ~190-200 KB.

## Implementation notes

- The `partition` dict and `communities` dict must exist before cell 34 runs (produced by cells 15-16). After Leiden migration, these have the same structure.
- `viz_nodes`, `viz_community_counts`, `cyto_community_summaries`, `other_community_count`, `other_node_count` are computed in the first half of cell 34 (unchanged from current).
- `entity_node_ids` is no longer needed as a global set — entity membership is tracked per community in `community_entity_data`.
- The `scale_pagerank_to_size` function is still needed for entity nodes (unchanged).
- `graph_plotly.html` (cell 13) is unaffected.

## Post-Execution

1. **Delete this file** (`notebooks/PLAN_cytoscape_multilevel.md`)
2. **Update GitHub Wiki:**
   - Update `Knowledge-Graph-and-Communities.md`: replace visualization section with multi-level description
   - Note the removal of fCOSE CDN dependency
3. **Update `docs/CHANGELOG.md`**
4. **Delete `notebooks/PLAN_viz_optimization.md`** if it still exists (superseded by this)
