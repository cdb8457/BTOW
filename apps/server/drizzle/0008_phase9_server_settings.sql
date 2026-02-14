-- Phase 9: Server Settings (Server Bans)
-- Create server_bans table

CREATE TABLE IF NOT EXISTS "server_bans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "banned_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reason" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "bans_server_id_idx" ON "server_bans"("server_id");
CREATE INDEX IF NOT EXISTS "bans_user_id_server_id_idx" ON "server_bans"("user_id", "server_id");

-- Add missing columns to roles table (hoist, mentionable)
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "hoist" boolean NOT NULL DEFAULT false;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "mentionable" boolean NOT NULL DEFAULT false;
