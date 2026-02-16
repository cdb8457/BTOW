-- Initial migration: create all base tables

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" varchar(32) NOT NULL UNIQUE,
  "display_name" varchar(32) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "avatar_url" varchar(512),
  "banner_url" varchar(512),
  "status" varchar(10) NOT NULL DEFAULT 'offline',
  "custom_status" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "servers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "icon_url" varchar(512),
  "description" text,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "servers_owner_id_idx" ON "servers"("owner_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "categories_server_id_idx" ON "categories"("server_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "type" varchar(10) NOT NULL,
  "topic" text,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "position" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "channels_server_id_idx" ON "channels"("server_id");
CREATE INDEX IF NOT EXISTS "channels_category_id_idx" ON "channels"("category_id");
CREATE INDEX IF NOT EXISTS "channels_server_category_pos_idx" ON "channels"("server_id", "category_id", "position");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "attachments" jsonb DEFAULT '[]',
  "embeds" jsonb DEFAULT '[]',
  "reply_to_id" uuid REFERENCES "messages"("id") ON DELETE SET NULL,
  "edited_at" timestamp,
  "pinned" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "messages_channel_id_idx" ON "messages"("channel_id");
CREATE INDEX IF NOT EXISTS "messages_author_id_idx" ON "messages"("author_id");
CREATE INDEX IF NOT EXISTS "messages_reply_to_id_idx" ON "messages"("reply_to_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at");
CREATE INDEX IF NOT EXISTS "messages_channel_created_idx" ON "messages"("channel_id", "created_at");
CREATE INDEX IF NOT EXISTS "messages_pinned_idx" ON "messages"("pinned", "channel_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "color" varchar(7) NOT NULL DEFAULT '#5865F2',
  "permissions" integer NOT NULL DEFAULT 0,
  "position" integer NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "roles_server_id_idx" ON "roles"("server_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "members" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "nickname" varchar(32),
  "roles" jsonb DEFAULT '[]',
  "joined_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "server_id")
);

CREATE INDEX IF NOT EXISTS "members_user_id_server_id_idx" ON "members"("user_id", "server_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "invites" (
  "code" varchar(8) PRIMARY KEY,
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "creator_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "uses" integer NOT NULL DEFAULT 0,
  "max_uses" integer,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "invites_server_id_idx" ON "invites"("server_id");
CREATE INDEX IF NOT EXISTS "invites_creator_id_idx" ON "invites"("creator_id");
CREATE INDEX IF NOT EXISTS "invites_server_expires_idx" ON "invites"("server_id", "expires_at");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "reactions" (
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emoji" varchar(100) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("message_id", "user_id", "emoji")
);

CREATE INDEX IF NOT EXISTS "reactions_message_id_user_id_emoji_idx" ON "reactions"("message_id", "user_id", "emoji");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "dm_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar(20) NOT NULL,
  "name" varchar(100),
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "dm_participants" (
  "dm_channel_id" uuid NOT NULL REFERENCES "dm_channels"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("dm_channel_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "dm_participants_dm_channel_id_user_id_idx" ON "dm_participants"("dm_channel_id", "user_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "read_states" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "last_read_message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "mention_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "channel_id")
);

CREATE INDEX IF NOT EXISTS "read_states_user_id_channel_id_idx" ON "read_states"("user_id", "channel_id");
