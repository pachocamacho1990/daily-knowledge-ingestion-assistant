import json
import sqlite3
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set, Any

_CYTO_UNSAFE = re.compile(r'[.#\[\]():"\',\\]')
COMMUNITY_COLORS = [
    "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
    "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
    "#dcbeff", "#9A6324", "#fffac8", "#800000", "#aaffc3",
]
MAX_COMPOUND_SIZE = 15
SEMANTIC_GROUP_COLOR = "#bfef45"
MIN_COMMUNITY_SIZE_FOR_VIZ = 2

def sanitize_cyto_id(name: str) -> str:
    """Replace characters that break Cytoscape.js CSS selectors."""
    return _CYTO_UNSAFE.sub('_', name)

def scale_pagerank_to_size(pr: float, all_pr: List[float], min_size: int = 25, max_size: int = 90) -> int:
    if not all_pr:
        return (min_size + max_size) // 2
    pr_min, pr_max = min(all_pr), max(all_pr)
    if pr_max == pr_min:
        return (min_size + max_size) // 2
    normalized = (pr - pr_min) / (pr_max - pr_min)
    return int(min_size + normalized * (max_size - min_size))

def scale_community_size(member_count: int, all_counts: List[int], min_size: int = 40, max_size: int = 120) -> int:
    if not all_counts:
        return (min_size + max_size) // 2
    c_min, c_max = min(all_counts), max(all_counts)
    if c_max == c_min:
        return (min_size + max_size) // 2
    normalized = (member_count - c_min) / (c_max - c_min)
    return int(min_size + normalized * (max_size - min_size))

def load_entities(cursor) -> Dict[str, dict]:
    cursor.execute("""
        SELECT name, type, description, pagerank, degree_centrality,
               betweenness, community_id, source_refs, num_sources
        FROM entities
    """)
    return {row[0]: {"type": row[1], "description": row[2], "pagerank": row[3],
                     "degree_centrality": row[4], "betweenness": row[5],
                     "community": row[6], "source_refs": row[7],
                     "num_sources": row[8]} for row in cursor.fetchall()}

def load_relationships(cursor) -> List[Tuple[str, str, dict]]:
    cursor.execute("""
        SELECT e1.name, e2.name, r.description, r.weight
        FROM relationships r
        JOIN entities e1 ON r.source_id = e1.id
        JOIN entities e2 ON r.target_id = e2.id
    """)
    return [(row[0], row[1], {"description": row[2], "weight": row[3]}) for row in cursor.fetchall()]

def load_community_summaries(cursor) -> Dict[int, dict]:
    try:
        cursor.execute("SELECT community_id, title, summary, key_entities, key_insights FROM community_summaries")
        return {row[0]: {"title": row[1], "summary": row[2],
                         "key_entities": json.loads(row[3]) if row[3] else [],
                         "key_insights": json.loads(row[4]) if row[4] else []} for row in cursor.fetchall()}
    except sqlite3.OperationalError:
        return {}  # If table doesn't exist

def load_chunk_lookup(cursor) -> Dict[int, dict]:
    try:
        cursor.execute("SELECT chunk_index, content, source_ref FROM chunks")
        return {row[0]: {"text": row[1], "source_id": row[2]} for row in cursor.fetchall()}
    except sqlite3.OperationalError:
        return {}

def load_semantic_groups(cursor) -> List[dict]:
    try:
        cursor.execute("SELECT group_id, canonical, members, member_similarities FROM semantic_groups")
        return [{"group_id": row[0], "canonical": row[1],
                 "members": json.loads(row[2]) if row[2] else [],
                 "member_similarities": json.loads(row[3]) if row[3] else {}} for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        return []

def load_entity_chunk_map(cursor) -> Dict[str, list]:
    try:
        cursor.execute("SELECT entity_name, chunk_index, source_id FROM entity_chunk_map")
        result: Dict[str, list] = {}
        for row in cursor.fetchall():
            result.setdefault(row[0], []).append({"chunk_index": row[1], "source_id": row[2]})
        return result
    except sqlite3.OperationalError:
        return {}

def prepare_viz_data(entities, edges, community_summaries, chunk_lookup, semantic_groups, entity_chunk_map) -> Dict[str, Any]:
    node_degree: Dict[str, int] = {}
    for src, tgt, _ in edges:
        node_degree[src] = node_degree.get(src, 0) + 1
        node_degree[tgt] = node_degree.get(tgt, 0) + 1

    viz_nodes = {n for n in entities if node_degree.get(n, 0) > 0 and n.strip()}
    entity_node_ids = set(viz_nodes)

    viz_community_counts: Dict[int, int] = {}
    for node in viz_nodes:
        comm_id = entities[node].get("community", -1)
        viz_community_counts[comm_id] = viz_community_counts.get(comm_id, 0) + 1

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

    chunk_texts: List[str] = []
    chunk_text_to_idx: Dict[str, int] = {}
    cyto_chunk_refs: Dict[str, list] = {}

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

    all_pr = [entities[n].get("pagerank", 0) for n in viz_nodes]
    all_comm_counts = [viz_community_counts[c] for c in viz_community_counts if viz_community_counts[c] >= MIN_COMMUNITY_SIZE_FOR_VIZ]

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

    inter_comm_edges: Dict[Tuple, dict] = {}
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
            inter_comm_edges[key]["descriptions"].append(f"{src} \u2192 {tgt}: {desc[:80]}")

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

    community_entity_data: Dict[int, dict] = {}

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
                    "pagerank": round(pr or 0, 6),
                    "degree_centrality": round(attrs.get("degree_centrality") or 0, 4),
                    "betweenness": round(attrs.get("betweenness") or 0, 4),
                    "num_sources": attrs.get("num_sources", 1),
                    "source_refs": attrs.get("source_refs", "[]"),
                    "color": COMMUNITY_COLORS[comm_id % len(COMMUNITY_COLORS)],
                    "size": scale_pagerank_to_size(pr, all_pr),
                    "chunk_count": len(chunk_refs),
                }
            })

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

        sg_elements = []
        for group in semantic_groups:
            gid = group["group_id"]
            valid_members = [m for m in group["members"] if m in member_set and m in entity_node_ids]
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

    # Format summaries uniformly
    formatted_summaries = {}
    for comm_id, summary_data in cyto_community_summaries.items():
        formatted_summaries[comm_id] = {
            "title": summary_data.get("title", f"Community {comm_id}"),
            "summary": summary_data.get("summary", ""),
            "key_insights": summary_data.get("key_insights", []),
        }

    return {
        "metaElements": community_meta_elements,
        "communityData": community_entity_data,
        "chunkTexts": chunk_texts,
        "chunkRefs": cyto_chunk_refs,
        "commSummaries": formatted_summaries,
        "semanticGroups": cyto_semantic_groups,
    }

def get_graph_data(db_path: str, top_communities: int = 0) -> Dict[str, Any]:
    if not os.path.exists(db_path):
        return {
            "metaElements": [],
            "communityData": {},
            "chunkTexts": [],
            "chunkRefs": {},
            "commSummaries": {},
            "semanticGroups": {},
            "error": "Database not found"
        }

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        entities = load_entities(cursor)
        edges = load_relationships(cursor)
        community_summaries = load_community_summaries(cursor)
        chunk_lookup = load_chunk_lookup(cursor)
        semantic_groups = load_semantic_groups(cursor)
        entity_chunk_map = load_entity_chunk_map(cursor)
    except Exception as e:
        conn.close()
        return {"error": str(e)}

    conn.close()

    if top_communities > 0:
        comm_counts: Dict[int, int] = {}
        for ent in entities.values():
            cid = ent.get("community", -1)
            if cid is not None and cid >= 0:
                comm_counts[cid] = comm_counts.get(cid, 0) + 1
        top_ids = sorted(comm_counts, key=lambda c: -comm_counts[c])[:top_communities]
        top_set = set(top_ids)

        entities = {n: e for n, e in entities.items() if e.get("community") in top_set}
        edges = [(s, t, a) for s, t, a in edges if s in entities and t in entities]
        community_summaries = {k: v for k, v in community_summaries.items() if k in top_set}
        entity_chunk_map = {k: v for k, v in entity_chunk_map.items() if k in entities}
        semantic_groups = [g for g in semantic_groups if any(m in entities for m in g["members"])]

    return prepare_viz_data(entities, edges, community_summaries, chunk_lookup, semantic_groups, entity_chunk_map)
