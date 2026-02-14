// Database types and interfaces for BTOW
export interface User {
  id: string;                    // UUID v7 (time-sortable)
  username: string;              // Unique, 2-32 chars, alphanumeric + underscore
  display_name: string;          // 1-32 chars, any characters
  email: string;                 // Unique, validated
  password_hash: string;         // bcrypt, cost 12
  avatar_url: string | null;     // Path in MinIO
  banner_url: string | null;     // Profile banner image
  status: 'online' | 'idle' | 'dnd' | 'offline';
  custom_status: string | null;  // "Playing Valorant" etc.
  created_at: Date;
  updated_at: Date;
}

export interface Server {
  id: string;                    // UUID v7
  name: string;                  // 1-100 chars
  icon_url: string | null;       // Path in MinIO
  description: string | null;    // Up to 1000 chars
  owner_id: string;              // FK -> User.id
  created_at: Date;
  updated_at: Date;
}

export interface Channel {
  id: string;                    // UUID v7
  server_id: string;             // FK -> Server.id
  name: string;                  // 1-100 chars
  type: 'text' | 'voice';
  topic: string | null;          // Channel description/topic
  category_id: string | null;    // FK -> Category.id (nullable for uncategorized)
  position: number;              // Sort order within category
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;                    // UUID v7
  server_id: string;             // FK -> Server.id
  name: string;                  // 1-100 chars
  position: number;              // Sort order
  created_at: Date;
}

export interface Message {
  id: string;                    // UUID v7 (time-sortable = natural chronological order)
  channel_id: string;            // FK -> Channel.id
  author_id: string;             // FK -> User.id
  content: string;               // Up to 4000 chars, markdown supported
  attachments: Attachment[];     // JSON array
  embeds: Embed[];               // JSON array (link previews)
  reply_to_id: string | null;    // FK -> Message.id (for replies)
  edited_at: Date | null;
  pinned: boolean;
  created_at: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;                   // MinIO presigned URL
  content_type: string;          // MIME type
  size: number;                  // Bytes
}

export interface Embed {
  type: 'link';
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export interface Member {
  user_id: string;               // FK -> User.id
  server_id: string;             // FK -> Server.id
  nickname: string | null;       // Server-specific display name
  roles: string[];               // Array of Role IDs
  joined_at: Date;
}

export interface Role {
  id: string;                    // UUID v7
  server_id: string;             // FK -> Server.id
  name: string;                  // 1-100 chars
  color: string;                 // Hex color (#5865F2)
  permissions: number;           // Bitmask
  position: number;              // Hierarchy (higher = more authority)
  is_default: boolean;           // Auto-assigned on join
  created_at: Date;
}

export enum Permission {
  VIEW_CHANNELS       = 1 << 0,   // 1
  SEND_MESSAGES       = 1 << 1,   // 2
  MANAGE_MESSAGES     = 1 << 2,   // 4  (delete others' messages)
  ATTACH_FILES        = 1 << 3,   // 8
  ADD_REACTIONS       = 1 << 4,   // 16
  CONNECT_VOICE       = 1 << 5,   // 32
  SPEAK_VOICE         = 1 << 6,   // 64
  MUTE_MEMBERS        = 1 << 7,   // 128
  MANAGE_CHANNELS     = 1 << 8,   // 256
  MANAGE_ROLES        = 1 << 9,   // 512
  MANAGE_SERVER       = 1 << 10,  // 1024
  KICK_MEMBERS        = 1 << 11,  // 2048
  BAN_MEMBERS         = 1 << 12,  // 4096
  CREATE_INVITES      = 1 << 13,  // 8192
  ADMINISTRATOR       = 1 << 14,  // 16384 (all permissions)
}

export interface Invite {
  code: string;                  // 8-char alphanumeric, unique
  server_id: string;             // FK -> Server.id
  creator_id: string;            // FK -> User.id
  uses: number;                  // Current use count
  max_uses: number | null;       // null = unlimited
  expires_at: Date | null;       // null = never
  created_at: Date;
}

export interface Reaction {
  message_id: string;            // FK -> Message.id
  user_id: string;               // FK -> User.id
  emoji: string;                 // Unicode emoji or custom emoji ID
  created_at: Date;
}

export interface DMChannel {
  id: string;                    // UUID v7
  type: 'dm' | 'group_dm';
  name: string | null;           // Only for group DMs
  owner_id: string | null;       // Only for group DMs
  created_at: Date;
}

export interface DMParticipant {
  dm_channel_id: string;         // FK -> DMChannel.id
  user_id: string;               // FK -> User.id
  joined_at: Date;
}

export interface ReadState {
  user_id: string;               // FK -> User.id
  channel_id: string;            // FK -> Channel.id
  last_read_message_id: string;  // FK -> Message.id
  mention_count: number;         // Unread @mentions
  updated_at: Date;
}