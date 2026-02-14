-- Phase 7.5 / 8 migration

-- Add link_preview JSONB column to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS link_preview JSONB;
