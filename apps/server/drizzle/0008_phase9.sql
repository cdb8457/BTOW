-- Bans table
CREATE TABLE IF NOT EXISTS server_bans (
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);

-- Add position to channels if not present
ALTER TABLE channels ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Add position to roles if not present  
ALTER TABLE roles ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Add hoist (show separately in member list) to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS hoist BOOLEAN NOT NULL DEFAULT FALSE;

-- Add mentionable to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS mentionable BOOLEAN NOT NULL DEFAULT FALSE;
