# CLAUDE.md - DKIA Project Instructions

> Last updated: February 19, 2026
> Version: Pre-release (knowledge graph integration)

## What Is This Project

**Daily Knowledge Ingestion Assistant (DKIA)** — A personal knowledge navigation system that ingests content from multiple sources overnight, builds a knowledge graph, and presents it through two components:

1. **The Navigator** — Conversational-first chat interface (left pane, ~40%). The user drives discovery each morning through questions. The AI has processed everything overnight and guides on where to look, why it matters, and how to approach it.

2. **The Visualization Platform** — Interactive 3D WebGL knowledge graph powered by `3d-force-graph` + `Three.js` (right pane, ~60%). Shows entities, relationships, topic clusters as a spherical world map. Nodes sized by centrality, colored by category, clustered by community detection.

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
| Frontend | Jinja2 + Koine Design System + 3d-force-graph (Three.js WebGL) |
| Design System | Koine (custom): CSS tokens, SVG logos, Tailwind 4 preset |
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
│   ├── README.md                  # Design system overview and usage guide
│   ├── manifest.json              # Design system manifest
│   ├── assets/logos/              # SVG logos: full, reduced, minimal, glyph (dark/light)
│   ├── assets/favicons/           # Favicon set (ico, png 16-512, apple-touch)
│   ├── styles/global.css          # CSS custom properties, themes, animations, typography
│   ├── tokens/                    # Design tokens (colors, motion, spacing, typography)
│   │   └── themes/                # Theme overrides (dark.json, light.json, liturgical.json)
│   ├── docs/components.md         # Component guidelines (buttons, cards, inputs, nav)
│   └── tailwind.config.js         # Tailwind 4 preset with Koine tokens
├── docs/
│   ├── architecture-plan.md
│   ├── market-research.md
│   ├── graphrag-algorithm-paper.md
│   ├── dev-setup.md
│   ├── CHANGELOG.md
│   ├── design-system.md           # Integration guide for Koine Design System
│   └── design-concepts/           # 3 HTML mockups (Observatory, Morning Edition, Briefing Room)
├── src/
│   ├── main.py                    # FastAPI application (routes, static mounts)
│   └── web/
│       ├── static/
│       │   ├── css/app.css        # Application styles (imports global.css)
│       │   ├── css/graph.css      # Knowledge graph styles (sidebar, legend, tooltips)
│       │   └── js/graph.js        # 3d-force-graph WebGL logic + Koine palette + sidebar
│       └── templates/
│           ├── base.html          # Shell: favicon, CSS, split-pane, extra_css block
│           └── navigator.html     # Navigator + Graph canvas + floating sidebar
├── scripts/
│   ├── generate_viz.py
│   └── templates/knowledge_graph.html
├── notebooks/                     # GraphRAG prototyping notebooks (01, 02, 03)
├── tailwind.config.js             # Root Tailwind config (uses design-system preset)
├── pyproject.toml                 # Python dependencies
└── package.json                   # Node.js dev dependencies (tailwindcss)
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
  -> SQLite -> 3D WebGL Viz (3d-force-graph) -> Embeddings -> Triple-Factor Retrieval
```

**Generated artifacts (gitignored):** `notebooks/extraction_results.json`, `notebooks/graphrag.db`, `notebooks/knowledge_graph.html`

## Current State

- **Phase**: Frontend Theme & Visualization Enhancements complete
- **What exists**:
  - 3 GraphRAG notebooks (extraction, graph+viz, retrieval) — pipeline validated
  - Koine Design System integrated (`design-system/`) with full CSS tokens, SVG logos, favicons
  - Frontend: FastAPI + Jinja2 serving Navigator (chat) and Visualization (knowledge graph) panes
  - Knowledge graph: 40 communities, 158 entities, 96 chunks rendered via 3D WebGL spherical layout (`3d-force-graph` + `Three.js`). Data is served **dynamically** from `graphrag.db` via FastAPI endpoint `/api/graph/data`.
  - Dynamic dual-theme styling (Dark/Light mode) with interactive illumination, high-contrast typography, and glassmorphism elements
  - GitHub Wiki (Phase 0 + 1 + 2), comprehensive docs, 3 UI mockups
- **Frontend status**: Running locally via `python3 -m venv .venv && source .venv/bin/activate && uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload`
  - Split-pane layout: Navigator (~40%) + Visualization (~60%)
  - True 3D Interactive World Map Graph rotating dynamically around origin
  - Typography: Cormorant Garamond (display), DM Sans (body), JetBrains Mono (graph labels)
- **Next step**: Connect Navigator chat to Ollama backend, refactor remaining notebooks into `src/` modules
- **Implementation plan**: 10 steps in `docs/architecture-plan.md`

## MVP Scope (Phase 1)

- 3 source connectors: RSS, Hacker News, arXiv (full PDF content)
- Full processing pipeline: dedup -> extract -> summarize -> embed -> cluster -> landscape summaries
- Navigator with triple-factor retrieval + SSE streaming
- Visualization Platform with 3d-force-graph (3D WebGL spherical layout)
- APScheduler for overnight automation
- Sources management page

## Build / Test / Lint Commands

- **Dev server**: `python3 -m venv .venv && source .venv/bin/activate && pip install -e . && uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload`
- **Build CSS**: `npx @tailwindcss/cli -i ./src/web/static/css/app.css -o ./src/web/static/css/output.css`
- **Install Python deps**: `pip install -e .`
- **Install Node deps**: `npm install`
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
Phase-2:-Design-System-and-Frontend-Scaffold.md
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
