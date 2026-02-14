import logging
from collections.abc import AsyncGenerator

import httpx

from src.config import settings

logger = logging.getLogger(__name__)


class OllamaClient:
    """Async client for Ollama REST API."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    async def health_check(self) -> bool:
        """Check if Ollama is reachable."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(self.base_url, timeout=5.0)
                return resp.status_code == 200
        except Exception:
            return False

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        format: str | None = None,
        temperature: float = 0.7,
    ) -> str:
        """Non-streaming chat completion. Returns full response text."""
        model = model or settings.chat_model
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if format:
            payload["format"] = format

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=120.0,
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"]

    async def chat_stream(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Streaming chat completion. Yields content chunks."""
        model = model or settings.chat_model
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": temperature},
        }

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=120.0,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    import json

                    data = json.loads(line)
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if data.get("done"):
                        break

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Generate embeddings for a batch of texts."""
        model = model or settings.embedding_model
        # Ollama embed endpoint accepts input as string or list
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/embed",
                json={"model": model, "input": texts},
                timeout=120.0,
            )
            resp.raise_for_status()
            return resp.json()["embeddings"]


# Module singleton
ollama_client = OllamaClient(settings.ollama_host)
