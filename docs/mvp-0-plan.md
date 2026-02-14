# MVP-0: The Conversational Core

## Context

DKIA's full vision has 10 implementation steps covering knowledge graphs, community detection, graph visualization, and multi-source ingestion. MVP-0 strips to the core loop that matches the user's real workflow: **find interesting content during the day → send it to the system → ask questions about it later**.

The ingestion model is **manual-first** (like NotebookLM): the user pastes URLs or text directly. No RSS feeds, no automated collection. The user is the curator. Processing happens in the background so the user can keep adding content without waiting.

Future iteration: automatic browser tab ingestion.

## Scope

**In**: Manual URL/text submission, background processing queue, Level 1 summarization, semantic-only RAG chat with SSE streaming, Library page, Observatory dark theme UI.
**Out**: RSS/HN/arXiv collectors, knowledge graph, Cytoscape.js, community detection, temporal decay, graph centrality, APScheduler.

## User Flow

1. User finds an interesting article → pastes URL into DKIA
2. System immediately fetches content, shows it in Library as "processing..."
3. Background: extract text → summarize → embed (~30s per item)
4. Library shows item flip to "done" with summary preview
5. User keeps pasting more URLs (or raw text for paywalled content)
6. Later: opens Navigator → asks questions → gets answers grounded in their curated knowledge base

## 7 Implementation Steps

### Step 1: Project Scaffolding + Docker
**Files**: `pyproject.toml`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `src/__init__.py`, `src/main.py`, `src/config.py`, `scripts/setup_ollama.sh`

- `pyproject.toml`: fastapi, uvicorn, pydantic-settings, httpx, jinja2, trafilatura, sqlite-vec, sse-starlette, python-multipart. Dev: pytest, pytest-asyncio, ruff. Build: hatchling. Package mgmt: uv. **No feedparser** (no RSS).
- `Dockerfile`: python:3.12-slim, COPY uv from ghcr.io/astral-sh/uv, `uv pip install --system`
- `docker-compose.yml`: port 8000, mount `./data` (persistence) + `./src` (live reload), `OLLAMA_HOST=http://host.docker.internal:11434`, extra_hosts for Linux
- `src/main.py`: FastAPI with lifespan (DB init), `/health` endpoint
- `src/config.py`: pydantic-settings — ollama_host, models, database_path, embedding_dim=768

**Verify**: `docker-compose up` → `curl localhost:8000/health` returns `{"status":"ok"}`

### Step 2: Database Layer
**Files**: `src/schema.sql`, `src/database.py`

Simplified schema — no `sources` table. Items are submitted directly by the user.

```sql
-- Knowledge items (submitted by user)
items (id, url, title, content_text, content_html, status, submitted_at, processed_at)
  -- status: 'pending' | 'processing' | 'done' | 'error'

-- Processed items (Level 1 summaries)
processed_items (id, item_id, summary, key_points JSON, categories JSON, relevance_score, content_type, reading_time_minutes, processed_at)

-- Embeddings (sqlite-vec virtual table)
item_embeddings (item_id PK, embedding FLOAT[768])

-- Chat
conversations (id, title, started_at, last_message_at)
chat_messages (id, conversation_id, role, content, context_item_ids JSON, created_at)
```

- `database.py`: `get_connection()` (WAL mode, Row factory, sqlite-vec loaded) + `init_db()` (schema.sql + vec0 table)
- Wire into FastAPI lifespan

**Verify**: Tables created on startup, idempotent on restart, `./data/dkia.db` persists.

### Step 3: Ollama Integration
**Files**: `src/llm/__init__.py`, `src/llm/client.py`, `src/llm/prompts.py`

- `OllamaClient` (async httpx): `chat()` (non-streaming, optional `format="json"`), `chat_stream()` (yields chunks), `embed()` (batch), `health_check()`
- Endpoints: `/api/chat`, `/api/embed`. 120s timeout.
- `prompts.py`: `SUMMARIZE_ITEM_SYSTEM` (→ JSON: summary, key_points, categories, relevance_score, content_type), `SUMMARIZE_ITEM_USER` (title + content), `NAVIGATOR_SYSTEM` (synthesis with citations), `NAVIGATOR_USER_WITH_CONTEXT` / `NAVIGATOR_USER_NO_CONTEXT`
- Module singleton: `ollama_client`
- `/health` reports Ollama connectivity

**Verify**: Chat, embed, stream all work from inside container.

### Step 4: Content Ingestion
**Files**: `src/ingestion/__init__.py`, `src/ingestion/fetcher.py`, `src/ingestion/text_extractor.py`

This replaces the RSS collector. Two ingestion modes:

- **URL mode**: User pastes a URL → `fetcher.py` fetches with httpx (async, follow redirects, 30s timeout) → extracts title from HTML `<title>` → extracts clean text via trafilatura → stores in `items` table with status='pending'
- **Text mode**: User pastes raw text + optional title → stored directly in `items` with status='pending' (for paywalled content, PDFs copied text, etc.)

`text_extractor.py`: Clean and truncate text (6000 chars max), estimate reading time.

URL dedup: UNIQUE constraint on `url` column. If same URL submitted again, return existing item.

**Verify**: Submit URL → item appears in `items` table with extracted content. Submit same URL → no duplicate.

### Step 5: Processing Pipeline + Background Queue
**Files**: `src/processing/__init__.py`, `src/processing/summarizer.py`, `src/processing/embedder.py`, `src/processing/pipeline.py`

- `summarizer.py`: `summarize_item()` → `ollama_client.chat(format="json", temperature=0.3)` → parse/validate JSON → defaults on failure
- `embedder.py`: `generate_and_store_embedding()` → embed (title + summary) → struct.pack to blob → INSERT OR REPLACE into vec0
- `pipeline.py`: `process_item(item_id)` → update status='processing' → extract text → summarize → store processed_item → embed → update status='done'. On error: status='error'.

**Background queue**: Use `asyncio.create_task()` managed via FastAPI lifespan. A simple in-memory queue (`asyncio.Queue`) with a single worker coroutine that processes items sequentially (Ollama is single-GPU, no benefit from parallel). The worker runs continuously in the background.

```python
# In main.py lifespan:
queue = asyncio.Queue()
worker_task = asyncio.create_task(process_worker(queue))
# On shutdown:
worker_task.cancel()
```

When user submits a URL/text → item stored with status='pending' → `queue.put(item_id)` → worker picks it up → processes → status='done'.

**Verify**: Submit item → status goes pending → processing → done. Embeddings populated. Re-processing skipped.

### Step 6: Navigator / RAG Chat
**Files**: `src/navigator/__init__.py`, `src/navigator/retriever.py`, `src/navigator/prompts.py`, `src/navigator/agent.py`, `src/web/__init__.py`, `src/web/routes/__init__.py`, `src/web/routes/navigator.py`

- `retriever.py`: `retrieve_relevant_items(query, top_k=5)` → embed query → sqlite-vec KNN (`WHERE embedding MATCH ? AND k = ?`) → JOIN items + processed_items → return enriched results
- `navigator/prompts.py`: `format_context_items()` → numbered blocks with title, summary, key points, URL
- `agent.py`: `NavigatorAgent.chat_stream()` → store user msg → retrieve context → build messages (system + history[10] + user with context) → stream via ollama → store assistant msg → auto-title conversation
- `routes/navigator.py`: `POST /chat` → SSE (sse-starlette). Events: message/done/error. Plus `GET /conversations`, `GET /conversations/{id}/messages`

**Verify**: Chat streams grounded responses with citations. Conversations persist across messages.

### Step 7: Web UI (Navigator + Library)
**Files**: `src/web/routes/library.py`, `src/web/templates/base.html`, `src/web/templates/navigator.html`, `src/web/templates/library.html`, `src/web/templates/components/nav.html`, `src/web/templates/components/chat_message.html`, `src/web/static/chat.js`, `src/web/static/library.js`, `tests/conftest.py`

**Theme**: Observatory dark — void `#0a0e1a`, surface `#111827`, card `#1a2236`, amber accent `#f5a623`. Inter + JetBrains Mono. Tailwind CSS CDN.

**Navigator page** (`/`): Full-screen chat. AI messages with amber left accent bar. User messages amber-tinted right-aligned. Pulsing cursor typing indicator. Simple markdown rendering (bold, citation badges, paragraphs).

**Library page** (`/library`):
- Top: URL input field + "Add" button. Text input area (collapsible) for pasting raw text.
- Below: List of all items, newest first. Each item shows:
  - Status badge: pending (gray pulse), processing (amber pulse), done (green), error (red)
  - Title, URL, submitted time
  - When done: summary preview, categories as colored pills, relevance score
  - Delete button
- HTMX: form submission adds item + triggers background processing, polling or SSE updates status badges

**chat.js**: fetch + ReadableStream for POST SSE. Content accumulation with simple markdown. XSS-safe.

**library.js**: Submit URL/text via fetch. Poll `/library/status` every 3s to update item statuses (simple approach; SSE for status updates can be added later).

Wire all routes + static files in `src/main.py`. `GET /` → navigator, `GET /library` → library.

**Verify**: Full E2E — paste URL in Library → see it process → go to Navigator → ask about it → get answer with citations.

## File Inventory

~37 files:

```
pyproject.toml, Dockerfile, docker-compose.yml, .env.example
src/__init__.py, src/main.py, src/config.py, src/schema.sql, src/database.py
src/llm/__init__.py, src/llm/client.py, src/llm/prompts.py
src/ingestion/__init__.py, src/ingestion/fetcher.py, src/ingestion/text_extractor.py
src/processing/__init__.py, src/processing/summarizer.py, src/processing/embedder.py, src/processing/pipeline.py
src/navigator/__init__.py, src/navigator/retriever.py, src/navigator/prompts.py, src/navigator/agent.py
src/web/__init__.py, src/web/routes/__init__.py
src/web/routes/navigator.py, src/web/routes/library.py
src/web/templates/base.html, src/web/templates/navigator.html, src/web/templates/library.html
src/web/templates/components/nav.html, src/web/templates/components/chat_message.html
src/web/static/chat.js, src/web/static/library.js
scripts/setup_ollama.sh
tests/__init__.py, tests/conftest.py
```

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Ingestion model | Manual URL/text submission | Matches user's real workflow (browser tabs) |
| Background processing | asyncio.Queue + worker task | Simple, no extra infra. Sequential processing (Ollama is single-GPU) |
| Status updates | Polling every 3s | Simple. SSE for push updates is a future enhancement |
| No sources table | Items are first-class, no source abstraction | Simpler schema for manual ingestion. Sources concept returns when RSS/auto-ingestion is added |
| URL dedup | UNIQUE constraint on items.url | DB-level, zero code |
| HTTP client | httpx (async, per-request) | Simple for single-user app |
| SSE for chat | sse-starlette + fetch ReadableStream | Standard for FastAPI streaming; fetch needed for POST |
| Embedding input | title + summary (not raw content) | More semantically rich, distilled by LLM |
| Content truncation | 6000 chars | Fits llama3.1:8b 8K context with prompts |
| Summarizer | temperature=0.3 + format="json" | Consistent structured output |
| sqlite-vec build | Compiled from amalgamation source in Dockerfile | pip package and GitHub releases ship broken 32-bit ARM binaries for linux/aarch64 (Apple Silicon Docker) |

## Verification (End-to-End)

1. `docker-compose build && docker-compose up`
2. Open `http://localhost:8000/library`
3. Paste a URL (e.g. a blog post) → see it appear as "pending"
4. Watch it transition to "processing" → "done" with summary
5. Paste a few more URLs
6. Navigate to `/` (Navigator)
7. Ask "What have I been reading about?"
8. See streaming response with `[1]`, `[2]` citation badges referencing the submitted content
