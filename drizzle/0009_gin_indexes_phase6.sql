-- Phase 6: GIN indexes for full-text search and JSONB queries (PRD §8.2)

-- GIN index on items.attributes for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_items_attributes_gin ON items USING GIN (attributes);

-- Full-text search index on pages.plain_text
CREATE INDEX IF NOT EXISTS idx_pages_plain_text_gin ON pages USING GIN (to_tsvector('english', coalesce(plain_text, '')));

-- Full-text search index on chat_messages.content
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_gin ON chat_messages USING GIN (to_tsvector('english', coalesce(content, '')));
