#!/usr/bin/env python3
"""Generate knowledge graph HTML visualization from SQLite database.

Reads all graph data from the SQLite database and produces a self-contained
HTML file with multi-level Cytoscape.js drill-down:
  - Level 0: Community meta-nodes, sized by member count
  - Level 1: Click community to expand entity children with intra-community edges
  - Level 2: Click entity to expand source chunk nodes with text tooltips

Usage:
    python scripts/generate_viz.py                          # defaults
    python scripts/generate_viz.py --db path/to/graphrag.db # custom DB
    python scripts/generate_viz.py --output path/to/out.html
    python scripts/generate_viz.py --no-open                # don't open browser
"""

import argparse
import json
import sqlite3
import webbrowser
from pathlib import Path

# --- Constants ---

COMMUNITY_COLORS = [
    "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
    "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
    "#dcbeff", "#9A6324", "#fffac8", "#800000", "#aaffc3",
]

MAX_COMPOUND_SIZE = 15
SEMANTIC_GROUP_COLOR = "#bfef45"
MIN_COMMUNITY_SIZE_FOR_VIZ = 2


# --- Data Loading (SQLite only) ---

def load_entities(cursor) -> dict[str, dict]:
    """Load all entities as {name: {type, description, pagerank, ...}}."""
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
    """Load edges as [(src_name, tgt_name, {description, weight}), ...]."""
    cursor.execute("""
        SELECT e1.name, e2.name, r.description, r.weight
        FROM relationships r
        JOIN entities e1 ON r.source_id = e1.id
        JOIN entities e2 ON r.target_id = e2.id
    """)
    return [(row[0], row[1], {"description": row[2], "weight": row[3]})
            for row in cursor.fetchall()]


def load_community_summaries(cursor) -> dict[int, dict]:
    """Load {community_id: {title, summary, key_entities, key_insights}}."""
    cursor.execute("SELECT community_id, title, summary, key_entities, key_insights FROM community_summaries")
    return {row[0]: {"title": row[1], "summary": row[2],
                      "key_entities": json.loads(row[3]),
                      "key_insights": json.loads(row[4])} for row in cursor.fetchall()}


def load_chunk_lookup(cursor) -> dict[int, dict]:
    """Load {chunk_index: {text, source_id}}."""
    cursor.execute("SELECT chunk_index, content, source_ref FROM chunks")
    return {row[0]: {"text": row[1], "source_id": row[2]} for row in cursor.fetchall()}


def load_semantic_groups(cursor) -> list[dict]:
    """Load [{group_id, canonical, members, member_similarities}, ...]."""
    cursor.execute("SELECT group_id, canonical, members, member_similarities FROM semantic_groups")
    return [{"group_id": row[0], "canonical": row[1],
             "members": json.loads(row[2]),
             "member_similarities": json.loads(row[3]) if row[3] else {}} for row in cursor.fetchall()]


def load_entity_chunk_map(cursor) -> dict[str, list]:
    """Load {entity_name: [{chunk_index, source_id}, ...]}."""
    cursor.execute("SELECT entity_name, chunk_index, source_id FROM entity_chunk_map")
    result: dict[str, list] = {}
    for row in cursor.fetchall():
        result.setdefault(row[0], []).append({"chunk_index": row[1], "source_id": row[2]})
    return result


# --- Viz Data Preparation ---

import re

_CYTO_UNSAFE = re.compile(r'[.#\[\]():"\',\\]')


def sanitize_cyto_id(name: str) -> str:
    """Replace characters that break Cytoscape.js CSS selectors."""
    return _CYTO_UNSAFE.sub('_', name)


def scale_pagerank_to_size(pr: float, all_pr: list[float],
                           min_size: int = 25, max_size: int = 90) -> int:
    """Map PageRank value to node pixel size."""
    pr_min, pr_max = min(all_pr), max(all_pr)
    if pr_max == pr_min:
        return (min_size + max_size) // 2
    normalized = (pr - pr_min) / (pr_max - pr_min)
    return int(min_size + normalized * (max_size - min_size))


def scale_community_size(member_count: int, all_counts: list[int],
                         min_size: int = 40, max_size: int = 120) -> int:
    """Map community member count to meta-node pixel size."""
    if not all_counts:
        return (min_size + max_size) // 2
    c_min, c_max = min(all_counts), max(all_counts)
    if c_max == c_min:
        return (min_size + max_size) // 2
    normalized = (member_count - c_min) / (c_max - c_min)
    return int(min_size + normalized * (max_size - min_size))


def prepare_viz_data(entities, edges, community_summaries, chunk_lookup,
                     semantic_groups, entity_chunk_map):
    """Build all visualization data structures from raw DB data.

    Returns a dict with all JSON-serializable structures needed by the template.
    """
    # 1. Compute node degrees from edges (replaces NetworkX G.degree)
    node_degree: dict[str, int] = {}
    for src, tgt, _ in edges:
        node_degree[src] = node_degree.get(src, 0) + 1
        node_degree[tgt] = node_degree.get(tgt, 0) + 1

    # 2. Filter to connected nodes (degree > 0)
    viz_nodes = {n for n in entities if node_degree.get(n, 0) > 0 and n.strip()}
    isolated_count = len(entities) - len(viz_nodes)
    print(f"Visualization filter: {len(viz_nodes)} connected nodes "
          f"(filtered out {isolated_count} isolated nodes, kept in DB)")

    entity_node_ids = set(viz_nodes)

    # Community counts for viz nodes
    viz_community_counts: dict[int, int] = {}
    for node in viz_nodes:
        comm_id = entities[node].get("community", -1)
        viz_community_counts[comm_id] = viz_community_counts.get(comm_id, 0) + 1

    # Filter community summaries by size
    cyto_community_summaries = {}
    other_community_count = 0
    other_node_count = 0

    for comm_id, summary_data in community_summaries.items():
        member_count = viz_community_counts.get(comm_id, 0)
        if member_count >= MIN_COMMUNITY_SIZE_FOR_VIZ:
            cyto_community_summaries[comm_id] = summary_data
        elif member_count > 0:
            other_community_count += 1
            other_node_count += member_count

    # 3. Build chunk data (deduplicated)
    chunk_texts: list[str] = []
    chunk_text_to_idx: dict[str, int] = {}
    cyto_chunk_refs: dict[str, list] = {}

    for entity_name in entity_node_ids:
        refs = entity_chunk_map.get(entity_name, [])
        if not refs:
            continue
        refs_for_entity = []
        for ref in refs:
            chunk_idx = ref["chunk_index"]
            chunk_data = chunk_lookup.get(chunk_idx)
            if not chunk_data:
                continue
            text = chunk_data["text"]
            if text not in chunk_text_to_idx:
                chunk_text_to_idx[text] = len(chunk_texts)
                chunk_texts.append(text)
            refs_for_entity.append({
                "index": chunk_idx,
                "source_id": ref["source_id"],
                "text_idx": chunk_text_to_idx[text],
            })
        if refs_for_entity:
            cyto_chunk_refs[sanitize_cyto_id(entity_name)] = refs_for_entity

    # Semantic groups lookup
    cyto_semantic_groups = {}
    for group in semantic_groups:
        gid = group["group_id"]
        members = group["members"]
        if len(members) > MAX_COMPOUND_SIZE:
            continue
        valid_members = [m for m in members if m in entity_node_ids]
        if len(valid_members) < 2:
            continue
        cyto_semantic_groups[gid] = {
            "canonical": group["canonical"],
            "members": valid_members,
            "member_similarities": group.get("member_similarities", {}),
        }

    # Pre-compute all pagerank values for scaling
    all_pr = [entities[n].get("pagerank", 0) for n in viz_nodes]

    # Community size list for scaling
    all_comm_counts = [viz_community_counts[c] for c in viz_community_counts
                       if viz_community_counts[c] >= MIN_COMMUNITY_SIZE_FOR_VIZ]

    # ============================================================
    # LEVEL 0: Community meta-nodes + inter-community edges
    # ============================================================

    community_meta_elements = []

    for comm_id, summary_data in cyto_community_summaries.items():
        member_count = viz_community_counts[comm_id]
        color = COMMUNITY_COLORS[comm_id % len(COMMUNITY_COLORS)]
        top_members = sorted(
            [n for n in viz_nodes if entities[n].get("community") == comm_id],
            key=lambda x: -entities[x].get("pagerank", 0)
        )[:5]
        pr_sum = sum(entities[m].get("pagerank", 0) for m in top_members)

        community_meta_elements.append({
            "data": {
                "id": f"comm-{comm_id}",
                "label": summary_data["title"][:35],
                "type": "COMMUNITY",
                "community": comm_id,
                "member_count": member_count,
                "top_members": [m[:25] for m in top_members],
                "color": color,
                "size": scale_community_size(member_count, all_comm_counts),
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
    inter_comm_edges: dict[tuple, dict] = {}
    for src, tgt, attrs in edges:
        if src not in viz_nodes or tgt not in viz_nodes:
            continue
        src_comm = entities[src].get("community", -1)
        tgt_comm = entities[tgt].get("community", -1)
        if src_comm == tgt_comm:
            continue
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
                f"{src} \u2192 {tgt}: {desc[:80]}"
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

    community_entity_data: dict[int, dict] = {}

    for comm_id in cyto_community_summaries:
        comm_members = [n for n in viz_nodes if entities[n].get("community") == comm_id]
        member_set = set(comm_members)

        ent_elements = []
        for node in comm_members:
            attrs = entities[node]
            pr = attrs.get("pagerank", 0)
            chunk_refs = entity_chunk_map.get(node, [])
            safe_id = sanitize_cyto_id(node)
            ent_elements.append({
                "data": {
                    "id": safe_id,
                    "label": node,
                    "parent": f"comm-{comm_id}",
                    "type": attrs.get("type", "UNKNOWN"),
                    "description": attrs.get("description", ""),
                    "community": comm_id,
                    "pagerank": round(pr, 6),
                    "degree_centrality": round(attrs.get("degree_centrality", 0), 4),
                    "betweenness": round(attrs.get("betweenness", 0), 4),
                    "num_sources": attrs.get("num_sources", 1),
                    "source_refs": attrs.get("source_refs", "[]"),
                    "color": COMMUNITY_COLORS[comm_id % len(COMMUNITY_COLORS)],
                    "size": scale_pagerank_to_size(pr, all_pr),
                    "chunk_count": len(chunk_refs),
                }
            })

        # Intra-community edges only
        edge_elements = []
        for src, tgt, attrs in edges:
            if src in member_set and tgt in member_set:
                safe_src = sanitize_cyto_id(src)
                safe_tgt = sanitize_cyto_id(tgt)
                edge_elements.append({
                    "data": {
                        "id": f"{safe_src}-->{safe_tgt}",
                        "source": safe_src,
                        "target": safe_tgt,
                        "description": attrs.get("description", ""),
                        "weight": attrs.get("weight", 1.0),
                    }
                })

        # Semantic groups within this community
        sg_elements = []
        for group in semantic_groups:
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
                    "parent": f"comm-{comm_id}",
                    "type": "SEMANTIC_GROUP",
                    "group_id": gid,
                    "canonical": group["canonical"],
                    "member_count": len(valid_members),
                    "color": SEMANTIC_GROUP_COLOR,
                }
            })
            safe_valid = {sanitize_cyto_id(m) for m in valid_members}
            for ent in ent_elements:
                if ent["data"]["id"] in safe_valid:
                    ent["data"]["parent"] = parent_id

        community_entity_data[comm_id] = {
            "entities": ent_elements,
            "edges": edge_elements,
            "semantic_groups": sg_elements,
        }

    # 7. Build legend HTML
    legend_items = []
    for comm_id in sorted(cyto_community_summaries.keys()):
        color = COMMUNITY_COLORS[comm_id % len(COMMUNITY_COLORS)]
        members = [n for n in viz_nodes if entities[n].get("community") == comm_id]
        sorted_members = sorted(members, key=lambda x: -entities[x].get("pagerank", 0))
        summary = cyto_community_summaries.get(comm_id, {})
        legend_items.append({
            "id": comm_id,
            "color": color,
            "count": len(members),
            "members": sorted_members[:5],
            "title": summary.get("title", f"Community {comm_id}"),
        })

    if other_community_count > 0:
        legend_items.append({
            "id": -1,
            "color": "#555555",
            "count": other_node_count,
            "members": [],
            "title": f"Other ({other_community_count} small communities)",
        })

    legend_html_parts = []
    for item in legend_items:
        members_str = ", ".join(item["members"][:3])
        if len(item["members"]) > 3:
            members_str += f" +{item['count'] - 3}"
        legend_html_parts.append(
            f'<div class="legend-item" data-community="{item["id"]}" data-color="{item["color"]}">'
            f'<div class="legend-dot" style="background:{item["color"]}"></div>'
            f'<div class="legend-text"><span class="title">{item["title"]}</span> '
            f'<span class="count">({item["count"]})</span><br>{members_str}</div>'
            f'</div>'
        )

    # Print summary
    meta_nodes = len([e for e in community_meta_elements if "source" not in e["data"]])
    meta_edges = len([e for e in community_meta_elements if "source" in e["data"]])
    total_entities = sum(len(d["entities"]) for d in community_entity_data.values())
    total_intra_edges = sum(len(d["edges"]) for d in community_entity_data.values())
    total_sg = sum(len(d["semantic_groups"]) for d in community_entity_data.values())
    entities_with_chunks = sum(1 for v in cyto_chunk_refs.values() if v)
    total_chunk_refs = sum(len(v) for v in cyto_chunk_refs.values())

    print(f"\nLevel 0: {meta_nodes} community meta-nodes, {meta_edges} inter-community edges")
    print(f"Level 1: {total_entities} entities across {len(community_entity_data)} communities, "
          f"{total_intra_edges} intra-community edges")
    print(f"Level 1: {total_sg} semantic groups nested in communities")
    print(f"Level 2: {entities_with_chunks} entities with {total_chunk_refs} chunk refs "
          f"({len(chunk_texts)} unique texts)")
    print(f"Community summaries: {len(cyto_community_summaries)} included, "
          f"{other_community_count} collapsed to 'Other' ({other_node_count} nodes)")

    return {
        "meta_elements": community_meta_elements,
        "entity_data": community_entity_data,
        "chunk_texts": chunk_texts,
        "chunk_refs": cyto_chunk_refs,
        "community_summaries": cyto_community_summaries,
        "semantic_groups": cyto_semantic_groups,
        "legend_html": "\n".join(legend_html_parts),
        "legend_count": len(legend_items),
        "meta_nodes": meta_nodes,
        "total_entities": total_entities,
        "comm_count": len(cyto_community_summaries),
    }


# --- HTML Rendering ---

def render_html(viz_data: dict, template_path: Path) -> str:
    """Read template, substitute placeholders, return HTML string."""
    template = template_path.read_text()
    html = template
    html = html.replace("COMMUNITY_META_JSON", json.dumps(viz_data["meta_elements"]))
    html = html.replace("COMMUNITY_ENTITIES_JSON", json.dumps(viz_data["entity_data"]))
    html = html.replace("CHUNK_TEXTS_JSON", json.dumps(viz_data["chunk_texts"]))
    html = html.replace("CHUNK_REFS_JSON", json.dumps(viz_data["chunk_refs"]))
    html = html.replace("COMMUNITY_SUMMARIES_JSON", json.dumps(viz_data["community_summaries"]))
    html = html.replace("SEMANTIC_GROUPS_JSON", json.dumps(viz_data["semantic_groups"]))
    html = html.replace("LEGEND_HTML", viz_data["legend_html"])
    html = html.replace("LEGEND_COUNT", str(viz_data["legend_count"]))
    html = html.replace("META_NODES", str(viz_data["meta_nodes"]))
    html = html.replace("TOTAL_ENTITIES", str(viz_data["total_entities"]))
    html = html.replace("COMM_COUNT", str(viz_data["comm_count"]))
    return html


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Generate knowledge graph visualization")
    parser.add_argument("--db", default="notebooks/graphrag.db",
                        help="Path to SQLite database (default: notebooks/graphrag.db)")
    parser.add_argument("--output", default="notebooks/knowledge_graph.html",
                        help="Output HTML path (default: notebooks/knowledge_graph.html)")
    parser.add_argument("--no-open", action="store_true",
                        help="Don't open in browser after generating")
    parser.add_argument("--top-communities", type=int, default=0,
                        help="Only include the N largest communities (0 = all)")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"Error: Database not found at {db_path}")
        raise SystemExit(1)

    print(f"Loading data from {db_path}...")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    entities = load_entities(cursor)
    edges = load_relationships(cursor)
    community_summaries = load_community_summaries(cursor)
    chunk_lookup = load_chunk_lookup(cursor)
    semantic_groups = load_semantic_groups(cursor)
    entity_chunk_map = load_entity_chunk_map(cursor)

    conn.close()
    print(f"Loaded {len(entities)} entities, {len(edges)} edges, "
          f"{len(community_summaries)} communities, {len(chunk_lookup)} chunks")

    # Sample: keep only top N largest communities
    if args.top_communities > 0:
        # Rank communities by entity count
        comm_counts: dict[int, int] = {}
        for ent in entities.values():
            cid = ent.get("community", -1)
            if cid is not None and cid >= 0:
                comm_counts[cid] = comm_counts.get(cid, 0) + 1
        top_ids = sorted(comm_counts, key=lambda c: -comm_counts[c])[:args.top_communities]
        top_set = set(top_ids)
        print(f"\nSampling: keeping top {args.top_communities} communities: {top_ids}")

        entities = {n: e for n, e in entities.items() if e.get("community") in top_set}
        edges = [(s, t, a) for s, t, a in edges if s in entities and t in entities]
        community_summaries = {k: v for k, v in community_summaries.items() if k in top_set}
        entity_chunk_map = {k: v for k, v in entity_chunk_map.items() if k in entities}
        semantic_groups = [g for g in semantic_groups
                          if any(m in entities for m in g["members"])]
        print(f"After sampling: {len(entities)} entities, {len(edges)} edges, "
              f"{len(community_summaries)} communities")

    # Prepare visualization data
    viz_data = prepare_viz_data(entities, edges, community_summaries, chunk_lookup,
                                semantic_groups, entity_chunk_map)

    # Render HTML
    template_path = Path(__file__).parent / "templates" / "knowledge_graph.html"
    if not template_path.exists():
        print(f"Error: Template not found at {template_path}")
        raise SystemExit(1)

    html = render_html(viz_data, template_path)

    # Write and optionally open
    output_path = Path(args.output)
    output_path.write_text(html)
    print(f"\nVisualization written to: {output_path.absolute()}")

    if not args.no_open:
        webbrowser.open(f"file://{output_path.absolute()}")
        print("Opened in browser")

    print("\nInteractions:")
    print("  Level 0: Click community node to expand -> Level 1")
    print("  Level 1: Click entity inside community -> chunk expansion (Level 2)")
    print("  Level 1: Click community border -> collapse back to Level 0")
    print("  Legend: Click community -> expand + focus")
    print("  Hover inter-community edge -> tooltip with relationship details")
    print("  Hover chunk node -> tooltip with full text")
    print("  Click background -> reset dimming")


if __name__ == "__main__":
    main()
