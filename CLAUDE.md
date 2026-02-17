# CLAUDE.md - DKIA Project Instructions

> Last updated: February 16, 2026
> Version: Pre-release (prototyping phase)

## What Is This Project

**Daily Knowledge Ingestion Assistant (DKIA)** — A personal knowledge navigation system that ingests content from multiple sources overnight, builds a knowledge graph, and presents it through two components:

1. **The Navigator** — Conversational-first chat interface (left pane, ~40%). The user drives discovery each morning through questions. The AI has processed everything overnight and guides on where to look, why it matters, and how to approach it.

2. **The Visualization Platform** — Interactive knowledge graph powered by Cytoscape.js (right pane, ~60%). Shows entities, relationships, topic clusters as a living map. Nodes sized by centrality, colored by category, clustered by community detection.

**Core belief**: This is about the future of education — optimizing how humans learn from large volumes of data.

## Key Architecture Decisions

- **Deployment**: Docker container on a separate Apple Silicon Mac. Ollama runs **natively on the host** (not in Docker) to leverage Metal GPU. Container connects via `host.docker.internal:11434`.
- **100% open-source**: No paid APIs, no proprietary services.
- **LLM models**: `qwen2.5:3b` (chat/summarization/relationship & claims extraction) + `nomic-embed-text` (embeddings, 768-dim), both via Ollama. Note: `llama3.1:8b` was originally planned but `qwen2.5:3b` is used on 8GB RAM machines.
- **NER model**: `urchade/gliner_small-v2.1` via GLiNER — zero-shot NER, multilingual by default (~166 MB, CPU). Used in `nlp` and `hybrid` extraction modes.
- **Extraction modes**: `"llm"` (all LLM, ~18s/chunk), `"nlp"` (GLiNER + co-occurrence, <0.5s/chunk), `"hybrid"` (GLiNER entities + LLM relationships/claims, ~12s/chunk). Hybrid is the recommended default.
- **Storage**: SQLite + sqlite-vec (vector) + SQLite graph tables (entities/relationships) + NetworkX (in-memory batch algorithms).
- **No separate graph DB**: Graph stored in SQLite tables, loaded into NetworkX for batch computations (PageRank, community detection, centrality).
- **Triple-factor retrieval**: `final_score = 0.6 * semantic_similarity + 0.2 * temporal_decay + 0.2 * graph_centrality`
- **Temporal decay**: `0.5 ^ (age_days / half_life)` with content-type-aware half-lives (news: 7d, papers: 30d, reference: 365d).
- **Five-level summarization pipeline**: Item compression (overnight) → Topic clustering via Leiden/Louvain (overnight) → Landscape mapping (overnight) → Query-driven synthesis (real-time) → Progressive detail (real-time).

## Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3.12+ (dev environment uses 3.14) |
| Web framework | FastAPI + Uvicorn |
| Frontend | Jinja2 + HTMX + Tailwind CSS (CDN) + Cytoscape.js |
| Database | SQLite + sqlite-vec |
| Graph algorithms | NetworkX + python-louvain |
| Graph visualization | Cytoscape.js (standalone HTML, opened via `webbrowser.open()`) |
| LLM runtime | Ollama (host-native) |
| Scheduling | APScheduler |
| Sources (MVP) | feedparser (RSS), httpx (HN Algolia API), arxiv (PyPI) |
| PDF extraction | pymupdf (full arXiv paper text) |
| HTML extraction | trafilatura |
| NER (entity extraction) | GLiNER (`gliner_small-v2.1`, zero-shot, multilingual) |
| Language detection | langdetect |
| Text chunking | langchain-text-splitters |
| Packaging | Docker + docker-compose |
| Package mgmt | uv |
| Linting | ruff |

## Project Structure

```
daily-knowledge-ingestion-assistant/
├── CLAUDE.md                          # This file
├── .gitignore
├── .venv/                             # Python virtual environment (not in git)
├── docs/
│   ├── architecture-plan.md           # Full architecture (schema, pipeline, implementation steps)
│   ├── market-research.md             # Competitive landscape + problem statement
│   └── design-concepts/
│       ├── concept-a-observatory.html # Dark + amber, constellation graph
│       ├── concept-b-morning-edition.html # Editorial warmth, parchment graph
│       └── concept-c-briefing-room.html   # Intelligence analyst, structured graph
├── notebooks/                         # GraphRAG prototyping notebooks
│   ├── 01_graphrag_extraction.ipynb   # Document chunking, entity/relationship/claims extraction
│   ├── 02_graph_construction_communities.ipynb  # NetworkX graph, PageRank, Louvain communities, community summaries, SQLite, Cytoscape.js viz
│   └── 03_embeddings_vector_search.ipynb        # Embeddings, sqlite-vec, triple-factor retrieval
└── (src/, tests/, Dockerfile, etc. — not yet created)
```

## Key Documents

- **Architecture plan**: `docs/architecture-plan.md` — Full DDL schema, 10-step implementation sequence, project structure, verification plan.
- **Market research**: `docs/market-research.md` — 30+ commercial products, 25+ open-source projects analyzed. Competitive benchmark matrix. Problem statement.
- **Design concepts**: `docs/design-concepts/` — Three self-contained HTML mockups showing the split-pane Navigator + Visualization Platform layout with different visual identities. Open in browser to view.
- **GraphRAG notebooks**: `notebooks/` — Working prototypes of the core pipeline. See `notebooks/README.md` for kernel setup, learnings, and production transition guide.

## GraphRAG Notebooks

The notebooks implement Microsoft's GraphRAG methodology ([arXiv:2404.16130](https://arxiv.org/abs/2404.16130)) adapted for local LLM execution.

| Notebook | Purpose | Key Operations |
|----------|---------|----------------|
| `01_graphrag_extraction.ipynb` | Multi-Source → Knowledge | Fetch 7 sources (arXiv full PDFs + web), chunking (600 tokens), configurable `EXTRACTION_MODE` (`llm`/`nlp`/`hybrid`), GLiNER zero-shot NER for entity extraction in nlp/hybrid modes, LLM for relationships/claims, retry + skip-on-error, cross-document entity merge by exact name, semantic entity grouping via nomic-embed-text embeddings + cosine similarity + Union-Find (non-destructive overlay), configurable source limits (`ARXIV_LIMIT`/`WEB_LIMIT`) |
| `02_graph_construction_communities.ipynb` | Knowledge → Graph + Viz | NetworkX DiGraph with source provenance, PageRank, Louvain community detection, LLM community summaries, SQLite storage, standalone Cytoscape.js HTML visualization with community summaries + chunk expansion + compound node visualization of semantic entity groups (Cytoscape.js parent nodes) |
| `03_embeddings_vector_search.ipynb` | Graph → Retrieval | nomic-embed-text embeddings, sqlite-vec storage, content-type-aware temporal decay, triple-factor retrieval, cross-domain Navigator queries |

**Pipeline flow:**
```
7 Sources (arXiv Full PDFs + Web) → Chunks → Entities (GLiNER or LLM) / Relations (LLM or co-occurrence) / Claims (LLM) [configurable mode] → Cross-Doc Merge (exact name) → Semantic Grouping (embedding similarity overlay) → Graph → Communities → Community Summaries → SQLite → Cytoscape.js HTML Viz → Embeddings → Content-Type-Aware Triple-Factor Retrieval
```

**Triple-factor retrieval formula:**
```
final_score = 0.6 * semantic_similarity + 0.2 * temporal_decay + 0.2 * graph_centrality
```

**Generated artifacts (gitignored):**
- `notebooks/extraction_results.json` — Extracted entities, relationships, claims, entity-chunk provenance map
- `notebooks/graphrag.db` — SQLite database with graph + vectors
- `notebooks/knowledge_graph.html` — Interactive Cytoscape.js graph visualization with community summaries + chunk expansion

## Current State

- **Phase**: Prototyping (multi-source GraphRAG pipeline validated)
- **What exists**:
  - Documentation + 3 UI design concept mockups
  - Working multi-source GraphRAG pipeline in Jupyter notebooks (7 sources → extraction → graph → viz → embeddings → content-type-aware retrieval)
  - Full arXiv PDF content extraction via pymupdf (not just abstracts)
  - Configurable source limits (`ARXIV_LIMIT`/`WEB_LIMIT`) for fast debugging with single source
  - Retry logic (2 attempts) and skip-on-error resilience in extraction pipeline
  - Configurable extraction modes: `"llm"` (all LLM), `"nlp"` (GLiNER + co-occurrence), `"hybrid"` (GLiNER entities + LLM relationships/claims, recommended default)
  - GLiNER zero-shot NER (`gliner_small-v2.1`) — multilingual entity extraction, ~300x faster than LLM, no per-language model downloads
  - Two-layer entity refinement: exact-name merge + semantic similarity grouping (nomic-embed-text embeddings, cosine similarity, Union-Find — non-destructive overlay for compound node visualization)
  - Entity-to-chunk provenance mapping (trace any entity back to its exact source text passages)
  - Standalone Cytoscape.js HTML visualization (dark theme, community colors, PageRank sizing, interactive chunk expansion, community summaries in sidebar and legend)
  - Compound node visualization: semantic entity groups rendered as Cytoscape.js parent containers (quarks inside protons) with MAX_COMPOUND_SIZE=15 filter
  - Content-type-aware temporal decay (news: 7d, papers: 30d, reference: 365d)
  - Development environment with Jupyter kernel configured
- **What doesn't exist yet**: Production code (src/), Dockerfile, pyproject.toml, FastAPI server
- **Next step**: Convert notebook prototypes to production Python modules, then Docker packaging
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

- 3 source connectors: RSS, Hacker News, arXiv (full PDF content via pymupdf)
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

## Development Environment Setup

### Prerequisites

- **macOS** with Apple Silicon (M1/M2/M3/M4)
- **Python 3.12+** (development uses 3.14)
- **Ollama** installed natively (for Metal GPU acceleration)
- **Jupyter Lab** for running prototype notebooks

### Ollama Configuration

Ollama must be configured to run multiple models simultaneously (chat + embeddings).

Required environment variables in `~/.zshrc`:

```bash
export OLLAMA_MAX_LOADED_MODELS=2    # Required: run chat + embedding model together
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
export OLLAMA_HOST=0.0.0.0
export OLLAMA_ORIGINS="*"
```

After editing, restart Ollama:
```bash
pkill ollama && source ~/.zshrc && ollama serve
```

### Required Ollama Models

```bash
ollama pull qwen2.5:3b        # Chat/extraction (1.9 GB) - for 8GB RAM machines
ollama pull nomic-embed-text  # Embeddings (274 MB, 768-dim)

# Alternative for 16GB+ RAM machines:
# ollama pull llama3.1:8b     # Better quality chat model (~5 GB)
```

### Python Virtual Environment

```bash
# Create environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install ipykernel httpx langchain-text-splitters networkx python-louvain scipy sqlite-vec arxiv trafilatura pymupdf gliner langdetect
```

### Jupyter Kernel Registration

Register the project environment as a Jupyter kernel:

```bash
source .venv/bin/activate
python -m ipykernel install --user --name=dkia-graphrag --display-name="DKIA GraphRAG"
```

Verify kernel is registered:
```bash
jupyter kernelspec list
```

Expected output includes:
```
dkia-graphrag    /Users/<user>/Library/Jupyter/kernels/dkia-graphrag
```

### Running the Notebooks

1. Start Ollama: `ollama serve`
2. Start Jupyter Lab: `jupyter lab`
3. Open notebooks in order (01 → 02 → 03)
4. Select kernel: "DKIA GraphRAG"

### Dependencies Summary

| Package | Purpose |
|---------|---------|
| httpx | Ollama API calls |
| langchain-text-splitters | Document chunking (600 tokens, 100 overlap) |
| networkx | Graph construction and algorithms |
| python-louvain | Community detection (Louvain algorithm) |
| numpy | Cosine similarity matrix for semantic entity dedup |
| scipy | Required by NetworkX for PageRank |
| sqlite-vec | Vector storage and similarity search |
| ipykernel | Jupyter kernel support |
| arxiv | Fetch arXiv papers by ID |
| pymupdf | Extract text from arXiv PDF papers |
| trafilatura | Extract article text from web pages |
| gliner | Zero-shot NER — multilingual entity extraction (`gliner_small-v2.1`, ~166 MB, CPU) |
| langdetect | Per-document language detection (metadata for export) |

### Hardware Notes

**8GB RAM machines (Mac mini M1):**
- Use `qwen2.5:3b` instead of `llama3.1:8b`
- Both models fit: ~2GB (chat) + ~0.5GB (embeddings) = ~2.5GB
- Set `OLLAMA_MAX_LOADED_MODELS=2` to avoid model swapping

**16GB+ RAM machines:**
- Can use `llama3.1:8b` for better extraction quality
- Consider `mxbai-embed-large` (1024-dim) for better embeddings

## GitHub Wiki

The project maintains a GitHub Wiki that documents the evolution of the product — each phase of development, the design decisions, and the complex logic behind them. The wiki is intended for users to follow along with how the product is being built.

### Wiki Workflow

- **Location:** The wiki is a separate git repo at `pachocamacho1990/daily-knowledge-ingestion-assistant.wiki.git`
- **Clone to edit:** `cd /tmp && gh repo clone pachocamacho1990/daily-knowledge-ingestion-assistant.wiki`
- **Working directory:** `/tmp/daily-knowledge-ingestion-assistant.wiki/`
- **Push after edits:** `cd /tmp/daily-knowledge-ingestion-assistant.wiki && git add -A && git commit -m "..." && git push origin master`

### Wiki Structure

The wiki is organized by phases. Each phase has an overview page and sub-pages for deep dives:

```
Home.md                              # Project overview, phase tracker, navigation
Phase-0:-Research-and-Vision.md      # Problem statement, philosophy, motivation
  ├── Market-Landscape.md            # Competitive analysis, gap analysis
  ├── Architecture-Vision.md         # System design, deployment model, schema
  └── Design-Explorations.md         # Three visual identity concepts
Phase-1:-GraphRAG-Engine.md          # GraphRAG pipeline prototyping
  ├── GraphRAG-Pipeline-Architecture.md
  ├── Multi-Source-Ingestion.md
  ├── Knowledge-Graph-and-Communities.md
  ├── Triple-Factor-Retrieval.md
  └── Key-Learnings-and-Design-Decisions.md
```

### Wiki Conventions

- **Every completed phase gets wiki documentation.** When a phase of work is finished, create wiki pages documenting what was built, why, and what was learned.
- **Phase pages must include development dates.** Each phase overview page shows `> **Dates:** Month Day – Day, Year` in the header. The Home page phase tracker includes a Dates column.
- **Navigation links:** Every page ends with `← [[Previous Page]] | [[Next Page]] →` footer navigation. The Home page has a full navigation index.
- **GitHub Wiki filenames:** Use dashes for spaces, colons for phase prefixes (e.g., `Phase-1:-GraphRAG-Engine.md`). GitHub renders these as page titles.
- **Tone:** Explain the "why" behind decisions, not just the "what." The wiki tells the story of the product's evolution for someone following along.
- **No emojis** in wiki content unless the user explicitly requests them.

### Plan File Lifecycle

Implementation plans are stored as temporary markdown files (`PLAN_*.md`) near the code they affect (e.g., `notebooks/PLAN_semantic_group_visualization.md`). These files are gitignored.

**Lifecycle:**
1. **Create**: When a task is too large for the current session, write a self-contained plan file with full context, code snippets, anchor strings, and verification steps — enough for a fresh session to execute without prior context.
2. **Execute**: A subsequent session reads the plan file and implements it step by step.
3. **Document**: Once the plan is fully implemented and verified, translate the key insights, design decisions, and learnings into the appropriate GitHub Wiki pages (following Wiki Conventions above).
4. **Delete**: Remove the `PLAN_*.md` file. The plan's value now lives in the wiki and the code itself.

**Convention**: Never leave stale plan files in the repo. A plan file means "work in progress." If the plan is abandoned, delete it. If it's completed, wiki-fy and delete it.

## Git Conventions

- SSH signing enabled (gpg.format=ssh, commit.gpgsign=true)
- Merge strategy: rebase + delete branch (`gh pr merge <n> --rebase --delete-branch`)
- Always check latest release tag before versioning (`gh release list --limit 5`)

## Changelog

- **Feb 6, 2026**: Initial architecture plan and market research created
- **Feb 11, 2026**: Three UI design concept mockups (Observatory, Morning Edition, Briefing Room)
- **Feb 13, 2026**: Vision refined to conversational Navigator + graph Visualization Platform. Both docs fully rewritten. Problem statement added to market research.
- **Feb 13, 2026**: Design concepts updated to split-pane layout matching new vision
- **Feb 15, 2026**: GraphRAG prototyping phase:
  - Created `feature/graphrag-backend-engine` branch
  - Built 3 Jupyter notebooks implementing full GraphRAG pipeline
  - Set up Python venv with Jupyter kernel (`dkia-graphrag`)
  - Validated: entity extraction, graph construction, community detection, embeddings, triple-factor retrieval
  - Documented development environment setup (Ollama config, dependencies, kernel registration)
- **Feb 15, 2026**: Multi-source pipeline + interactive visualization:
  - Expanded notebook 01 from 1 hardcoded doc to 7 sources (4 arXiv + 3 web) with offline fallbacks
  - Added cross-document entity merging and source provenance tracking
  - Added entity-to-chunk provenance map (`entity_chunk_map`) in extraction results
  - Added sources table to SQLite schema with source_refs on entities and source_ref on chunks
  - Implemented content-type-aware temporal decay in notebook 03 (news: 7d, papers: 30d, reference: 365d)
  - Added cross-domain test queries spanning AI, biology, climate, astrophysics, neuroscience, economics, space
  - Installed new dependencies: arxiv, trafilatura
- **Feb 15, 2026**: Standalone Cytoscape.js visualization (replaced ipycytoscape):
  - Replaced ipycytoscape Jupyter widget with standalone HTML using Cytoscape.js CDN (3.30.4)
  - Dark theme (#0a0a0f), amber accents, COSE force-directed layout, community color-coded nodes
  - Interactive chunk expansion: click entity → see source text chunks as nodes with hover tooltips
  - Sidebar with node info panel, expandable chunk cards, community legend, graph controls
  - Opened via `webbrowser.open()` — works regardless of JupyterLab widget compatibility
  - Removed ipycytoscape and ipywidgets dependencies
- **Feb 15, 2026**: Community summaries in visualization:
  - Moved visualization to end of notebook 02 (Step 7) so LLM community summaries are available
  - Pipeline order: Load → Graph → Metrics → Communities → Summaries → SQLite → Visualization
  - Legend shows community titles (from LLM summaries) instead of just IDs
  - Clicking entity shows its community summary (title, executive summary, key insights) in sidebar
  - Clicking community in legend shows full summary with member list
- **Feb 15, 2026**: GitHub Wiki created:
  - Phase 0: Research & Vision (4 pages — problem statement, market landscape, architecture vision, design explorations)
  - Phase 1: GraphRAG Engine (6 pages — pipeline architecture, multi-source ingestion, knowledge graph, triple-factor retrieval, key learnings)
  - Home page with phase tracker, navigation, and development dates
- **Feb 16, 2026**: Full PDF extraction and pipeline resilience:
  - Replaced arXiv abstract-only fetch with full PDF download + pymupdf text extraction (~90K chars per paper vs ~1.5K)
  - Added `ARXIV_LIMIT`/`WEB_LIMIT` source controls for single-source debugging
  - Added retry logic (2 attempts, 180s timeout) in `chat_ollama` for timeout/HTTP errors
  - Added skip-on-error resilience: failed chunks are skipped with diagnostics, pipeline continues
  - Benchmarked LLM extraction: ~17.8s/chunk avg, ~62 min per paper, ~6.5 hours for all 7 sources
  - Installed pymupdf dependency
  - Wiki: added knowledge graph screenshot to Knowledge-Graph-and-Communities page
  - Wiki: added LLM extraction performance benchmarks and improvement roadmap to Key-Learnings page
- **Feb 16, 2026**: Hybrid extraction mode with GLiNER:
  - Added configurable `EXTRACTION_MODE` flag: `"llm"`, `"nlp"`, `"hybrid"` (recommended default)
  - Integrated GLiNER (`urchade/gliner_small-v2.1`) for zero-shot NER entity extraction in nlp/hybrid modes
  - GLiNER is multilingual by default — single model handles English, Spanish, and more (no per-language model downloads)
  - Entity types specified at inference time matching project schema directly (person, organization, location, event, product, date, money, concept)
  - Hybrid mode: GLiNER entities (~300x faster than LLM) + LLM relationships + LLM claims
  - NLP mode: GLiNER entities + co-occurrence relationships (entities in same sentence), no claims
  - Added per-document language detection via langdetect (metadata export; GLiNER handles multilingual natively)
  - spaCy incompatible with Python 3.14 (pydantic v1 dependency) — GLiNER chosen as superior alternative
  - Installed gliner, langdetect; uninstalled spaCy
- **Feb 16, 2026**: Semantic entity grouping (non-destructive overlay):
  - Added Step 7 to notebook 01: semantic grouping layer on top of exact-name dedup
  - Embeds all entities with nomic-embed-text, computes cosine similarity matrix via numpy
  - Union-Find groups transitively similar entities (A~B, B~C → all in one group)
  - Configurable `SIMILARITY_THRESHOLD` (default 0.85) with top-25 similar pairs preview for tuning
  - Original entities, relationships, claims, provenance maps all preserved unchanged
  - Produces `semantic_entity_groups` list + `entity_to_semantic_group` lookup map
  - Exported in extraction_results.json for notebook 02 compound node visualization (quarks inside protons)
- **Feb 16, 2026**: Semantic entity group compound node visualization in notebook 02:
  - Semantic groups from notebook 01 rendered as Cytoscape.js compound/parent nodes
  - Dashed lime-green containers with member entities nested inside
  - MAX_COMPOUND_SIZE=15 filter excludes oversized groups (4 of 123 groups)
  - Click compound node: sidebar shows canonical name, member list, similarity scores
  - Entity info sidebar shows semantic group badge when entity belongs to a group
  - Backward compatible: gracefully handles zero groups or missing keys
