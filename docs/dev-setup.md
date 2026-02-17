# Development Environment Setup

## Prerequisites

- **macOS** with Apple Silicon (M1/M2/M3/M4)
- **Python 3.12+** (development uses 3.14)
- **Ollama** installed natively (for Metal GPU acceleration)
- **Jupyter Lab** for running prototype notebooks

## Ollama Configuration

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

## Required Ollama Models

```bash
ollama pull qwen2.5:3b        # Chat/extraction (1.9 GB) - for 8GB RAM machines
ollama pull nomic-embed-text  # Embeddings (274 MB, 768-dim)

# Alternative for 16GB+ RAM machines:
# ollama pull llama3.1:8b     # Better quality chat model (~5 GB)
```

## Python Virtual Environment

```bash
# Create environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install ipykernel httpx langchain-text-splitters networkx python-louvain scipy sqlite-vec arxiv trafilatura pymupdf gliner langdetect
```

## Jupyter Kernel Registration

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

## Running the Notebooks

1. Start Ollama: `ollama serve`
2. Start Jupyter Lab: `jupyter lab`
3. Open notebooks in order (01 -> 02 -> 03)
4. Select kernel: "DKIA GraphRAG"

## Dependencies Summary

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
| gliner | Zero-shot NER -- multilingual entity extraction (`gliner_small-v2.1`, ~166 MB, CPU) |
| langdetect | Per-document language detection (metadata for export) |

## Hardware Notes

**8GB RAM machines (Mac mini M1):**
- Use `qwen2.5:3b` instead of `llama3.1:8b`
- Both models fit: ~2GB (chat) + ~0.5GB (embeddings) = ~2.5GB
- Set `OLLAMA_MAX_LOADED_MODELS=2` to avoid model swapping

**16GB+ RAM machines:**
- Can use `llama3.1:8b` for better extraction quality
- Consider `mxbai-embed-large` (1024-dim) for better embeddings
