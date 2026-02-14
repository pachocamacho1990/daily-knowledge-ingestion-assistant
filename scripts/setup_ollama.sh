#!/bin/bash
# Setup script for Ollama models required by DKIA
# Run this on the host machine (not in Docker)

set -e

echo "Pulling required Ollama models..."

echo "1/2: Pulling llama3.1:8b (chat/summarization)..."
ollama pull llama3.1:8b

echo "2/2: Pulling nomic-embed-text (embeddings)..."
ollama pull nomic-embed-text

echo ""
echo "All models ready. You can now run: docker-compose up"
