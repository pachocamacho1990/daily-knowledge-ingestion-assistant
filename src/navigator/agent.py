import json
import logging
from collections.abc import AsyncGenerator

from src.database import get_connection
from src.llm.client import ollama_client
from src.llm.prompts import (
    NAVIGATOR_SYSTEM,
    NAVIGATOR_USER_NO_CONTEXT,
    NAVIGATOR_USER_WITH_CONTEXT,
    TITLE_SYSTEM,
)
from src.navigator.prompts import format_context_items
from src.navigator.retriever import retrieve_relevant_items

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 10


class NavigatorAgent:
    """RAG chat agent that answers questions grounded in the user's knowledge base."""

    async def chat_stream(
        self, conversation_id: int, user_message: str
    ) -> AsyncGenerator[str, None]:
        """Process user message, retrieve context, and stream response.

        Yields content chunks. Stores both user and assistant messages.
        """
        conn = get_connection()
        try:
            # Store user message
            conn.execute(
                "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'user', ?)",
                (conversation_id, user_message),
            )
            conn.execute(
                "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?",
                (conversation_id,),
            )
            conn.commit()
        finally:
            conn.close()

        # Retrieve relevant context
        context_items = await retrieve_relevant_items(user_message, top_k=5)
        context_item_ids = [item["item_id"] for item in context_items]

        # Build context string
        context_str = format_context_items(context_items)

        # Format user message with context
        if context_str:
            user_content = NAVIGATOR_USER_WITH_CONTEXT.format(
                context=context_str, question=user_message
            )
        else:
            user_content = NAVIGATOR_USER_NO_CONTEXT.format(question=user_message)

        # Build message history
        messages = [{"role": "system", "content": NAVIGATOR_SYSTEM}]

        conn = get_connection()
        try:
            history = conn.execute(
                "SELECT role, content FROM chat_messages "
                "WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
                (conversation_id, MAX_HISTORY_MESSAGES + 1),
            ).fetchall()
        finally:
            conn.close()

        # Add history (excluding the message we just stored, reversed to chronological)
        for msg in reversed(history[1:]):
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current user message with context
        messages.append({"role": "user", "content": user_content})

        # Stream response
        full_response = []
        async for chunk in ollama_client.chat_stream(messages=messages, temperature=0.7):
            full_response.append(chunk)
            yield chunk

        # Store assistant message
        assistant_content = "".join(full_response)
        conn = get_connection()
        try:
            conn.execute(
                "INSERT INTO chat_messages (conversation_id, role, content, context_item_ids) "
                "VALUES (?, 'assistant', ?, ?)",
                (conversation_id, assistant_content, json.dumps(context_item_ids)),
            )
            conn.commit()
        finally:
            conn.close()

        # Auto-title conversation if it's the first exchange
        await self._maybe_title_conversation(conversation_id, user_message)

    async def _maybe_title_conversation(self, conversation_id: int, first_message: str):
        """Generate a title for the conversation if it doesn't have one."""
        conn = get_connection()
        try:
            conv = conn.execute(
                "SELECT title FROM conversations WHERE id = ?", (conversation_id,)
            ).fetchone()
            if conv and conv["title"]:
                return
        finally:
            conn.close()

        try:
            title = await ollama_client.chat(
                messages=[
                    {"role": "system", "content": TITLE_SYSTEM},
                    {"role": "user", "content": first_message},
                ],
                temperature=0.3,
            )
            title = title.strip().strip('"')[:100]

            conn = get_connection()
            try:
                conn.execute(
                    "UPDATE conversations SET title = ? WHERE id = ?",
                    (title, conversation_id),
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Failed to generate conversation title: {e}")


navigator_agent = NavigatorAgent()
