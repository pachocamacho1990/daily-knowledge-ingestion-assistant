-- Knowledge items (submitted by user)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE,
    title TEXT,
    content_text TEXT,
    content_html TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
    error_message TEXT,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT
);

-- Processed items (Level 1 summaries)
CREATE TABLE IF NOT EXISTS processed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    key_points TEXT NOT NULL DEFAULT '[]',  -- JSON array
    categories TEXT NOT NULL DEFAULT '[]',  -- JSON array
    relevance_score REAL NOT NULL DEFAULT 0.5,
    content_type TEXT NOT NULL DEFAULT 'article',
    reading_time_minutes INTEGER NOT NULL DEFAULT 1,
    processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chat conversations
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    context_item_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array of item IDs used as context
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_submitted_at ON items(submitted_at);
CREATE INDEX IF NOT EXISTS idx_processed_items_item_id ON processed_items(item_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
