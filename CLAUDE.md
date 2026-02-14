# CLAUDE.md - DKIA Project Instructions

> Last updated: February 14, 2026
> Version: 0.1.0 (MVP-0)

## What Is This Project

**Daily Knowledge Ingestion Assistant (DKIA)** — A personal knowledge navigation system that ingests content from multiple sources, builds a knowledge base, and presents it through a conversational AI interface.

**MVP-0 (current)**: Manual-first ingestion — user pastes URLs or raw text, system processes in background (fetch → summarize → embed), then user asks questions via the Navigator chat powered by semantic RAG.

**Future vision**: Knowledge graphs, community detection, Cytoscape.js visualization, automated source ingestion (RSS, HN, arXiv).

**Core belief**: This is about the future of education — optimizing how humans learn from large volumes of data.

## Key Architecture Decisions

- **Deployment**: Docker container on Apple Silicon Mac. Ollama runs **natively on the host** (not in Docker) to leverage Metal GPU. Container connects via `host.docker.internal:11434`.
- **sqlite-vec**: Built from source in Docker (amalgamation release) due to broken aarch64 linux binaries in both pip package and GitHub releases.
- **100% open-source**: No paid APIs, no proprietary services.
- **LLM models**: `llama3.1:8b` (chat/summarization) + `nomic-embed-text` (embeddings, 768-dim), both via Ollama.
- **Storage**: SQLite + sqlite-vec (vector search). WAL mode, Row factory.
- **Background processing**: `asyncio.Queue` + single worker coroutine. Sequential processing (Ollama is single-GPU).
- **Ingestion model**: Manual URL/text submission (like NotebookLM). User is the curator.
- **Retrieval**: Semantic-only (sqlite-vec KNN). Triple-factor retrieval deferred to future iteration.
- **Content truncation**: 6000 chars max (fits llama3.1:8b 8K context with prompts).

## Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3.12 |
| Web framework | FastAPI + Uvicorn |
| Frontend | Jinja2 + Tailwind CSS (CDN) |
| Database | SQLite + sqlite-vec (built from source) |
| LLM runtime | Ollama (host-native) |
| HTTP client | httpx (async) |
| HTML extraction | trafilatura |
| SSE streaming | sse-starlette + fetch ReadableStream |
| Packaging | Docker + docker-compose |
| Package mgmt | uv |
| Linting | ruff |

## Project Structure

```
daily-knowledge-ingestion-assistant/
├── CLAUDE.md                              # This file
├── .gitignore
├── pyproject.toml                         # Dependencies, build config
├── Dockerfile                             # Python 3.12-slim + sqlite-vec from source
├── docker-compose.yml                     # Port 8000, volume mounts, Ollama host
├── .env.example                           # Environment variables template
├── scripts/
│   └── setup_ollama.sh                    # Pull required Ollama models
├── src/
│   ├── __init__.py
│   ├── main.py                            # FastAPI app, lifespan, route wiring
│   ├── config.py                          # pydantic-settings (ollama_host, models, db)
│   ├── schema.sql                         # DDL for items, processed_items, conversations, chat_messages
│   ├── database.py                        # get_connection(), init_db(), sqlite-vec loading
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── client.py                      # OllamaClient (chat, chat_stream, embed, health_check)
│   │   └── prompts.py                     # System prompts for summarization + navigation
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── fetcher.py                     # submit_url(), submit_text(), URL dedup
│   │   └── text_extractor.py              # clean_text(), estimate_reading_time()
│   ├── processing/
│   │   ├── __init__.py
│   │   ├── summarizer.py                  # summarize_item() → JSON (summary, key_points, categories)
│   │   ├── embedder.py                    # generate_and_store_embedding() → vec0 table
│   │   └── pipeline.py                    # process_item(), process_worker() (asyncio.Queue)
│   ├── navigator/
│   │   ├── __init__.py
│   │   ├── retriever.py                   # retrieve_relevant_items() → sqlite-vec KNN
│   │   ├── prompts.py                     # format_context_items()
│   │   └── agent.py                       # NavigatorAgent.chat_stream() with auto-titling
│   └── web/
│       ├── __init__.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── navigator.py               # GET /, POST /chat (SSE), GET /conversations
│       │   └── library.py                 # GET /library, POST submit-url/submit-text, DELETE items
│       ├── templates/
│       │   ├── base.html                  # Observatory dark theme, Tailwind CDN
│       │   ├── navigator.html             # Full-screen chat with conversation selector
│       │   ├── library.html               # URL/text input + item list with status badges
│       │   └── components/
│       │       ├── nav.html               # Top nav bar (Navigator / Library)
│       │       └── chat_message.html      # Chat bubble component
│       └── static/
│           ├── chat.js                    # SSE via fetch + ReadableStream, markdown rendering
│           └── library.js                 # Submit URL/text, polling status updates
├── tests/
│   ├── __init__.py
│   └── conftest.py                        # Test fixtures (TestClient, temp DB)
└── docs/
    ├── architecture-plan.md               # Full architecture (future vision)
    ├── market-research.md                 # Competitive landscape + problem statement
    └── design-concepts/                   # Three UI mockup concepts
```

## Current State

- **Phase**: MVP-0 implemented
- **What works**: Docker build, FastAPI startup, DB schema init, sqlite-vec loaded, URL/text ingestion, background processing queue, Navigator chat (SSE streaming), Library page with status polling, Observatory dark theme UI
- **Requires**: Ollama running on host with `llama3.1:8b` and `nomic-embed-text` models
- **Known issue**: sqlite-vec pip package ships broken 32-bit ARM binary for linux/aarch64 — solved by building from amalgamation source in Dockerfile

## Build / Test / Lint Commands

- Setup Ollama: `./scripts/setup_ollama.sh` (run on host, pulls required models)
- Build: `docker-compose build`
- Run: `docker-compose up` (app at http://localhost:8000)
- Lint: `ruff check src/`
- Test: `pytest tests/`
- Single test: `pytest tests/path/to/test.py::test_function`
- Health: `curl localhost:8000/health`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Navigator chat page |
| POST | `/chat` | SSE streaming chat (JSON body: message, conversation_id) |
| GET | `/conversations` | List conversations |
| GET | `/conversations/{id}/messages` | Get conversation messages |
| GET | `/library` | Library page |
| POST | `/library/submit-url` | Submit URL for processing |
| POST | `/library/submit-text` | Submit raw text for processing |
| GET | `/library/items` | Get all items with status |
| GET | `/library/status` | Polling endpoint for status updates |
| DELETE | `/library/items/{id}` | Delete an item |
| GET | `/health` | Health check (DB + Ollama status) |

## Git Conventions

- SSH signing enabled (gpg.format=ssh, commit.gpgsign=true)
- Merge strategy: rebase + delete branch (`gh pr merge <n> --rebase --delete-branch`)
- Always check latest release tag before versioning (`gh release list --limit 5`)

## Changelog

- **Feb 6, 2026**: Initial architecture plan and market research created
- **Feb 11, 2026**: Three UI design concept mockups (Observatory, Morning Edition, Briefing Room)
- **Feb 13, 2026**: Vision refined to conversational Navigator + graph Visualization Platform
- **Feb 13, 2026**: Design concepts updated to split-pane layout matching new vision
- **Feb 14, 2026**: MVP-0 implemented — manual ingestion, background processing, Navigator RAG chat, Library UI, Observatory dark theme. 37 files, Docker build verified on Apple Silicon.
