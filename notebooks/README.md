# GraphRAG Prototyping Notebooks

> Created: February 15, 2026

## Purpose

These notebooks serve as **rapid prototyping environment** for validating the GraphRAG pipeline before committing to production code. The goal was to answer critical architecture questions through hands-on experimentation with real LLM inference.

## Why Jupyter Notebooks?

1. **Iterative exploration** — LLM prompt engineering requires rapid iteration. Notebooks allow testing prompt variations and inspecting outputs cell-by-cell without restarting a full application.

2. **Visibility into intermediate states** — Each pipeline stage (chunking → extraction → graph → embeddings → retrieval) produces artifacts that need inspection. Notebooks make these visible.

3. **Fail fast, learn fast** — When `qwen2.5:3b` produced malformed JSON, we could immediately see the raw output, adjust the prompt, and re-run. In production code, this feedback loop would be much slower.

4. **Documentation by execution** — The notebooks themselves become executable documentation. Future contributors can trace exactly how the pipeline works.

5. **Dependency validation** — We discovered missing dependencies (scipy for PageRank) in real-time rather than in a CI pipeline.

---

## Kernel Configuration

### What is a Jupyter Kernel?

A kernel is an isolated Python environment that Jupyter uses to execute code. We created a project-specific kernel to:
- Isolate dependencies from the system Python
- Ensure reproducibility across sessions
- Allow switching between different project environments in Jupyter Lab

### Kernel Location

```
Name: dkia-graphrag
Display Name: "DKIA GraphRAG"
Spec Location: ~/Library/Jupyter/kernels/dkia-graphrag/
Python Environment: .venv/ (project root)
```

### How the Kernel Was Created

```bash
# 1. Create virtual environment
python3 -m venv .venv

# 2. Activate and install ipykernel
source .venv/bin/activate
pip install ipykernel

# 3. Register kernel with Jupyter
python -m ipykernel install --user --name=dkia-graphrag --display-name="DKIA GraphRAG"
```

### Kernel Spec File

The kernel registration creates `~/Library/Jupyter/kernels/dkia-graphrag/kernel.json`:

```json
{
  "argv": [
    "/path/to/project/.venv/bin/python",
    "-m",
    "ipykernel_launcher",
    "-f",
    "{connection_file}"
  ],
  "display_name": "DKIA GraphRAG",
  "language": "python"
}
```

### Managing Kernels

```bash
# List all kernels
jupyter kernelspec list

# Remove a kernel
jupyter kernelspec remove dkia-graphrag

# Reinstall after venv changes
source .venv/bin/activate
python -m ipykernel install --user --name=dkia-graphrag --display-name="DKIA GraphRAG"
```

---

## Notebooks Overview

| # | Notebook | Input | Output | Key Learning |
|---|----------|-------|--------|--------------|
| 01 | `01_graphrag_extraction.ipynb` | Raw document | Entities, relationships, claims | Prompt engineering for structured extraction |
| 02 | `02_graph_construction_communities.ipynb` | Extraction results | Graph with communities | NetworkX + Louvain integration |
| 03 | `03_embeddings_vector_search.ipynb` | Graph + entities | Searchable vector store | Triple-factor retrieval implementation |

### Execution Order

Notebooks must be run sequentially:
```
01 → (produces extraction_results.json) → 02 → (updates graphrag.db) → 03
```

---

## Key Learnings for Production Architecture

### 1. Prompt Engineering Requires Iteration

**Discovery:** The initial entity extraction prompt failed because Python's `.format()` interpreted JSON braces `{}` as placeholders, causing `KeyError: '"name"'`.

**Solution:** Escape braces as `{{` and `}}` in prompt templates.

**Production implication:** Use a proper templating system (Jinja2) or raw strings for LLM prompts. Consider a dedicated prompt management layer.

### 2. Small Models Need Explicit JSON Guidance

**Discovery:** `qwen2.5:3b` sometimes wraps JSON in markdown code blocks (` ```json ... ``` `), requiring post-processing.

**Solution:** Added JSON extraction logic that handles both raw JSON and markdown-wrapped responses.

**Production implication:** Build a robust `parse_llm_json()` utility that handles common LLM output variations. Consider retry logic for malformed responses.

### 3. Graph Algorithms Require scipy

**Discovery:** NetworkX's PageRank implementation requires scipy, which wasn't an obvious dependency.

**Production implication:** Document all transitive dependencies. Use `pip freeze` or `uv pip compile` to lock exact versions.

### 4. Ollama Model Swapping is Slow

**Discovery:** With `OLLAMA_MAX_LOADED_MODELS=1`, switching between chat and embedding models caused ~10-15 second delays.

**Solution:** Set `OLLAMA_MAX_LOADED_MODELS=2` to keep both models in memory.

**Production implication:** For Docker deployment, ensure Ollama config allows concurrent model loading. Document memory requirements (chat ~2GB + embeddings ~0.5GB).

### 5. sqlite-vec Works Well for Small Scale

**Discovery:** sqlite-vec provides simple vector storage with cosine similarity search, no external service needed.

**Limitation:** For >100K vectors, may need to evaluate alternatives (pgvector, Qdrant).

**Production implication:** Start with sqlite-vec for MVP. Design storage layer with abstraction to allow future migration.

### 6. Triple-Factor Retrieval is Effective

**Discovery:** Combining semantic similarity (60%) + temporal decay (20%) + graph centrality (20%) produces more relevant results than pure semantic search.

**Example:** For query "AI regulation", pure semantic search returns any mention of "regulation". Triple-factor boosts entities with high PageRank (like FTC, major companies) that are structurally important in the knowledge graph.

**Production implication:** The weighting (60/20/20) should be configurable. Consider A/B testing different weight combinations.

### 7. Community Summaries Add Value

**Discovery:** LLM-generated summaries for each community (cluster of related entities) provide high-level context that improves answer quality.

**Production implication:** Pre-compute community summaries during nightly processing. Store in `community_summaries` table. Include in retrieval context.

### 8. Temporal Decay Needs Content-Type Awareness

**Discovery:** A half-life of 7 days works for news but is too aggressive for research papers.

**Production implication:** Store `content_type` with each item. Apply different half-lives:
- News/social: 7 days
- Blog posts: 14 days
- Research papers: 30 days
- Reference docs: 365 days

---

## Architecture Decisions Validated

| Decision | Status | Notes |
|----------|--------|-------|
| Ollama for local LLM | ✅ Validated | Works well, Metal acceleration effective |
| qwen2.5:3b for extraction | ✅ Validated | Good balance of quality/speed on 8GB RAM |
| nomic-embed-text (768-dim) | ✅ Validated | Sufficient quality, fast inference |
| SQLite + sqlite-vec | ✅ Validated | Simple, no external services, works for MVP scale |
| NetworkX for graph algorithms | ✅ Validated | PageRank, centrality, community detection all work |
| Louvain for community detection | ✅ Validated | Produces meaningful clusters |
| Triple-factor retrieval | ✅ Validated | Better results than pure semantic search |
| 600-token chunks, 100 overlap | ✅ Validated | Good balance for entity extraction |

---

## Generated Artifacts (gitignored)

| File | Description |
|------|-------------|
| `extraction_results.json` | Output of notebook 01: entities, relationships, claims |
| `graphrag.db` | SQLite database with full graph + embeddings |

These are regenerated each time notebooks run. Not committed to git.

---

## Transitioning to Production

The notebooks validated the pipeline. Next steps to productionize:

### 1. Extract Core Logic to Modules

```
src/
├── extraction/
│   ├── chunker.py          # From notebook 01
│   ├── entity_extractor.py # From notebook 01
│   └── prompts.py          # LLM prompt templates
├── graph/
│   ├── builder.py          # From notebook 02
│   ├── metrics.py          # PageRank, centrality
│   └── communities.py      # Louvain + summarization
├── retrieval/
│   ├── embedder.py         # From notebook 03
│   ├── vector_store.py     # sqlite-vec wrapper
│   └── retriever.py        # Triple-factor scoring
└── navigator/
    └── query.py            # RAG query pipeline
```

### 2. Add Error Handling

Notebooks have minimal error handling. Production code needs:
- Retry logic for LLM calls
- Graceful handling of malformed responses
- Logging and monitoring
- Transaction management for database writes

### 3. Configuration Management

Hardcoded values in notebooks become config:
- Model names (CHAT_MODEL, EMBED_MODEL)
- Chunk sizes (CHUNK_SIZE, CHUNK_OVERLAP)
- Retrieval weights (semantic, temporal, graph)
- Half-life values per content type

### 4. Testing

- Unit tests for each module
- Integration tests for full pipeline
- Prompt regression tests (ensure extraction quality doesn't degrade)

---

## Running the Notebooks

### Prerequisites

1. Ollama running with models:
   ```bash
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ```

2. Ollama configured for multiple models:
   ```bash
   export OLLAMA_MAX_LOADED_MODELS=2
   ```

3. Kernel registered (see Kernel Configuration above)

### Execution

```bash
# Start Jupyter Lab
jupyter lab

# Open notebooks in order: 01 → 02 → 03
# Select kernel: "DKIA GraphRAG"
# Run all cells (Shift+Enter or Run → Run All Cells)
```

### Expected Runtime

| Notebook | Approximate Time | Notes |
|----------|-----------------|-------|
| 01 | 1-2 minutes | Depends on document size |
| 02 | 1-2 minutes | Community summary generation |
| 03 | 1-2 minutes | Embedding generation |

Times measured on Mac mini M1 with 8GB RAM.
