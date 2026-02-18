# CLAUDE.md - DKIA Project Instructions

> Last updated: February 17, 2026
> Version: Pre-release (prototyping phase)

## What Is This Project

**Daily Knowledge Ingestion Assistant (DKIA)** — A personal knowledge navigation system that ingests content from multiple sources overnight, builds a knowledge graph, and presents it through two components:

1. **The Navigator** — Conversational-first chat interface (left pane, ~40%). The user drives discovery each morning through questions. The AI has processed everything overnight and guides on where to look, why it matters, and how to approach it.

2. **The Visualization Platform** — Interactive knowledge graph powered by Cytoscape.js (right pane, ~60%). Shows entities, relationships, topic clusters as a living map. Nodes sized by centrality, colored by category, clustered by community detection.

**Core belief**: This is about the future of education — optimizing how humans learn from large volumes of data.

## Key Architecture Decisions

- **Deployment**: Docker container on Apple Silicon Mac. Ollama runs **natively on host** (Metal GPU) via `host.docker.internal:11434`.
- **100% open-source**: No paid APIs, no proprietary services.
- **LLM models**: `qwen2.5:3b` (chat/extraction) + `nomic-embed-text` (embeddings, 768-dim), both via Ollama.
- **NER model**: `urchade/gliner_small-v2.1` via GLiNER — zero-shot, multilingual (~166 MB, CPU).
- **Extraction modes**: `"llm"` (~18s/chunk), `"nlp"` (GLiNER + co-occurrence, <0.5s/chunk), `"hybrid"` (GLiNER + LLM, ~12s/chunk). Hybrid is the recommended default.
- **Storage**: SQLite + sqlite-vec (vector) + SQLite graph tables + NetworkX (in-memory batch algorithms). No separate graph DB.
- **Triple-factor retrieval**: `final_score = 0.6 * semantic + 0.2 * temporal_decay + 0.2 * graph_centrality`
- **Temporal decay**: `0.5 ^ (age_days / half_life)` with content-type-aware half-lives (news: 7d, papers: 30d, reference: 365d).

## Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3.12+ (dev uses 3.14) |
| Web framework | FastAPI + Uvicorn |
| Frontend | Jinja2 + HTMX + Tailwind CSS (CDN) + Cytoscape.js |
| Database | SQLite + sqlite-vec |
| Graph | NetworkX + igraph + leidenalg |
| LLM runtime | Ollama (host-native) |
| Scheduling | APScheduler |
| Sources (MVP) | feedparser (RSS), httpx (HN), arxiv + pymupdf (PDFs) |
| NER | GLiNER (`gliner_small-v2.1`) |
| Text processing | trafilatura, langchain-text-splitters, langdetect |
| Packaging | Docker + docker-compose, uv |
| Linting | ruff |

## Project Structure

```
daily-knowledge-ingestion-assistant/
├── CLAUDE.md
├── design-system/                 # Koine Design System (Tokens, CSS, Assets)
├── docs/
│   ├── architecture-plan.md           # Full architecture, schema, 10-step implementation
│   ├── market-research.md             # Competitive landscape + problem statement
│   ├── graphrag-algorithm-paper.md    # Algorithm reference (equations, complexity, benchmarks)
│   ├── dev-setup.md                   # Development environment setup (Ollama, venv, Jupyter)
│   ├── CHANGELOG.md                   # Detailed project changelog
│   ├── design-system.md               # Integration guide for Koine Design System
│   └── design-concepts/              # 3 HTML mockups (Observatory, Morning Edition, Briefing Room)
├── scripts/
│   ├── generate_viz.py                # Standalone visualization generator
│   └── templates/
│       └── knowledge_graph.html       # Cytoscape.js HTML template
├── notebooks/                         # GraphRAG prototyping notebooks
│   ├── 01_graphrag_extraction.ipynb   # Sources -> chunks -> entities/relations/claims -> merge -> semantic grouping
│   ├── 02_graph_construction_communities.ipynb  # Graph -> PageRank -> communities -> summaries -> SQLite
│   └── 03_embeddings_vector_search.ipynb        # Embeddings -> sqlite-vec -> triple-factor retrieval
└── (src/, tests/, Dockerfile — not yet created)
```

## Key Documents

- **Architecture plan**: `docs/architecture-plan.md` — DDL schema, 10-step implementation sequence, verification plan.
- **Algorithm reference**: `docs/graphrag-algorithm-paper.md` — Full pipeline spec with LaTeX math, Mermaid diagrams, complexity analysis. Also on the GitHub Wiki.
- **Market research**: `docs/market-research.md` — 30+ commercial, 25+ open-source projects analyzed.
- **Design concepts**: `docs/design-concepts/` — Three HTML mockups. User has not yet chosen a direction.
- **Dev setup**: `docs/dev-setup.md` — Ollama config, Python venv, Jupyter kernel, dependencies, hardware notes.
- **Changelog**: `docs/CHANGELOG.md` — Detailed history of all changes by date.

## Pipeline Overview

```
7 Sources (arXiv PDFs + Web) -> Chunks -> Entities/Relations/Claims [configurable mode]
  -> Cross-Doc Merge -> Semantic Grouping -> Graph -> Communities -> Summaries
  -> SQLite -> Cytoscape.js Viz -> Embeddings -> Triple-Factor Retrieval
```

**Generated artifacts (gitignored):** `notebooks/extraction_results.json`, `notebooks/graphrag.db`, `notebooks/knowledge_graph.html`

## Current State

- **Phase**: Prototyping — full GraphRAG pipeline validated in notebooks
- **What exists**: 3 notebooks (extraction, graph+viz, retrieval), docs, 3 UI mockups, GitHub Wiki (Phase 0 + 1)
- **What doesn't exist yet**: Production code (src/), Dockerfile, pyproject.toml, FastAPI server
- **Visualization**: Complete. Extracted from notebook 02 into standalone scripts:
  - `scripts/generate_viz.py` — Cytoscape.js multi-level drill-down (primary)
  - `scripts/generate_viz_plotly.py` — Plotly fallback (`--view entity` or `--view community`)
  - Run: `python scripts/generate_viz.py` or `python scripts/generate_viz_plotly.py`
  - All nodes circular (ellipse shape at every level)
  - Concentric layouts: Level 0 communities by size, Level 1 entities by PageRank
  - Expand/collapse: expanded community centers, collapsed nodes form ring outside
- **Cytoscape.js lessons learned** (all resolved):
  - `#cy` container must use `position: absolute` (not flex) for canvas sizing
  - Entity IDs sanitized: `.#[]():"',\` replaced with `_` (breaks CSS selectors)
  - Compound node layout: use `descendants()` not `children()`, avoid `cose` on compounds
  - Manual positioning (`arrangeInCircle`) for top-level relayout — built-in layouts don't account for compound node size
- **Next step**: Convert notebook prototypes to production Python modules, then Docker packaging
- **Implementation plan**: 10 steps in `docs/architecture-plan.md`

## MVP Scope (Phase 1)

- 3 source connectors: RSS, Hacker News, arXiv (full PDF content)
- Full processing pipeline: dedup -> extract -> summarize -> embed -> cluster -> landscape summaries
- Navigator with triple-factor retrieval + SSE streaming
- Visualization Platform with Cytoscape.js
- APScheduler for overnight automation
- Sources management page

## Build / Test / Lint Commands

*(Will be populated when production code exists)*

- Build: `docker-compose build`
- Run: `docker-compose up`
- Lint: `ruff check src/`
- Test: `pytest tests/`
- Single test: `pytest tests/path/to/test.py::test_function`

## GitHub Wiki

The project wiki documents the evolution of the product — phases, design decisions, and the logic behind them.

### Wiki Workflow

- **Location:** `pachocamacho1990/daily-knowledge-ingestion-assistant.wiki.git`
- **Clone:** `cd /tmp && gh repo clone pachocamacho1990/daily-knowledge-ingestion-assistant.wiki`
- **Working dir:** `/tmp/daily-knowledge-ingestion-assistant.wiki/`
- **Push:** `cd /tmp/daily-knowledge-ingestion-assistant.wiki && git add -A && git commit -m "..." && git push origin master`

### Wiki Structure

```
Home.md
Phase-0:-Research-and-Vision.md
  ├── Market-Landscape.md
  ├── Architecture-Vision.md
  └── Design-Explorations.md
Phase-1:-GraphRAG-Engine.md
  ├── GraphRAG-Pipeline-Architecture.md
  ├── Multi-Source-Ingestion.md
  ├── Knowledge-Graph-and-Communities.md
  ├── Standalone-Visualization.md
  ├── Triple-Factor-Retrieval.md
  ├── Key-Learnings-and-Design-Decisions.md
  └── Algorithm-Reference.md
```

### Wiki Conventions

- Every completed phase gets wiki documentation with development dates.
- Navigation: every page ends with `<- [[Previous Page]] | [[Next Page]] ->` footer.
- Filenames: dashes for spaces, colons for phase prefixes (e.g., `Phase-1:-GraphRAG-Engine.md`).
- Tone: explain the "why" behind decisions, not just the "what."
- No emojis unless explicitly requested.

### Plan File Lifecycle

Plans are stored as temporary `PLAN_*.md` files near the code they affect (gitignored).

1. **Create**: Self-contained plan with full context, code snippets, anchor strings, verification steps.
2. **Execute**: A subsequent session implements it step by step.
3. **Document**: Translate key insights into GitHub Wiki pages.
4. **Delete**: Remove the plan file. Never leave stale plan files.

## Git Conventions

- SSH signing enabled (gpg.format=ssh, commit.gpgsign=true)
- Merge strategy: rebase + delete branch (`gh pr merge <n> --rebase --delete-branch`)
- Always check latest release tag before versioning (`gh release list --limit 5`)
