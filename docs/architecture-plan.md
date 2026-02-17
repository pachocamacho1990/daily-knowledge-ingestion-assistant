# Daily Knowledge Ingestion Assistant (DKIA) - Architecture Plan

> Created: February 6, 2026
> Updated: February 13, 2026

---

## Vision

DKIA is a personal knowledge navigation system built on two core components:

**The Navigator** — A conversational interface where the user directs discovery each morning through questions and intent. The AI has processed everything overnight and guides the user on where to look, why it matters, and how to approach it.

**The Visualization Platform** — A knowledge graph interface that connects all ingested data, references, topics, authors, and temporal relationships as a living, growing map of the user's knowledge universe.

**This is fundamentally about the future of education** — a new way to learn fast and efficiently from large volumes of data.

**Deployment**: Docker container on Apple Silicon Mac, with Ollama running natively on the host for Metal GPU acceleration.

**Guiding principle**: 100% open-source stack. No paid APIs, no proprietary services.

---

## Architecture Overview

```
[macOS Host - Apple Silicon]
    │
    ├── Ollama (native, Metal GPU)
    │     ├── llama3.1:8b          (chat, summarization, entity extraction)
    │     └── nomic-embed-text     (embeddings, 768-dim)
    │           ↑
    │           │ http://host.docker.internal:11434
    │           │
    └── Docker Container (DKIA)
          │
          ├── FastAPI Web Server
          │     ├── Navigator (chat + SSE streaming)
          │     ├── Visualization Platform (graph UI via Cytoscape.js)
          │     └── Sources Management
          │
          ├── Nightly Processing Pipeline
          │     ├── Collectors (RSS, HN, arXiv, ...)
          │     ├── Text Extraction + Deduplication
          │     ├── Level 1: Item Summarization (Ollama)
          │     ├── Entity-Relationship Extraction (Ollama)
          │     ├── Embedding Generation (nomic-embed-text)
          │     ├── Level 2: Topic Clustering (NetworkX - Leiden)
          │     ├── Level 3: Landscape Summarization (Ollama)
          │     └── Graph Metrics (PageRank, centrality → SQLite)
          │
          ├── Navigator Engine (real-time)
          │     ├── Query Embedding (nomic-embed-text)
          │     ├── Triple-Factor Retrieval (semantic + temporal + graph)
          │     ├── Level 4: Query-Driven Synthesis (Ollama)
          │     └── Level 5: Progressive Detail (Ollama)
          │
          ├── Storage Layer
          │     ├── SQLite (relational data + graph tables)
          │     ├── sqlite-vec (vector embeddings)
          │     └── NetworkX (in-memory batch graph algorithms)
          │
          └── APScheduler (cron-like scheduling)
```

### Five Logical Agents

1. **Collector Agents** — One per source type, fetch raw content into `raw_items`
2. **Processor Agent** — Summarize, extract entities/relationships, generate embeddings, build graph
3. **Clustering Agent** — Run community detection, compute graph metrics, generate landscape summaries
4. **Navigator Agent** — Real-time: embed query → triple-factor retrieval → synthesize answer → stream response
5. **Visualization Agent** — Serve graph data to Cytoscape.js, support interactive exploration

---

## Tech Stack (All Open-Source)

| Component | Technology | Purpose |
|---|---|---|
| Language | Python 3.12 | Backend, processing, everything |
| Web framework | FastAPI + Uvicorn | Async API + SSE streaming |
| Frontend | Jinja2 + HTMX + Tailwind CSS (CDN) | Server-rendered Navigator + Sources |
| Graph visualization | Cytoscape.js | Interactive knowledge graph (Visualization Platform) |
| Database | SQLite + sqlite-vec | Relational + vector storage |
| Graph storage | SQLite (entities + relationships tables) | Persistent graph structure |
| Graph algorithms | NetworkX + igraph + leidenalg | Batch: community detection, PageRank, centrality |
| LLM runtime | Ollama (host-native) | Local inference with Metal acceleration |
| LLM models | llama3.1:8b + nomic-embed-text | Chat/summarization/entity extraction + embeddings |
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

## Two-Component UI Model

### Component 1: The Navigator (Chat-First Interface)

The Navigator is the primary interface. On opening the app, the user sees a conversational interface where the AI has a brief opening status line ("47 items processed overnight, 3 new topic clusters detected") and the user drives from there.

**Interaction patterns:**
- User asks about a topic → AI synthesizes from all relevant ingested content with citations
- User asks for state of the art → AI pulls from topic cluster landscape summaries
- User asks "what should I know?" → AI surfaces highest-relevance items with reasoning
- User asks to go deeper → AI returns to raw content for higher-fidelity synthesis
- User asks about connections → AI traverses graph to show cross-source links

**When the AI responds, it can render:**
- Inline citations with source links
- Suggested follow-up questions
- A "Show in graph" button that highlights relevant nodes in the Visualization Platform

### Component 2: The Visualization Platform (Knowledge Graph)

A Cytoscape.js-powered interactive graph that shows:
- **Nodes**: Content items, entities (people, concepts, technologies), topic clusters
- **Edges**: Relationships (cites, same_author, same_topic, discusses, temporal_sequence)
- **Node size**: Proportional to graph centrality (importance)
- **Node color**: By source type or topic cluster
- **Temporal axis**: Optional timeline view or age-based opacity (newer = brighter)
- **Clusters**: Visually grouped by community detection results

**Interaction patterns:**
- Click a node → see summary + metadata in side panel
- Click a cluster → see landscape summary for that topic
- Drag to explore, scroll to zoom
- Search/filter by topic, source, date range
- Navigator can highlight nodes relevant to current conversation

### Layout: Split-Pane

```
+---------------------------+------------------------------+
| NAVIGATOR (Left, ~40%)   | VISUALIZATION (Right, ~60%)  |
|                           |                              |
| [AI]: Good morning. 47   | [Interactive Knowledge Graph] |
| items processed. 3 new   |                              |
| clusters: RAG advances,  |     ●──────●                |
| Rust in ML, local-first  |    / \    / \               |
| apps.                    |   ●   ●──●   ●              |
|                           |    \ /    \ /               |
| [User]: What's new in    |     ●──────●                |
| RAG research?            |                              |
|                           | [Highlighted: RAG cluster]   |
| [AI]: Three developments |                              |
| overnight... [1] [2] [3] | [Side panel: item detail]    |
|                           |                              |
| [Suggested follow-ups:]  |                              |
| • Compare approaches     |                              |
| • Show temporal evolution |                              |
+---------------------------+------------------------------+
```

---

## Five-Level Summarization Pipeline

| Level | When | Input | Output | Stored In |
|-------|------|-------|--------|-----------|
| **1. Item Compression** | Nightly batch | Raw content text | 2-3 sentence summary + categories + relevance score + content type (JSON) | `processed_items` |
| **2. Topic Clustering** | Nightly batch | All entity embeddings | Community assignments, cluster labels | `entities.community_id`, `topic_clusters` |
| **3. Landscape Mapping** | Nightly batch | All items in a cluster | "State of the art" summary per topic cluster | `topic_clusters.landscape_summary` |
| **4. Query Synthesis** | Real-time (Navigator) | User query + retrieved items (top-5) | Targeted answer with citations | `chat_messages` |
| **5. Progressive Detail** | Real-time (Navigator) | User follow-up + raw content | High-fidelity deep dive | `chat_messages` |

---

## Triple-Factor Retrieval Scoring

```
final_score = w1 * semantic_similarity
            + w2 * temporal_decay
            + w3 * graph_centrality
```

Where:
- `semantic_similarity` = cosine similarity between query embedding and item embedding (via sqlite-vec)
- `temporal_decay` = `0.5 ^ (age_days / half_life)` with content-type-aware half-lives (news: 7d, papers: 30d, reference: 365d)
- `graph_centrality` = normalized PageRank score from the knowledge graph

Default weights: `w1=0.6, w2=0.2, w3=0.2` (tunable).

**Retrieval pipeline:**
1. Embed user query via nomic-embed-text
2. Broad vector search: top-20 from sqlite-vec (with optional date pre-filter)
3. Re-rank with triple-factor score
4. Take top-5 for LLM context

---

## Database Schema

### Core Tables (Relational)

```sql
-- Configured sources
CREATE TABLE sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,       -- 'rss', 'arxiv', 'hackernews', 'reddit', 'email', 'twitter', 'browser'
    config JSON NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_fetched_at TEXT,
    fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Raw ingested content
CREATE TABLE raw_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    external_id TEXT,
    url TEXT,
    title TEXT,
    author TEXT,
    content_text TEXT,
    content_html TEXT,
    metadata JSON,
    fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    published_at TEXT,
    is_processed INTEGER NOT NULL DEFAULT 0,
    is_duplicate INTEGER NOT NULL DEFAULT 0,
    UNIQUE(source_id, external_id)
);

-- Processed items (Level 1 summaries)
CREATE TABLE processed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_item_id INTEGER NOT NULL UNIQUE REFERENCES raw_items(id),
    summary TEXT NOT NULL,
    key_points JSON,
    categories JSON NOT NULL,
    relevance_score REAL NOT NULL,        -- 0.0 to 1.0
    content_type TEXT NOT NULL,           -- 'research_paper', 'news', 'discussion', 'tutorial', 'opinion'
    reading_time_minutes INTEGER,
    processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

### Knowledge Graph Tables

```sql
-- Graph nodes: entities extracted from content
CREATE TABLE entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,            -- 'person', 'concept', 'technology', 'organization', 'paper'
    description TEXT,
    properties JSON,
    community_id INTEGER,                 -- assigned by Leiden community detection
    pagerank_score REAL DEFAULT 0.0,      -- computed by NetworkX nightly
    degree_centrality REAL DEFAULT 0.0,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    UNIQUE(name, entity_type)
);

-- Graph edges: relationships between entities
CREATE TABLE relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity_id INTEGER NOT NULL REFERENCES entities(id),
    target_entity_id INTEGER NOT NULL REFERENCES entities(id),
    relation_type TEXT NOT NULL,          -- 'cites', 'authored_by', 'discusses', 'related_to', 'part_of'
    weight REAL DEFAULT 1.0,
    properties JSON,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Link content items to entities (many-to-many)
CREATE TABLE item_entities (
    raw_item_id INTEGER NOT NULL REFERENCES raw_items(id),
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    mention_type TEXT NOT NULL,           -- 'primary_topic', 'mentioned', 'authored_by'
    PRIMARY KEY (raw_item_id, entity_id)
);

-- Topic clusters (Level 2-3 outputs)
CREATE TABLE topic_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL UNIQUE, -- matches entities.community_id
    label TEXT NOT NULL,                  -- AI-generated cluster name
    landscape_summary TEXT,               -- Level 3: state-of-the-art synthesis
    item_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

### Vector Tables (sqlite-vec)

```sql
-- Item-level embeddings (title + summary)
CREATE VIRTUAL TABLE item_embeddings USING vec0(
    item_id INTEGER PRIMARY KEY,
    embedding FLOAT[768],
    published_at TEXT,                    -- metadata for temporal pre-filtering
    content_type TEXT
);

-- Entity-level embeddings (name + description)
CREATE VIRTUAL TABLE entity_embeddings USING vec0(
    entity_id INTEGER PRIMARY KEY,
    embedding FLOAT[768]
);

-- Chunk-level embeddings for long documents (Phase 2)
CREATE TABLE content_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_item_id INTEGER NOT NULL REFERENCES raw_items(id),
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INTEGER
);

CREATE VIRTUAL TABLE chunk_embeddings USING vec0(
    chunk_id INTEGER PRIMARY KEY,
    chunk_embedding FLOAT[768]
);
```

### Chat & Preferences

```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    last_message_at TEXT
);

CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL,                   -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    context_item_ids JSON,               -- IDs of items retrieved via RAG
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value JSON NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Indexes
CREATE INDEX idx_raw_items_processed ON raw_items(is_processed);
CREATE INDEX idx_raw_items_published ON raw_items(published_at);
CREATE INDEX idx_processed_items_relevance ON processed_items(relevance_score DESC);
CREATE INDEX idx_entities_community ON entities(community_id);
CREATE INDEX idx_entities_pagerank ON entities(pagerank_score DESC);
CREATE INDEX idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON relationships(target_entity_id);
CREATE INDEX idx_item_entities_item ON item_entities(raw_item_id);
CREATE INDEX idx_item_entities_entity ON item_entities(entity_id);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
```

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
│   ├── main.py                        # FastAPI app + lifespan (DB init, scheduler)
│   ├── config.py                      # pydantic-settings
│   ├── database.py                    # SQLite + sqlite-vec + graph tables init
│   ├── schema.sql                     # Full DDL (relational + graph + vector)
│   │
│   ├── collectors/                    # Source collector agents
│   │   ├── base.py                    # BaseCollector ABC
│   │   ├── rss_collector.py
│   │   ├── hackernews_collector.py
│   │   ├── arxiv_collector.py
│   │   └── registry.py               # Collector factory
│   │
│   ├── processing/                    # Nightly processing pipeline
│   │   ├── pipeline.py                # Orchestration: collect → extract → summarize → graph → cluster
│   │   ├── text_extractor.py          # HTML/article → clean text
│   │   ├── deduplication.py           # URL-exact dedup (Phase 1)
│   │   ├── summarizer.py             # Level 1: item summarization via Ollama
│   │   ├── entity_extractor.py        # Extract entities + relationships via Ollama
│   │   ├── embedder.py                # Generate embeddings via nomic-embed-text
│   │   ├── graph_builder.py           # Build/update graph tables from extracted entities
│   │   ├── community_detector.py      # Load graph → NetworkX → Leiden → write communities back
│   │   └── landscape_summarizer.py    # Level 3: per-cluster state-of-the-art summaries
│   │
│   ├── navigator/                     # Real-time Navigator engine
│   │   ├── agent.py                   # Chat orchestration: retrieve → augment → generate → stream
│   │   ├── retriever.py               # Triple-factor retrieval (semantic + temporal + graph)
│   │   ├── temporal.py                # Time-decay scoring functions
│   │   └── prompts.py                 # Navigator system prompts
│   │
│   ├── graph/                         # Graph operations
│   │   ├── store.py                   # CRUD for entities/relationships in SQLite
│   │   ├── networkx_bridge.py         # Load SQLite graph → NetworkX, write metrics back
│   │   └── api.py                     # JSON API for Cytoscape.js (nodes, edges, clusters)
│   │
│   ├── llm/                           # Ollama interaction layer
│   │   ├── client.py                  # Async Ollama wrapper (chat, embed, stream)
│   │   └── prompts.py                 # All prompt templates
│   │
│   ├── scheduler/
│   │   ├── scheduler.py               # APScheduler setup
│   │   └── jobs.py                    # Job definitions (collect, process, cluster)
│   │
│   └── web/
│       ├── routes/
│       │   ├── navigator.py           # GET /  (Navigator UI), SSE streaming
│       │   ├── graph.py               # GET /graph (Visualization Platform), JSON API
│       │   ├── sources.py             # CRUD sources
│       │   └── triggers.py            # POST /collect, POST /process
│       ├── templates/
│       │   ├── base.html              # Layout with split-pane (Navigator + Graph)
│       │   ├── navigator.html         # Chat interface
│       │   ├── graph.html             # Cytoscape.js visualization
│       │   ├── sources.html           # Source management
│       │   └── components/
│       │       ├── chat_message.html  # Message bubble partial
│       │       ├── graph_sidebar.html # Node/cluster detail panel
│       │       └── nav.html           # Navigation
│       └── static/
│           ├── chat.js                # SSE handling for streaming Navigator responses
│           └── graph.js               # Cytoscape.js initialization, layout, interaction
│
├── scripts/
│   ├── setup_ollama.sh                # Pull required models
│   └── seed_sources.py                # Seed example sources
│
├── tests/
│   ├── conftest.py
│   ├── test_collectors/
│   ├── test_processing/
│   ├── test_navigator/
│   ├── test_graph/
│   └── test_web/
│
└── data/                              # Runtime, .gitignored
    └── dkia.db
```

---

## Implementation Sequence (10 Steps)

| Step | What | Key Files |
|---|---|---|
| **1** | Project scaffolding + Docker | pyproject.toml, Dockerfile, docker-compose.yml, .env.example |
| **2** | Database layer (relational + graph + vector) | src/schema.sql, src/database.py, src/config.py |
| **3** | Ollama integration | src/llm/client.py, src/llm/prompts.py, scripts/setup_ollama.sh |
| **4** | First collector (RSS) | src/collectors/base.py, rss_collector.py, registry.py |
| **5** | Processing pipeline (Level 1: summarize + embed) | src/processing/pipeline.py, summarizer.py, embedder.py, text_extractor.py |
| **6** | Entity extraction + graph building | src/processing/entity_extractor.py, graph_builder.py, src/graph/store.py |
| **7** | Community detection + landscape summaries (Levels 2-3) | src/processing/community_detector.py, landscape_summarizer.py, src/graph/networkx_bridge.py |
| **8** | Navigator with triple-factor retrieval (Levels 4-5) | src/navigator/agent.py, retriever.py, temporal.py, src/web/routes/navigator.py |
| **9** | Visualization Platform | src/graph/api.py, src/web/routes/graph.py, graph.html, graph.js |
| **10** | Remaining collectors + scheduler + polish | hackernews_collector.py, arxiv_collector.py, scheduler.py, sources UI |

---

## Docker Deployment

```yaml
# docker-compose.yml
services:
  dkia:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env
    environment:
      - OLLAMA_HOST=host.docker.internal:11434
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Ollama runs natively on the host for Metal GPU. The container connects via `host.docker.internal:11434`.

**Setup on target Mac:**
1. Install Ollama → `ollama pull llama3.1:8b && ollama pull nomic-embed-text`
2. Clone repo → `docker-compose up -d`
3. Open `http://localhost:8000`

---

## MVP Scope (Phase 1)

### Source Connectors: 3
1. **RSS Feeds** — feedparser, no auth
2. **Hacker News** — Algolia API, no auth
3. **arXiv** — arxiv library, no auth, abstracts only

### Processing Pipeline
- URL-exact deduplication
- Text extraction via trafilatura
- Level 1: Ollama summarization → JSON (summary, categories, relevance_score)
- Entity-relationship extraction via Ollama
- Embedding generation via nomic-embed-text
- Graph construction in SQLite
- Level 2: Community detection via NetworkX + igraph (Leiden)
- Level 3: Landscape summaries per cluster via Ollama

### Navigator
- Triple-factor retrieval (semantic + temporal + graph centrality)
- Level 4-5 synthesis via Ollama with SSE streaming
- Conversation history with RAG context references

### Visualization Platform
- Cytoscape.js graph with nodes (items + entities) and edges (relationships)
- Color by source/topic, size by centrality
- Click to inspect, cluster grouping
- "Show in graph" from Navigator responses

### Deferred to Phase 2
- Reddit, Email, Twitter/X, Browser bookmark connectors
- Full arXiv PDF extraction (pymupdf)
- Content-similarity deduplication
- Chunk-level embeddings for long documents
- User preference learning from feedback
- launchd system-level scheduling
- 3D graph visualization mode
- Audio briefing generation

---

## Verification Plan

1. **Steps 1-2**: `docker-compose up` starts, DB initializes with all tables (relational + graph + vector)
2. **Step 3**: Ollama client can call chat + embeddings from within container
3. **Step 4**: RSS collector fetches items from test feed, stores in raw_items
4. **Step 5**: Pipeline produces Level 1 summaries + embeddings in DB
5. **Step 6**: Entity extraction populates entities + relationships tables
6. **Step 7**: Community detection assigns community_ids, landscape summaries generated
7. **Step 8**: Navigator answers questions with triple-factor retrieval, streaming works
8. **Step 9**: Graph visualization renders with real data, click-to-inspect works
9. **Step 10**: All 3 collectors + scheduler + sources management operational
10. **End-to-end**: Configure sources → overnight pipeline runs → morning: open Navigator, ask about topics, explore graph, get guided through the day's knowledge
