#!/usr/bin/env python3
"""Generate knowledge graph visualization using Plotly + NetworkX.

Reads graph data from SQLite and produces an interactive Plotly HTML file.
Two views available:
  --view entity    (default) Entity-level graph colored by community
  --view community           Community meta-node graph with member counts

Usage:
    python scripts/generate_viz_plotly.py
    python scripts/generate_viz_plotly.py --top-communities 10
    python scripts/generate_viz_plotly.py --view community
    python scripts/generate_viz_plotly.py --db path/to/graphrag.db --no-open
"""

import argparse
import json
import sqlite3
import webbrowser
from pathlib import Path

import networkx as nx
import plotly.graph_objects as go

# --- Constants ---

COMMUNITY_COLORS = [
    "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
    "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
    "#dcbeff", "#9A6324", "#fffac8", "#800000", "#aaffc3",
]

BG_COLOR = "#0a0a0f"
GRID_COLOR = "#1a1a2a"
EDGE_COLOR = "#333333"


# --- Data Loading (SQLite) ---

def load_entities(cursor) -> dict[str, dict]:
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
    cursor.execute("""
        SELECT e1.name, e2.name, r.description, r.weight
        FROM relationships r
        JOIN entities e1 ON r.source_id = e1.id
        JOIN entities e2 ON r.target_id = e2.id
    """)
    return [(row[0], row[1], {"description": row[2], "weight": row[3]})
            for row in cursor.fetchall()]


def load_community_summaries(cursor) -> dict[int, dict]:
    cursor.execute("SELECT community_id, title, summary, key_entities, key_insights FROM community_summaries")
    return {row[0]: {"title": row[1], "summary": row[2],
                      "key_entities": json.loads(row[3]),
                      "key_insights": json.loads(row[4])} for row in cursor.fetchall()}


# --- Graph Building ---

def build_graph(entities, edges):
    """Build a NetworkX graph from entity/edge dicts, filtered to connected nodes."""
    G = nx.Graph()
    for name, attrs in entities.items():
        if name.strip():
            G.add_node(name, **attrs)

    for src, tgt, attrs in edges:
        if src in G and tgt in G:
            G.add_edge(src, tgt, **attrs)

    # Remove isolated nodes
    isolates = list(nx.isolates(G))
    G.remove_nodes_from(isolates)
    print(f"Graph: {G.number_of_nodes()} connected nodes, {G.number_of_edges()} edges "
          f"({len(isolates)} isolates removed)")
    return G


# --- Entity View ---

def make_entity_figure(G, community_summaries):
    """Create Plotly figure showing entity nodes colored by community."""
    pos = nx.spring_layout(G, k=2.5, iterations=80, seed=42)

    # Collect all pagerank values for size scaling
    pr_values = [G.nodes[n].get("pagerank", 0) for n in G.nodes]
    pr_min, pr_max = min(pr_values), max(pr_values)
    pr_range = pr_max - pr_min if pr_max > pr_min else 1

    # Edge traces
    edge_x, edge_y = [], []
    edge_hover = []
    edge_mid_x, edge_mid_y = [], []
    for src, tgt, attrs in G.edges(data=True):
        x0, y0 = pos[src]
        x1, y1 = pos[tgt]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])
        edge_mid_x.append((x0 + x1) / 2)
        edge_mid_y.append((y0 + y1) / 2)
        desc = attrs.get("description", "")
        edge_hover.append(f"{src} -> {tgt}<br>{desc[:100]}" if desc else f"{src} -> {tgt}")

    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        mode="lines",
        line=dict(width=0.8, color=EDGE_COLOR),
        hoverinfo="none",
        showlegend=False,
    )

    # Invisible midpoint trace for edge hover
    edge_mid_trace = go.Scatter(
        x=edge_mid_x, y=edge_mid_y,
        mode="markers",
        marker=dict(size=8, color="rgba(0,0,0,0)"),
        text=edge_hover,
        hoverinfo="text",
        showlegend=False,
    )

    # Group nodes by community for color-coded legend
    comm_nodes: dict[int, list[str]] = {}
    for node in G.nodes:
        cid = G.nodes[node].get("community", -1)
        comm_nodes.setdefault(cid, []).append(node)

    node_traces = []
    for cid in sorted(comm_nodes.keys()):
        nodes = comm_nodes[cid]
        color = COMMUNITY_COLORS[cid % len(COMMUNITY_COLORS)] if cid >= 0 else "#555555"
        summary = community_summaries.get(cid, {})
        legend_name = summary.get("title", f"Community {cid}")[:40]

        xs = [pos[n][0] for n in nodes]
        ys = [pos[n][1] for n in nodes]
        sizes = [
            8 + 30 * ((G.nodes[n].get("pagerank", 0) - pr_min) / pr_range)
            for n in nodes
        ]
        hovers = []
        for n in nodes:
            a = G.nodes[n]
            hover = (
                f"<b>{n}</b><br>"
                f"Type: {a.get('type', '?')}<br>"
                f"Community: {cid} — {summary.get('title', '?')[:50]}<br>"
                f"PageRank: {a.get('pagerank', 0):.4f}<br>"
                f"Degree: {a.get('degree_centrality', 0):.4f}<br>"
                f"Sources: {a.get('num_sources', 1)}<br>"
                f"{a.get('description', '')[:120]}"
            )
            hovers.append(hover)

        trace = go.Scatter(
            x=xs, y=ys,
            mode="markers+text",
            marker=dict(
                size=sizes,
                color=color,
                line=dict(width=1, color="#222"),
                opacity=0.85,
            ),
            text=[n if G.nodes[n].get("pagerank", 0) > pr_min + pr_range * 0.3 else ""
                  for n in nodes],
            textposition="top center",
            textfont=dict(size=9, color="#aaa"),
            hovertext=hovers,
            hoverinfo="text",
            name=f"C{cid}: {legend_name}",
            legendgroup=f"comm-{cid}",
        )
        node_traces.append(trace)

    fig = go.Figure(data=[edge_trace, edge_mid_trace] + node_traces)

    fig.update_layout(
        title=dict(
            text="DKIA Knowledge Graph — Entity View",
            font=dict(size=18, color="#f58231"),
            x=0.02,
        ),
        plot_bgcolor=BG_COLOR,
        paper_bgcolor=BG_COLOR,
        font=dict(color="#e0e0e0"),
        showlegend=True,
        legend=dict(
            bgcolor="rgba(18,18,26,0.9)",
            bordercolor="#2a2a3a",
            borderwidth=1,
            font=dict(size=11),
            itemsizing="constant",
        ),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        hovermode="closest",
        margin=dict(l=10, r=10, t=50, b=10),
    )

    return fig


# --- Community View ---

def make_community_figure(G, community_summaries):
    """Create Plotly figure showing community meta-nodes."""
    # Group by community
    comm_members: dict[int, list[str]] = {}
    for node in G.nodes:
        cid = G.nodes[node].get("community", -1)
        comm_members.setdefault(cid, []).append(node)

    # Build a meta-graph: nodes = communities, edges = cross-community relationships
    MG = nx.Graph()
    for cid, members in comm_members.items():
        if len(members) < 2:
            continue
        summary = community_summaries.get(cid, {})
        pr_sum = sum(G.nodes[m].get("pagerank", 0) for m in members)
        MG.add_node(cid, member_count=len(members), title=summary.get("title", f"C{cid}"),
                     summary=summary.get("summary", ""), pr_sum=pr_sum,
                     key_entities=summary.get("key_entities", []),
                     key_insights=summary.get("key_insights", []))

    for src, tgt, attrs in G.edges(data=True):
        src_c = G.nodes[src].get("community", -1)
        tgt_c = G.nodes[tgt].get("community", -1)
        if src_c != tgt_c and src_c in MG and tgt_c in MG:
            if MG.has_edge(src_c, tgt_c):
                MG[src_c][tgt_c]["weight"] += 1
            else:
                MG.add_edge(src_c, tgt_c, weight=1)

    if MG.number_of_nodes() == 0:
        print("Warning: No communities with >= 2 members")
        return go.Figure()

    pos = nx.spring_layout(MG, k=3, iterations=60, seed=42)

    # Edges
    edge_x, edge_y = [], []
    edge_mid_x, edge_mid_y, edge_hover = [], [], []
    for s, t, attrs in MG.edges(data=True):
        x0, y0 = pos[s]
        x1, y1 = pos[t]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])
        edge_mid_x.append((x0 + x1) / 2)
        edge_mid_y.append((y0 + y1) / 2)
        edge_hover.append(f"C{s} <-> C{t}: {attrs['weight']} cross-community edges")

    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        mode="lines",
        line=dict(width=1.5, color="#555"),
        hoverinfo="none",
        showlegend=False,
    )

    edge_mid_trace = go.Scatter(
        x=edge_mid_x, y=edge_mid_y,
        mode="markers",
        marker=dict(size=10, color="rgba(0,0,0,0)"),
        text=edge_hover,
        hoverinfo="text",
        showlegend=False,
    )

    # Nodes
    counts = [MG.nodes[n]["member_count"] for n in MG.nodes]
    c_min, c_max = min(counts), max(counts)
    c_range = c_max - c_min if c_max > c_min else 1

    xs, ys, sizes, colors, hovers, labels = [], [], [], [], [], []
    for cid in MG.nodes:
        d = MG.nodes[cid]
        x, y = pos[cid]
        xs.append(x)
        ys.append(y)
        size = 20 + 60 * ((d["member_count"] - c_min) / c_range)
        sizes.append(size)
        colors.append(COMMUNITY_COLORS[cid % len(COMMUNITY_COLORS)] if cid >= 0 else "#555")
        labels.append(d["title"][:30])

        key_ents = ", ".join(d["key_entities"][:5]) if d["key_entities"] else "n/a"
        insights = "<br>".join(f"- {i[:80]}" for i in d["key_insights"][:3]) if d["key_insights"] else ""
        hover = (
            f"<b>Community {cid}: {d['title']}</b><br>"
            f"Members: {d['member_count']}<br>"
            f"PageRank sum: {d['pr_sum']:.4f}<br>"
            f"Key entities: {key_ents}<br>"
            f"<br>{d['summary'][:200]}"
        )
        if insights:
            hover += f"<br><br>Key insights:<br>{insights}"
        hovers.append(hover)

    node_trace = go.Scatter(
        x=xs, y=ys,
        mode="markers+text",
        marker=dict(
            size=sizes,
            color=colors,
            line=dict(width=2, color="#222"),
            opacity=0.85,
        ),
        text=labels,
        textposition="top center",
        textfont=dict(size=10, color="#ccc"),
        hovertext=hovers,
        hoverinfo="text",
        showlegend=False,
    )

    fig = go.Figure(data=[edge_trace, edge_mid_trace, node_trace])

    fig.update_layout(
        title=dict(
            text=f"DKIA Knowledge Graph — Community Overview ({MG.number_of_nodes()} communities)",
            font=dict(size=18, color="#f58231"),
            x=0.02,
        ),
        plot_bgcolor=BG_COLOR,
        paper_bgcolor=BG_COLOR,
        font=dict(color="#e0e0e0"),
        showlegend=False,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        hovermode="closest",
        margin=dict(l=10, r=10, t=50, b=10),
    )

    return fig


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Generate knowledge graph visualization (Plotly)")
    parser.add_argument("--db", default="notebooks/graphrag.db",
                        help="Path to SQLite database (default: notebooks/graphrag.db)")
    parser.add_argument("--output", default="notebooks/knowledge_graph.html",
                        help="Output HTML path (default: notebooks/knowledge_graph.html)")
    parser.add_argument("--no-open", action="store_true",
                        help="Don't open in browser after generating")
    parser.add_argument("--top-communities", type=int, default=0,
                        help="Only include the N largest communities (0 = all)")
    parser.add_argument("--view", choices=["entity", "community"], default="entity",
                        help="Visualization view (default: entity)")
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

    conn.close()
    print(f"Loaded {len(entities)} entities, {len(edges)} edges, "
          f"{len(community_summaries)} community summaries")

    # Sample: keep only top N largest communities
    if args.top_communities > 0:
        comm_counts: dict[int, int] = {}
        for ent in entities.values():
            cid = ent.get("community", -1)
            if cid is not None and cid >= 0:
                comm_counts[cid] = comm_counts.get(cid, 0) + 1
        top_ids = sorted(comm_counts, key=lambda c: -comm_counts[c])[:args.top_communities]
        top_set = set(top_ids)
        print(f"Sampling: keeping top {args.top_communities} communities "
              f"(ids: {top_ids})")

        entities = {n: e for n, e in entities.items() if e.get("community") in top_set}
        edges = [(s, t, a) for s, t, a in edges if s in entities and t in entities]
        community_summaries = {k: v for k, v in community_summaries.items() if k in top_set}
        print(f"After sampling: {len(entities)} entities, {len(edges)} edges")

    # Build graph
    G = build_graph(entities, edges)

    # Generate figure
    if args.view == "community":
        fig = make_community_figure(G, community_summaries)
    else:
        fig = make_entity_figure(G, community_summaries)

    # Write HTML
    output_path = Path(args.output)
    fig.write_html(str(output_path), include_plotlyjs="cdn")
    print(f"Visualization written to: {output_path.absolute()}")

    if not args.no_open:
        webbrowser.open(f"file://{output_path.absolute()}")
        print("Opened in browser")


if __name__ == "__main__":
    main()
