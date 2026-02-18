# Daily Knowledge Ingestion Assistant (DKIA)

**A personal knowledge navigation system that ingests content from multiple sources overnight, builds a knowledge graph, and lets you explore it through conversation and interactive visualization.**

The core belief behind this project: **this is about the future of education** — optimizing how humans learn from large volumes of data.

---

## The Product

DKIA has two components working side by side in a split-pane interface:

| Component | What It Does |
|-----------|-------------|
| **The Navigator** | Conversational chat interface (~40% of screen). You drive discovery each morning through questions. The AI has processed everything overnight and guides you on where to look, why it matters, and how to approach it. |
| **The Visualization Platform** | Interactive knowledge graph powered by Cytoscape.js (~60% of screen). Shows entities, relationships, and topic clusters as a living map. Nodes sized by importance, colored by category, clustered by community. |

## Design System

DKIA uses the **Koine Design System** — a custom visual language built around Pentecost iconography (Dove, Flame, Connected Nodes) with a gold-on-dark "candlelight in a cathedral" aesthetic.

---

## Running the App

### Prerequisites

- Python 3.12+
- Node.js 18+
- [Ollama](https://ollama.ai) (for LLM backend — not yet connected)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/pachocamacho1990/daily-knowledge-ingestion-assistant.git
cd daily-knowledge-ingestion-assistant

# Create virtual environment and install Python dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Start the development server
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Current State

- **GraphRAG pipeline**: Validated in Jupyter notebooks (entity extraction, graph construction, community detection, triple-factor retrieval)
- **Frontend**: Navigator chat pane + interactive knowledge graph (40 communities, 158 entities, 96 chunks) with Koine Design System theming
- **Knowledge graph**: 15-color warm palette, entity shapes by type, community expand/collapse, glassmorphism sidebar
- **Next steps**: Connect Navigator to Ollama, refactor notebooks into Python modules

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3.12+ |
| Web Framework | FastAPI + Uvicorn |
| Frontend | Jinja2 + Koine Design System + Cytoscape.js |
| Database | SQLite + sqlite-vec |
| Graph | NetworkX + igraph + leidenalg |
| LLM Runtime | Ollama (host-native, Apple Silicon Metal) |
| NER | GLiNER (zero-shot, multilingual) |

## Documentation

- **[Architecture Plan](docs/architecture-plan.md)** — Full system design, schema, 10-step implementation
- **[Design System Guide](docs/design-system.md)** — Koine Design System usage and philosophy
- **[Changelog](docs/CHANGELOG.md)** — Detailed history of all changes
- **[GitHub Wiki](https://github.com/pachocamacho1990/daily-knowledge-ingestion-assistant/wiki)** — Phase-by-phase development documentation

## License

Private project.
