# Market Research: AI-Powered Daily Knowledge Ingestion Assistant

> Research date: February 6, 2026
> Updated: February 13, 2026

---

## Problem Statement

Every day I start my routine and realize there is an overwhelming amount of information I don't have time to read: papers, newsletters, social media feeds, and content across the different websites I've starred or kept open in my browser.

But the problem goes deeper than "too much to read." The real problem is **how humans learn from large volumes of data.** Current tools either dump raw feeds at you (RSS readers), give you shallow summaries (AI digesters), or let you search what you already know to look for (RAG chatbots). None of them fundamentally change the way you navigate and absorb knowledge.

I need a system built on two core components:

**1. The Navigator** — A conversational interface where I wake up every morning and start directing the conversation. I ask questions about topics, inquire about the state of the art in a trend, or express what I want to learn. By doing so, the system helps me filter which data is relevant to my questions and my intent. The AI has already processed everything overnight — it guides me on *where to look, why it matters, and how to approach it*, optimizing the way I consume information. The summarization procedure is critical at every step: from raw ingestion, through topic clustering, to query-driven synthesis.

**2. The Visualization Platform** — A knowledge graph interface inspired by Star Trek's approach to navigating complex data. This visualization feels like a hypergraph that connects all the data, all the references, topics, authors, and temporal relationships. It is the visual representation of everything the system knows, and it grows over time as a living map of your knowledge universe.

On the backend, the system combines a vector database with a graph structure. Every chunk of data carries a timestamp, so the RAG system understands which pieces are more recent and can weight retrieval accordingly. Vectors capture semantic similarity; the graph captures structural relationships (citations, shared authors, topic evolution, cross-source connections).

**This is fundamentally about the future of education** — a new way for humans to learn fast and efficiently from large volumes of data. Not just reading faster, but navigating smarter.

---

## Executive Summary

After exhaustive research across 30+ commercial products, 25+ open-source projects, and the latest academic work on GraphRAG and temporal retrieval:

**No existing product combines: conversational-first knowledge navigation + graph-based visualization of connected knowledge + multi-source ingestion + temporal-aware RAG + self-hosted with local LLMs.**

More specifically:
- No product treats the user conversation as the primary interface for knowledge discovery (vs. dashboards or feeds)
- No product provides a knowledge graph visualization that grows as a personal "map of understanding"
- No product combines vector search with graph structure and temporal decay for retrieval
- The closest academic work (Microsoft GraphRAG, LightRAG) focuses on document Q&A, not daily knowledge ingestion and navigation

This represents not just a product gap, but a paradigm gap.

---

## 1. COMMERCIAL PRODUCTS

### Tier 1: Closest to Our Vision

| Product | What It Does | Strengths | Gaps vs. Our Vision | Pricing |
|---------|-------------|-----------|---------------------|---------|
| **Readwise Reader** | Read-it-later + RSS + newsletters + PDF + AI chat per document | Most comprehensive content aggregation. "Ghostreader" AI chat alongside reading | No conversational navigation. Per-document chat only, no cross-document synthesis. No graph. No temporal awareness. Reactive | ~$8/mo |
| **Feedly + Leo AI** | RSS reader with AI priority, dedup, mute, summarize | Mature RSS infra. Leo's train-by-example is clever | Feed-centric, not conversation-centric. No graph. No chat/Q&A. No knowledge connections | Free / $8.25/mo |
| **Huxe** (ex-NotebookLM team) | Audio-first daily briefing from email + calendar + interests. Interactive — you can interrupt the AI hosts mid-stream | Most innovative UX. Audio-first solves "no time to read." Conversational interruption | Audio-only. No visualization. No graph structure. No personal source ingestion (RSS/papers) | Free |
| **Inoreader Intelligence** | RSS + AI summaries + batch "Intelligence Reports" across articles | Intelligence Reports for cross-article analysis is unique | No conversational interface. No graph. Reports are batch, not interactive | $7.50-10/mo |
| **ChatGPT Pulse** (Sep 2025) | AI researches while you sleep, delivers morning briefing as visual cards. Memory + Gmail + calendar | Best proactive morning briefing. "Curate" button lets you steer with natural language | Locked to OpenAI. No self-hosted. No graph visualization. No personal source control. Shallow summarization | Included with ChatGPT Plus |

### Tier 2: Partial Overlap

| Product | Relevance | Key Insight |
|---------|-----------|-------------|
| **Perplexity Discover** | AI-curated trending topics with chat. Great UX for source-cited answers | Feed of *questions worth asking* (not articles). Not customizable to personal sources |
| **Particle News** | Story-centric AI news with multi-perspective views, ELI5 mode, Q&A per story | "Opposite Sides" political balance. Suggested questions. But news-only, not customizable |
| **Google NotebookLM** | Upload docs → AI-generated podcast with two hosts. "Deep Dive" and "The Brief" modes | Best audio generation quality. Manual per-notebook, not a daily system |
| **Summate** | AI digest service: newsletters + YouTube + blogs → scheduled daily/weekly digest | Closest to "daily briefing." TLDR + key takeaways. But no chat, no graph, consumption only |
| **Saner.AI** | Personal AI assistant with daily brief from calendar + tasks + notes | Proactive daily planning. But not focused on knowledge/content aggregation |
| **Dume.ai** | AI executive assistant: Gmail + Calendar + Notion + Slack → morning briefing at 7:30 AM | Learns routines, proactive automation. But workplace-only, no knowledge discovery |
| **Bulletin** | AI RSS reader with anti-clickbait headline rewriting, ELI5, smart summaries | Clean iOS design. But Apple ecosystem only, no chat, no graph |

### Key Lesson: Artifact (Instagram Founders) Failed
Launched as "TikTok for news." Shut down Jan 2024. Acquired by Yahoo. Founders concluded "the market opportunity isn't big enough" for pure news aggregation as standalone. **Our differentiation: we're not a news aggregator — we're a knowledge navigation system.**

---

## 2. OPEN-SOURCE PROJECTS

### Comparative Matrix

| Project | Multi-Source | Conversational-First | Graph Structure | Temporal RAG | Visualization | Self-Hosted | Local LLM | License | Stars |
|---------|:-----------:|:-------------------:|:--------------:|:------------:|:-------------:|:-----------:|:---------:|---------|------:|
| **LightRAG** | NO | Partial | YES (GraphRAG) | NO | YES (WebUI) | YES | YES | MIT | ~28.2K |
| **Khoj** | Partial | YES (chat-first) | NO | NO | NO | YES | YES | AGPL-3.0 | ~25.6K |
| **auto-news** | YES | NO | NO | NO | NO | YES | YES | Apache 2.0 | ~1.5K |
| **TrendRadar** | YES (35+) | Partial (MCP) | NO | NO | NO | YES | YES | GPL v3 | ~42.9K |
| **SurfSense** | YES (20+) | YES (chat) | NO | NO | NO | YES | YES | MIT | ~12.7K |
| **Graphiti (Zep)** | NO | NO | YES (temporal KG) | YES | NO | YES | Partial | Apache 2.0 | ~20K |
| **nano-graphrag** | NO | YES | YES (GraphRAG) | NO | NO | YES | YES | MIT | ~2.8K |
| **fast-graphrag** | NO | YES | YES (PageRank) | NO | NO | YES | YES | MIT | ~3.6K |
| **Kotaemon** | NO | YES (chat) | YES (GraphRAG) | NO | NO | YES | YES | Apache 2.0 | ~20K |
| **Open WebUI** | NO | YES (chat) | NO | NO | NO | YES | YES | MIT | ~110K |
| **RAGFlow** | NO | YES (chat) | NO | NO | NO | YES | YES | Apache 2.0 | ~70K |
| **DKIA (Ours)** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | MIT | — |

**No existing project fills all columns.** The closest are:
- **LightRAG**: Has GraphRAG + visualization, but no multi-source ingestion or temporal awareness
- **Khoj**: Has chat-first + multi-platform, but no graph structure or visualization
- **SurfSense**: Has multi-source + chat, but no graph or temporal RAG
- **Graphiti**: Has temporal knowledge graph, but requires Neo4j and no multi-source ingestion

### Top Open-Source Projects (Detailed)

#### LightRAG (MIT, ~28.2K stars) — Best GraphRAG Implementation
- **GitHub**: github.com/HKUDS/LightRAG
- **Stack**: Python, NetworkX/Neo4j/PostgreSQL, Ollama native, built-in WebUI
- **Does**: Graph-based RAG with entity extraction, community detection, and knowledge graph visualization. Ollama-compatible server (acts as smart model). Multi-modal document support.
- **Our take**: Best existing graph visualization + RAG. Could serve as inspiration for our visualization platform. But it's a document Q&A tool, not a knowledge ingestion system. No source connectors, no daily processing, no temporal awareness.

#### Khoj (AGPL-3.0, ~25.6K stars) — Best Personal AI Assistant
- **GitHub**: github.com/khoj-ai/khoj
- **Stack**: Python, FastAPI, Django, PostgreSQL, Qdrant/FAISS
- **Does**: "AI second brain." Ingest PDF, Markdown, Notion, GitHub. Chat/RAG. Custom agents. Scheduled automations. Deep research. Web + Desktop + Obsidian + WhatsApp.
- **Our take**: Strongest conversational AI for personal use. Would need RSS/news connectors, graph structure, temporal awareness, and visualization platform added on top. AGPL license is restrictive.

#### SurfSense (MIT, ~12.7K stars) — Best Multi-Source + Chat
- **GitHub**: github.com/MODSetter/SurfSense
- **Stack**: Python/FastAPI, LangGraph, PostgreSQL + pgvector, Docker
- **Does**: OSS NotebookLM/Perplexity alternative. 20+ source connectors (search, Slack, Notion, YouTube, GitHub, Gmail, Discord). Chat with citations. Podcast generation.
- **Our take**: Strong multi-source + RAG. MIT license. Missing graph structure, temporal awareness, visualization, and the "navigator" conversation model.

#### Graphiti / Zep (Apache 2.0, ~20K stars) — Best Temporal Knowledge Graph
- **GitHub**: github.com/getzep/graphiti
- **Stack**: Python, Neo4j (hard dependency), OpenAI-compatible API
- **Does**: Builds temporally-aware knowledge graphs. Continuously integrates new data. Temporal metadata on every node/edge. Episodic + semantic memory. Contradiction resolution (newer facts override older).
- **Our take**: The temporal graph concept is exactly what we need. But requires Neo4j (heavy, GPLv3). The continuous ingestion pattern and contradiction resolution are architecturally relevant.

#### nano-graphrag (MIT, ~2.8K stars) — Most Hackable GraphRAG
- **GitHub**: github.com/gusye1234/nano-graphrag
- **Stack**: Python (~1,100 lines), Ollama native, pluggable storage backends
- **Does**: Minimal GraphRAG implementation. Incremental insert (no re-indexing). Async. MD5 dedup. Supports FAISS, Neo4j, Ollama.
- **Our take**: At ~1,100 lines, this is the best candidate for extracting GraphRAG concepts into our codebase rather than depending on a full framework.

#### fast-graphrag / Circlemind (MIT, ~3.6K stars) — Fastest GraphRAG
- **GitHub**: github.com/circlemind-ai/fast-graphrag
- **Stack**: Python, PageRank-based retrieval (vs. community summaries)
- **Does**: 27x faster than Microsoft GraphRAG. Auto-refines graph ontology as data comes in. Incremental.
- **Our take**: Speed advantage is massive for local LLM usage. PageRank-based approach fits our "importance scoring" need. Auto-refining ontology is perfect for a system that evolves daily.

#### auto-news (Apache 2.0, ~1.5K stars)
- **GitHub**: github.com/finaldie/auto-news
- **Stack**: Python, LangChain, Ollama/ChatGPT/Gemini, Notion frontend, Docker
- **Does**: Multi-source (Tweets, RSS, YouTube, Web, Reddit, Journal notes) → LLM summarization → daily TODO lists → outputs to Notion
- **Our take**: Best existing multi-source ingestion pipeline. No chat, no graph, no visualization.

#### TrendRadar (GPL v3, ~42.9K stars)
- **GitHub**: github.com/sansan0/TrendRadar
- **Stack**: Python, SQLite, Docker, MCP
- **Does**: 35+ platform monitoring. Keyword filtering. AI briefings pushed to phone. MCP for conversational trend analysis.
- **Our take**: Incredible source coverage. GPL license is restrictive. Monitoring-focused, not learning-focused.

#### Open WebUI (MIT, ~110K stars)
- **GitHub**: github.com/open-webui/open-webui
- **Stack**: Python/Svelte, 9 vector DBs, Ollama native
- **Does**: Best self-hosted chat UI for LLMs. Built-in RAG, web search, plugin system.
- **Our take**: Best chat frontend. Could serve as our Navigator UI layer. No knowledge ingestion or graph.

---

## 3. AI AGENT FRAMEWORKS

| Framework | Stars | Best For | License |
|-----------|-------|----------|---------|
| **CrewAI** | ~34K | Role-based multi-agent (Researcher → Summarizer → Writer). Existing news agent examples | MIT |
| **LangGraph** | ~11.7K | Stateful agent workflows with memory, adaptive routing | MIT |
| **AutoGen/AG2** | ~40K | Complex multi-agent research. Unstable API (v0.4 breaking rewrite) | MIT |
| **Haystack** | ~20K | Structured pipelines (not agent-based). HN summarization example | Apache 2.0 |
| **n8n** | ~108K | Visual no-code workflow automation. 400+ integrations. Many RSS+AI templates exist | Fair-code (NOT truly OSS) |
| **Dify** | ~121K | Production agentic workflow platform. Visual builder. 100s of LLM integrations | Apache 2.0 |

**Best fit for our use case**: CrewAI (MIT, role-based agents, existing news examples) or LangGraph (MIT, stateful workflows, used by SurfSense).

---

## 4. GRAPHRAG AND KNOWLEDGE GRAPH RESEARCH

### Microsoft GraphRAG (MIT, ~30.8K stars)

The foundational approach: builds a structured knowledge graph from a corpus using LLM entity-relationship extraction, applies Leiden community detection to find topic clusters at multiple hierarchy levels, then generates community-level summaries for answering global sensemaking questions.

**Key pipeline**: Chunking → Entity-Relationship Extraction (LLM) → Graph Construction (NetworkX) → Community Detection (Leiden) → Community Summarization (LLM) → Embedding

**Performance**: +45% comprehensiveness, +57% diversity vs. naive RAG on global queries. But indexing is extremely LLM-intensive — ~36 hours on local hardware for a small corpus vs. ~10 minutes with cloud GPT-4.

**Variants relevant to us**:
- **LazyGraphRAG**: Defers LLM calls to query time, using NLP noun-phrase extraction at index time. Much cheaper for daily ingestion.
- **fast-graphrag**: PageRank-based retrieval (27x faster). Auto-refining ontology.
- **nano-graphrag**: 1,100-line implementation, incremental insert, Ollama native.

### Temporal Knowledge Graphs (Graphiti Pattern)

Graphiti (Zep) demonstrates that knowledge graphs should carry temporal metadata on every node and edge. Key concepts:
- **Episodic memory**: Raw interactions stored with timestamps
- **Semantic memory**: Extracted facts with valid-from/valid-to timestamps
- **Contradiction resolution**: Newer facts override older ones
- **Temporal queries**: "What was the state of X as of date Y?"

### Relevant Papers

- **"From Local to Global: A Graph RAG Approach" (arXiv:2404.16130)** — The foundational GraphRAG paper
- **"Solving Freshness in RAG" (arXiv:2509.19376)** — Half-life decay function for temporal scoring
- **"Temporal RAG via Graph" (arXiv:2510.16715)** — Propagates temporal relevance through graph relationships
- **"LightRAG: Simple and Fast RAG" (EMNLP 2025)** — Most practical graph-RAG implementation

---

## 5. GRAPH + VECTOR HYBRID DATABASE OPTIONS

| Option | Type | Vector + Graph | License | Complexity | Best For |
|--------|------|---------------|---------|-----------|----------|
| **SQLite + sqlite-vec + graph tables** | Embedded | Manual graph + native vectors | MIT/Apache | Low | **Phase 1 — pragmatic, zero new infra** |
| **NetworkX (Python)** | In-memory | Batch algorithms (PageRank, Leiden, centrality) | BSD-3 | Low | **Nightly graph analysis, alongside SQLite** |
| **RyuGraph** (Kuzu fork) | Embedded | Native Cypher + vectors | MIT | Low | Phase 2 — if fork stabilizes |
| **Neo4j Community** | Server | Native Cypher + vectors | GPLv3 | High | Large graphs, mature ecosystem |
| **PostgreSQL + AGE + pgvector** | Server | Cypher + vectors in one server | Apache 2.0 | High | Phase 2+ migration path |

**Recommended approach**: SQLite + sqlite-vec for persistence, NetworkX for batch graph algorithms (community detection, PageRank, centrality scoring). Store graph as nodes/edges tables in SQLite, load into NetworkX during nightly processing, write computed scores back. Zero new infrastructure.

---

## 6. GRAPH VISUALIZATION LIBRARIES

| Library | Stars | Rendering | Max Nodes | License | Best For |
|---------|-------|-----------|-----------|---------|----------|
| **Cytoscape.js** | ~10.2K | Canvas | 5-10K | MIT | **Primary choice — built-in graph algorithms, layouts, mature API** |
| **Sigma.js** | ~11.3K | WebGL | 50-100K | MIT | Future upgrade if graph grows very large |
| **vis-network** | ~3.4K | Canvas | 2-5K | MIT/Apache | Fast prototyping, easiest to learn |
| **3d-force-graph** | ~5K | WebGL/Three.js | 5-10K | MIT | "Wow factor" 3D mode, VR support |
| **D3.js** | ~110K | SVG/Canvas | 500-5K | ISC | Maximum flexibility, steep learning curve |

**Recommended**: Cytoscape.js — purpose-built for knowledge graph analysis with built-in algorithms (PageRank, BFS, community detection in the browser), CSS-like styling, and extensive layout options.

---

## 7. TEMPORAL-AWARE RAG

No existing product implements time-decay in retrieval scoring for personal knowledge. The academic approach (arXiv:2509.19376) proposes:

```
score(query, document, time) = alpha * semantic_similarity + (1 - alpha) * 0.5^(age_days / half_life)
```

With content-type-aware half-lives:
- News/social: 7 days (goes stale fast)
- Blog posts: 14 days
- Research papers: 30 days (stays relevant longer)
- Reference material: 365 days (evergreen)

Combined with graph centrality (how connected is this item?), the full retrieval score becomes:

```
final_score = w1 * semantic_similarity + w2 * temporal_decay + w3 * graph_centrality
```

This triple-factor scoring is unique to our approach and doesn't exist in any product or open-source project we found.

---

## 8. MULTI-LEVEL SUMMARIZATION PIPELINE

A critical differentiator. Most products do single-pass summarization. Our system requires five levels:

| Level | When | What | Purpose |
|-------|------|------|---------|
| **1. Item compression** | Overnight batch | Raw content → 2-3 sentence summary per item | Enable filtering: what's worth keeping? |
| **2. Topic clustering** | Overnight batch | Group items by theme using graph communities | Enable landscape view: what themes emerged? |
| **3. State-of-the-art mapping** | Overnight batch | Synthesize each topic cluster into a landscape summary | Enable conversation: "what's the current state of X?" |
| **4. Query-driven synthesis** | Real-time (chat) | User asks question → retrieve relevant items → synthesize targeted answer | The Navigator: answer with full context |
| **5. Progressive detail** | Real-time (chat) | User goes deeper → return to raw content → higher-fidelity summary | Drill-down: zoom into specific aspects |

Levels 1-3 are pre-computed overnight. Levels 4-5 happen on-demand during conversation. Each level builds on the previous one. This pipeline doesn't exist in any product we researched.

---

## 9. COMPETITIVE BENCHMARK

### Capability Matrix: DKIA vs. Market

| Capability | Readwise | Feedly | Huxe | ChatGPT Pulse | Khoj | SurfSense | LightRAG | TrendRadar | **DKIA** |
|-----------|:--------:|:------:|:----:|:-------------:|:----:|:---------:|:--------:|:----------:|:--------:|
| Multi-source ingestion | Partial | RSS only | NO | Partial | Partial | YES | NO | YES | **YES** |
| Conversational-first (Navigator) | NO | NO | YES (audio) | Partial | YES | YES | Partial | NO | **YES** |
| Knowledge graph structure | NO | NO | NO | NO | NO | NO | YES | NO | **YES** |
| Graph visualization | NO | NO | NO | NO | NO | NO | YES (basic) | NO | **YES** |
| Temporal-aware RAG | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Multi-level summarization | NO | NO | NO | Shallow | NO | NO | Community-level | NO | **YES (5 levels)** |
| Cross-source synthesis | NO | NO | NO | Partial | NO | NO | Within-doc | NO | **YES** |
| Self-hosted / local LLM | NO | NO | NO | NO | YES | YES | YES | YES | **YES** |
| Grows as knowledge map | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Open source | NO | NO | NO | NO | AGPL | MIT | MIT | GPL | **MIT** |

### What We Uniquely Offer

1. **Conversational knowledge navigation** — The user drives discovery through questions, not by scrolling feeds. The system guides where to look, why, and how.
2. **Living knowledge graph** — Every piece of ingested content becomes a node in a personal knowledge graph that grows over time, showing connections across sources, topics, authors, and time.
3. **Temporal intelligence** — The system understands that a paper from yesterday matters differently than one from six months ago, and weights retrieval accordingly with content-type-aware decay.
4. **Five-level summarization** — From raw ingestion through topic clustering to query-driven synthesis, each level serves a different purpose in the user's learning process.
5. **Triple-factor retrieval** — Combining semantic similarity + temporal decay + graph centrality for scoring. No existing system does this.

---

## 10. KEY MARKET GAPS (Our Opportunities)

1. **No product treats conversation as the primary interface for knowledge discovery.** Every tool is either a feed reader (you scroll), a dashboard (you scan), or a chatbot (you already know what to ask). None guide you through learning.

2. **No product provides a growing knowledge graph visualization.** LightRAG has a basic graph view, but it's per-document, not a persistent personal knowledge map across all sources and time.

3. **No product combines vector + graph + temporal scoring for retrieval.** This triple-factor approach is novel and directly maps to how humans evaluate information relevance.

4. **No product implements multi-level summarization.** Single-pass summaries are everywhere. A pipeline that builds from item-level through topic-level to landscape-level synthesis doesn't exist.

5. **No product frames this as a learning system.** Every competitor is either a "reader," a "news aggregator," or a "chatbot." The framing of *optimizing how humans learn from data* is entirely unoccupied.

6. **No open-source project combines multi-source ingestion with GraphRAG.** auto-news does ingestion without graphs. LightRAG/nano-graphrag do graphs without ingestion. Nobody does both.

---

## 11. STRATEGIC OPTIONS (Updated)

### Option A: Build Custom with Graph-Aware Architecture (Recommended)
- SQLite + sqlite-vec + graph tables for storage
- NetworkX for batch graph algorithms
- nano-graphrag or fast-graphrag patterns for entity extraction
- Cytoscape.js for visualization
- Full control over the Navigator + Visualization Platform paradigm
- Most work but the only path to the full vision

### Option B: Extend LightRAG with Source Connectors
- Already has GraphRAG + visualization + Ollama support
- Add RSS/HN/arXiv collectors, temporal scoring, Navigator UI
- MIT license, active project
- Constrained by LightRAG's architecture decisions

### Option C: Compose: auto-news (ingestion) + nano-graphrag (graph) + Open WebUI (chat)
- Leverage best-in-class components
- Integration complexity but faster to prototype
- Risk: glue code becomes the hardest part

### Option D: Extend Khoj with Graph Layer
- Already has chat-first + multi-platform + scheduled automations
- Add GraphRAG layer, visualization, temporal awareness
- AGPL-3.0 license is restrictive for future distribution

---

## Sources

### Commercial Products
Feedly, Readwise Reader, Huxe, Inoreader, Summate, Perplexity, ChatGPT Pulse, Particle News, Google NotebookLM, Saner.AI, Dume.ai, DayStart AI, Bulletin, Artifact (Yahoo)

### Open-Source Projects
[LightRAG](https://github.com/HKUDS/LightRAG) | [Khoj](https://github.com/khoj-ai/khoj) | [SurfSense](https://github.com/MODSetter/SurfSense) | [Graphiti](https://github.com/getzep/graphiti) | [nano-graphrag](https://github.com/gusye1234/nano-graphrag) | [fast-graphrag](https://github.com/circlemind-ai/fast-graphrag) | [Microsoft GraphRAG](https://github.com/microsoft/graphrag) | [auto-news](https://github.com/finaldie/auto-news) | [TrendRadar](https://github.com/sansan0/TrendRadar) | [Open WebUI](https://github.com/open-webui/open-webui) | [RAGFlow](https://github.com/infiniflow/ragflow) | [Kotaemon](https://github.com/Cinnamon/kotaemon) | [Miniflux](https://github.com/miniflux/v2) | [sqlite-vec](https://github.com/asg017/sqlite-vec) | [simple-graph](https://github.com/dpapathanasiou/simple-graph) | [Cytoscape.js](https://github.com/cytoscape/cytoscape.js)

### Academic Papers
[GraphRAG (arXiv:2404.16130)](https://arxiv.org/abs/2404.16130) | [Solving Freshness in RAG (arXiv:2509.19376)](https://arxiv.org/html/2509.19376) | [Temporal RAG via Graph (arXiv:2510.16715)](https://arxiv.org/pdf/2510.16715) | [LightRAG (EMNLP 2025)](https://github.com/HKUDS/LightRAG)

### Databases & Visualization
[sqlite-vec](https://github.com/asg017/sqlite-vec) | [NetworkX](https://github.com/networkx/networkx) | [RyuGraph](https://github.com/predictable-labs/ryugraph) | [Apache AGE](https://github.com/apache/age) | [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) | [Sigma.js](https://github.com/jacomyal/sigma.js) | [3d-force-graph](https://github.com/vasturiano/3d-force-graph) | [Awesome-GraphRAG](https://github.com/DEEP-PolyU/Awesome-GraphRAG) | [RAG Techniques](https://github.com/NirDiamant/RAG_Techniques)
