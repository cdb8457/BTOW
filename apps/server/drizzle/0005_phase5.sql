-- Phase 5 migration: add full-text search vector to messages
-- Note: dm_channels, dm_participants, reactions, and pinned column
-- are already defined in the Drizzle schema (0001-0004).

ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS messages_search_idx ON messages USING GIN(search_vector);
