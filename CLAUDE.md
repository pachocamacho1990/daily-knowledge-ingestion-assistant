# CLAUDE.md - DKIA Project Instructions

> Last updated: February 13, 2026
> Version: Pre-release (design phase)

## What Is This Project

**Daily Knowledge Ingestion Assistant (DKIA)** — A personal knowledge navigation system that ingests content from multiple sources overnight, builds a knowledge graph, and presents it through two components:

1. **The Navigator** — Conversational-first chat interface (left pane, ~40%). The user drives discovery each morning through questions. The AI has processed everything overnight and guides on where to look, why it matters, and how to approach it.

2. **The Visualization Platform** — Interactive knowledge graph powered by Cytoscape.js (right pane, ~60%). Shows entities, relationships, topic clusters as a living map. Nodes sized by centrality, colored by category, clustered by community detection.

**Core belief**: This is about the future of education — optimizing how humans learn from large volumes of data.

## Key Architecture Decisions

- **Deployment**: Docker container on a separate Apple Silicon Mac. Ollama runs **natively on the host** (not in Docker) to leverage Metal GPU. Container connects via `host.docker.internal:11434`.
- **100% open-source**: No paid APIs, no proprietary services.
- **LLM models**: `llama3.1:8b` (chat/summarization/entity extraction) + `nomic-embed-text` (embeddings, 768-dim), both via Ollama.
- **Storage**: SQLite + sqlite-vec (vector) + SQLite graph tables (entities/relationships) + NetworkX (in-memory batch algorithms).
- **No separate graph DB**: Graph stored in SQLite tables, loaded into NetworkX for batch computations (PageRank, community detection, centrality).
- **Triple-factor retrieval**: `final_score = 0.6 * semantic_similarity + 0.2 * temporal_decay + 0.2 * graph_centrality`
- **Temporal decay**: `0.5 ^ (age_days / half_life)` with content-type-aware half-lives (news: 7d, papers: 30d, reference: 365d).
- **Five-level summarization pipeline**: Item compression (overnight) → Topic clustering via Leiden/Louvain (overnight) → Landscape mapping (overnight) → Query-driven synthesis (real-time) → Progressive detail (real-time).

## Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3.12 |
| Web framework | FastAPI + Uvicorn |
| Frontend | Jinja2 + HTMX + Tailwind CSS (CDN) + Cytoscape.js |
| Database | SQLite + sqlite-vec |
| Graph algorithms | NetworkX + python-louvain |
| LLM runtime | Ollama (host-native) |
| Scheduling | APScheduler |
| Sources (MVP) | feedparser (RSS), httpx (HN Algolia API), arxiv (PyPI) |
| HTML extraction | trafilatura |
| Text chunking | langchain-text-splitters |
| Packaging | Docker + docker-compose |
| Package mgmt | uv |
| Linting | ruff |

## Project Structure

```
daily-knowledge-ingestion-assistant/
├── CLAUDE.md                          # This file
├── .gitignore
├── docs/
│   ├── architecture-plan.md           # Full architecture (schema, pipeline, implementation steps)
│   ├── market-research.md             # Competitive landscape + problem statement
│   └── design-concepts/
│       ├── concept-a-observatory.html # Dark + amber, constellation graph
│       ├── concept-b-morning-edition.html # Editorial warmth, parchment graph
│       └── concept-c-briefing-room.html   # Intelligence analyst, structured graph
└── (src/, tests/, Dockerfile, etc. — not yet created)
```

## Key Documents

- **Architecture plan**: `docs/architecture-plan.md` — Full DDL schema, 10-step implementation sequence, project structure, verification plan.
- **Market research**: `docs/market-research.md` — 30+ commercial products, 25+ open-source projects analyzed. Competitive benchmark matrix. Problem statement.
- **Design concepts**: `docs/design-concepts/` — Three self-contained HTML mockups showing the split-pane Navigator + Visualization Platform layout with different visual identities. Open in browser to view.

## Current State

- **Phase**: Design / Pre-implementation
- **What exists**: Documentation + 3 UI design concept mockups (updated Feb 13 to reflect Navigator + Graph split-pane vision)
- **What doesn't exist yet**: No code, no Dockerfile, no pyproject.toml
- **Next step**: User reviews design concepts, chooses direction, then implementation begins at Step 1 (project scaffolding + Docker)
- **Implementation plan**: 10 steps defined in `docs/architecture-plan.md`

## Design Concepts Status

Three visual identities were explored, each now updated to the split-pane Navigator + Graph paradigm:

| Concept | Visual Identity | Status |
|---|---|---|
| A: Observatory | Dark void + amber glow, Inter + JetBrains Mono | Updated Feb 13 |
| B: Morning Edition | Warm paper + editorial red, Playfair + Source Sans | Updated Feb 13 |
| C: Briefing Room | Structured institutional + priority bands, DM Sans + DM Mono | Updated Feb 13 |

User has not yet chosen a direction.

## MVP Scope (Phase 1)

- 3 source connectors: RSS, Hacker News, arXiv (abstracts only)
- Full processing pipeline: dedup → extract → summarize → entity extraction → embed → cluster → landscape summaries
- Navigator with triple-factor retrieval + SSE streaming
- Visualization Platform with Cytoscape.js
- APScheduler for overnight automation
- Sources management page

## Build / Test / Lint Commands

*(Will be populated when code exists)*

- Build: `docker-compose build`
- Run: `docker-compose up`
- Lint: `ruff check src/`
- Test: `pytest tests/`
- Single test: `pytest tests/path/to/test.py::test_function`

## Git Conventions

- SSH signing enabled (gpg.format=ssh, commit.gpgsign=true)
- Merge strategy: rebase + delete branch (`gh pr merge <n> --rebase --delete-branch`)
- Always check latest release tag before versioning (`gh release list --limit 5`)

## Changelog

- **Feb 6, 2026**: Initial architecture plan and market research created
- **Feb 11, 2026**: Three UI design concept mockups (Observatory, Morning Edition, Briefing Room)
- **Feb 13, 2026**: Vision refined to conversational Navigator + graph Visualization Platform. Both docs fully rewritten. Problem statement added to market research.
- **Feb 13, 2026**: Design concepts updated to split-pane layout matching new vision
