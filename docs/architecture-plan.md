# Daily Knowledge Ingestion Assistant (DKIA) - Implementation Plan

## Context

Every day there's an ocean of content across papers, newsletters, social media, and bookmarks that's impossible to manually process. This system acts as a personal "knowledge bridge officer" - it ingests content from multiple sources overnight, summarizes and prioritizes it, then presents a curated daily briefing through a local web app with an interactive chat agent for deeper exploration.

**Deployment**: Docker container on a separate Apple Silicon Mac, with Ollama running natively on the host (Docker on macOS lacks Metal GPU access, so Ollama must run on the host for fast inference).

**Guiding principle**: 100% open-source stack. No paid APIs, no proprietary services.

---

## Architecture Overview

```
[macOS Host - Apple Silicon]
    |
    |-- Ollama (native, Metal GPU) ← runs llama3.1:8b + nomic-embed-text
    |       ↑
    |       | http://host.docker.internal:11434
    |       |
    |-- Docker Container (DKIA)
            |-- FastAPI web server (briefing UI + chat)
            |-- APScheduler (cron-like job scheduling)
            |-- Collectors → Processing Pipeline → Briefing Generator
            |-- SQLite + sqlite-vec (storage + vector search)
            |-- Data volume: ./data/ (persisted)
```

**Four logical agents** (Python modules, not separate processes):
1. **Collector Agents** - one per source, fetch raw content
2. **Processor Agent** - summarize, categorize, embed via Ollama
3. **Briefing Agent** - generate daily digest from processed items
4. **Chat Agent** - RAG-powered interactive Q&A over ingested content

---

## Tech Stack (All Open-Source)

| Component | Technology | Purpose |
|---|---|---|
| Language | Python 3.12 | Backend, processing, everything |
| Web framework | FastAPI + Uvicorn | Async API + SSE streaming |
| Frontend | Jinja2 + HTMX + Tailwind CSS (CDN) | Server-rendered, no JS framework |
| Database | SQLite + sqlite-vec | Relational storage + vector search |
| LLM runtime | Ollama (host-native) | Local inference with Metal acceleration |
| LLM models | llama3.1:8b + nomic-embed-text | Chat/summarization + embeddings |
| Scheduling | APScheduler | In-process cron-like scheduling |
| RSS parsing | feedparser | RSS/Atom feed ingestion |
| arXiv | arxiv (PyPI) | Paper metadata + abstracts |
| Hacker News | httpx | Algolia API (public, no auth) |
| Reddit | praw | Reddit API (Phase 2) |
| HTML extraction | trafilatura | Article text from web pages |
| Text chunking | langchain-text-splitters | RAG chunking for long docs |
| Packaging | Docker + docker-compose | Deployment to target Mac |
| Package mgmt | uv | Fast Python dependency management |
| Linting | ruff | Code quality |

---

## MVP Scope (Phase 1) - What We Build First

### 3 Source Connectors
1. **RSS Feeds** - feedparser, no auth, covers blogs/newsletters/Substack
2. **Hacker News** - public Algolia API, no auth, high signal
3. **arXiv** - arxiv library, no auth, abstracts only (skip PDF for MVP)

### Processing Pipeline
- URL-based deduplication (exact match)
- Text extraction via trafilatura (for RSS linked articles)
- Ollama summarization → structured JSON (summary, categories, relevance_score)
- Embedding generation via nomic-embed-text (one per item, title+summary)

### Web UI (3 pages)
1. **Briefing** (`/`) - Today's digest grouped by category, date picker for history
2. **Chat** (`/chat`) - RAG-powered chat with SSE streaming responses
3. **Sources** (`/sources`) - Add/remove/toggle sources, manual "Collect Now" trigger

### Scheduling
- APScheduler with configurable cron (default: 5 AM daily)
- Manual trigger via web UI button

### Deferred to Phase 2
- Reddit, Email, Twitter/X, Browser bookmark connectors
- Full arXiv PDF extraction
- Content-similarity deduplication
- Chunk-level embeddings for long documents
- User preference learning
- launchd system-level scheduling

---

## Database Schema (Key Tables)

- **sources** - configured feeds/queries with type, config JSON, enabled flag
- **raw_items** - ingested content (url, title, content_text, metadata JSON)
- **processed_items** - summaries, categories, relevance_score, content_type
- **embeddings** - sqlite-vec virtual table (768-dim vectors from nomic-embed-text)
- **briefings** - daily digest markdown + structured sections JSON
- **conversations / chat_messages** - chat history with RAG context references
- **user_preferences** - key-value settings for interests and priorities

---

## Project Structure

```
daily-knowledge-ingestion-assistant/
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
├── CLAUDE.md
├── src/
│   ├── main.py                    # FastAPI app + lifespan (DB init, scheduler start)
│   ├── config.py                  # pydantic-settings, reads .env
│   ├── database.py                # SQLite + sqlite-vec init, connection mgmt
│   ├── schema.sql                 # Full DDL
│   ├── collectors/
│   │   ├── base.py                # BaseCollector ABC
│   │   ├── rss_collector.py
│   │   ├── hackernews_collector.py
│   │   ├── arxiv_collector.py
│   │   └── registry.py            # Collector factory
│   ├── processing/
│   │   ├── pipeline.py            # Orchestration: dedup → extract → summarize → embed
│   │   ├── text_extractor.py      # HTML/article → clean text
│   │   ├── summarizer.py          # Ollama structured summarization
│   │   ├── embedder.py            # nomic-embed-text via Ollama
│   │   └── deduplication.py       # URL-exact dedup (MVP)
│   ├── briefing/
│   │   ├── generator.py           # Daily briefing composition
│   │   └── templates.py           # Prompt templates
│   ├── chat/
│   │   ├── agent.py               # Chat orchestration: retrieve → augment → generate
│   │   ├── retriever.py           # sqlite-vec search + re-ranking
│   │   └── prompts.py             # System prompts
│   ├── llm/
│   │   ├── client.py              # Async Ollama wrapper (chat, embed, stream)
│   │   └── prompts.py             # All LLM prompt templates
│   ├── scheduler/
│   │   ├── scheduler.py           # APScheduler setup
│   │   └── jobs.py                # Job definitions (collect, process, brief)
│   └── web/
│       ├── routes/
│       │   ├── briefing.py        # GET /
│       │   ├── chat.py            # GET /chat, SSE streaming
│       │   ├── sources.py         # CRUD sources
│       │   └── triggers.py        # POST /collect, POST /process
│       ├── templates/             # Jinja2 HTML (base, briefing, chat, sources)
│       └── static/
│           └── chat.js            # ~50 lines: SSE handling for streaming chat
├── scripts/
│   ├── setup_ollama.sh            # Pull required models
│   └── seed_sources.py            # Seed example RSS feeds, HN, arXiv queries
├── tests/
│   ├── conftest.py
│   ├── test_collectors/
│   ├── test_processing/
│   ├── test_chat/
│   └── test_web/
└── data/                          # Runtime, .gitignored
    └── dkia.db
```

---

## Implementation Sequence (8 Steps)

| Step | What | Key Files |
|---|---|---|
| **1** | Project scaffolding + Docker | pyproject.toml, Dockerfile, docker-compose.yml, .env.example |
| **2** | Database layer | src/schema.sql, src/database.py, src/config.py |
| **3** | Ollama integration | src/llm/client.py, src/llm/prompts.py, scripts/setup_ollama.sh |
| **4** | First collector (RSS) | src/collectors/base.py, rss_collector.py, registry.py |
| **5** | Processing pipeline | src/processing/pipeline.py, summarizer.py, embedder.py, text_extractor.py |
| **6** | Web UI + briefing | src/main.py, src/web/routes/briefing.py, templates, src/briefing/generator.py |
| **7** | Chat with RAG | src/chat/retriever.py, agent.py, src/web/routes/chat.py, chat.html, chat.js |
| **8** | Remaining collectors + scheduler | hackernews_collector.py, arxiv_collector.py, scheduler.py, sources UI |

---

## Docker Deployment Strategy

```yaml
# docker-compose.yml
services:
  dkia:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data        # Persist SQLite DB
      - ./.env:/app/.env        # Config
    environment:
      - OLLAMA_HOST=host.docker.internal:11434  # Connect to host Ollama
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Ollama runs on the host** (not in Docker) to leverage Apple Silicon Metal GPU. The Docker container connects via `host.docker.internal:11434`.

**Setup on target Mac**:
1. Install Ollama natively → `ollama pull llama3.1:8b && ollama pull nomic-embed-text`
2. Clone repo → `docker-compose up -d`
3. Open `http://localhost:8000`

---

## RAG Chat Implementation

1. User sends question → embed via nomic-embed-text
2. Query sqlite-vec for top-20 nearest chunks
3. Re-rank: `final_score = 0.7 * vector_similarity + 0.3 * relevance_score`
4. Take top-5 results as context
5. Build prompt: system instructions + retrieved context + conversation history + question
6. Stream response from Ollama via SSE (token by token to the browser)

---

## Verification Plan

After each step, verify with:
1. **Step 1-2**: `docker-compose up` starts, DB initializes, tables created
2. **Step 3**: `scripts/setup_ollama.sh` pulls models; Python client can call Ollama for chat + embeddings
3. **Step 4**: RSS collector fetches items from a test feed, stores in raw_items
4. **Step 5**: Pipeline processes raw items → summaries + embeddings in DB
5. **Step 6**: Web UI at localhost:8000 shows briefing with real data
6. **Step 7**: Chat responds with RAG-sourced answers, streaming works in browser
7. **Step 8**: All 3 collectors work, scheduler triggers on cron, sources page functional
8. **End-to-end**: Configure 3+ sources → trigger collect → trigger process → generate briefing → chat about the content
