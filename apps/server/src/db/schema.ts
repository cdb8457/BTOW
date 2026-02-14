import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, index, AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 32 }).notNull().unique(),
  displayName: varchar('display_name', { length: 32 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  bannerUrl: varchar('banner_url', { length: 512 }),
  status: varchar('status', { length: 10, enum: ['online', 'idle', 'dnd', 'offline'] }).notNull().default('offline'),
  customStatus: text('custom_status'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  usernameIdx: index('users_username_idx').on(table.username),
}));

// Servers table
export const servers = pgTable('servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  iconUrl: varchar('icon_url', { length: 512 }),
  description: text('description'),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ownerIdIdx: index('servers_owner_id_idx').on(table.ownerId),
}));

// Categories table
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serverIdIdx: index('categories_server_id_idx').on(table.serverId),
}));

// Channels table
export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 10, enum: ['text', 'voice'] }).notNull(),
  topic: text('topic'),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  serverIdIdx: index('channels_server_id_idx').on(table.serverId),
  categoryIdIdx: index('channels_category_id_idx').on(table.categoryId),
  serverCategoryPosIdx: index('channels_server_category_pos_idx').on(table.serverId, table.categoryId, table.position),
}));

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  attachments: jsonb('attachments').$type<Array<any>>().default([]),
  embeds: jsonb('embeds').$type<Array<any>>().default([]),
  linkPreview: jsonb('link_preview').$type<{
    url: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    site_name: string | null;
  } | null>(),
  replyToId: uuid('reply_to_id').references((): AnyPgColumn => messages.id, { onDelete: 'set null' }),
  editedAt: timestamp('edited_at'),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  channelIdIdx: index('messages_channel_id_idx').on(table.channelId),
  authorIdIdx: index('messages_author_id_idx').on(table.authorId),
  replyToIdIdx: index('messages_reply_to_id_idx').on(table.replyToId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  channelCreatedIdx: index('messages_channel_created_idx').on(table.channelId, table.createdAt),
  pinnedIdx: index('messages_pinned_idx').on(table.pinned, table.channelId),
}));

// Roles table
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#5865F2'),
  permissions: integer('permissions').notNull().default(0),
  position: integer('position').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  hoist: boolean('hoist').notNull().default(false),
  mentionable: boolean('mentionable').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serverIdIdx: index('roles_server_id_idx').on(table.serverId),
}));

// Members table (junction table for users and servers)
export const members = pgTable('members', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  nickname: varchar('nickname', { length: 32 }),
  roles: jsonb('roles').$type<string[]>().default([]),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  userIdServerIdIdx: index('members_user_id_server_id_idx').on(table.userId, table.serverId),
}));

// Invites table
export const invites = pgTable('invites', {
  code: varchar('code', { length: 8 }).primaryKey(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  uses: integer('uses').notNull().default(0),
  maxUses: integer('max_uses'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serverIdIdx: index('invites_server_id_idx').on(table.serverId),
  creatorIdIdx: index('invites_creator_id_idx').on(table.creatorId),
  serverExpiresIdx: index('invites_server_expires_idx').on(table.serverId, table.expiresAt),
}));

// Reactions table
export const reactions = pgTable('reactions', {
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: varchar('emoji', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  messageIdUserIdEmojiIdx: index('reactions_message_id_user_id_emoji_idx').on(table.messageId, table.userId, table.emoji),
}));

// DM Channels table
export const dmChannels = pgTable('dm_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20, enum: ['dm', 'group_dm'] }).notNull(),
  name: varchar('name', { length: 100 }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// DM Participants table (junction table for users and DM channels)
export const dmParticipants = pgTable('dm_participants', {
  dmChannelId: uuid('dm_channel_id').notNull().references(() => dmChannels.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  dmChannelIdUserIdIdx: index('dm_participants_dm_channel_id_user_id_idx').on(table.dmChannelId, table.userId),
}));

// Read State table
export const readStates = pgTable('read_states', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  lastReadMessageId: uuid('last_read_message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  mentionCount: integer('mention_count').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdChannelIdIdx: index('read_states_user_id_channel_id_idx').on(table.userId, table.channelId),
}));

// Push Subscriptions table
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('push_subscriptions_user_idx').on(table.userId),
}));

// Server Bans table
export const serverBans = pgTable('server_bans', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bannedBy: uuid('banned_by').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serverIdIdx: index('bans_server_id_idx').on(table.serverId),
  userIdServerIdIdx: index('bans_user_id_server_id_idx').on(table.userId, table.serverId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedServers: many(servers),
  messages: many(messages),
  createdInvites: many(invites),
  reactions: many(reactions),
  dmParticipants: many(dmParticipants),
  readStates: many(readStates),
  pushSubscriptions: many(pushSubscriptions),
  serverBans: many(serverBans),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  owner: one(users, {
    fields: [servers.ownerId],
    references: [users.id],
  }),
  categories: many(categories),
  channels: many(channels),
  roles: many(roles),
  members: many(members),
  invites: many(invites),
  bans: many(serverBans),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  server: one(servers, {
    fields: [categories.serverId],
    references: [servers.id],
  }),
  channels: many(channels),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  server: one(servers, {
    fields: [channels.serverId],
    references: [servers.id],
  }),
  category: one(categories, {
    fields: [channels.categoryId],
    references: [categories.id],
  }),
  messages: many(messages),
  readStates: many(readStates),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  author: one(users, {
    fields: [messages.authorId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
  reactions: many(reactions),
  readStates: many(readStates),
}));

export const rolesRelations = relations(roles, ({ one }) => ({
  server: one(servers, {
    fields: [roles.serverId],
    references: [servers.id],
  }),
}));

export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  server: one(servers, {
    fields: [members.serverId],
    references: [servers.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  server: one(servers, {
    fields: [invites.serverId],
    references: [servers.id],
  }),
  creator: one(users, {
    fields: [invites.creatorId],
    references: [users.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  message: one(messages, {
    fields: [reactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const dmChannelsRelations = relations(dmChannels, ({ many, one }) => ({
  participants: many(dmParticipants),
  owner: one(users, {
    fields: [dmChannels.ownerId],
    references: [users.id],
  }),
}));

export const dmParticipantsRelations = relations(dmParticipants, ({ one }) => ({
  dmChannel: one(dmChannels, {
    fields: [dmParticipants.dmChannelId],
    references: [dmChannels.id],
  }),
  user: one(users, {
    fields: [dmParticipants.userId],
    references: [users.id],
  }),
}));

export const readStatesRelations = relations(readStates, ({ one }) => ({
  user: one(users, {
    fields: [readStates.userId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [readStates.channelId],
    references: [channels.id],
  }),
  lastReadMessage: one(messages, {
    fields: [readStates.lastReadMessageId],
    references: [messages.id],
  }),
}));

export const serverBansRelations = relations(serverBans, ({ one }) => ({
  server: one(servers, {
    fields: [serverBans.serverId],
    references: [servers.id],
  }),
  user: one(users, {
    fields: [serverBans.userId],
    references: [users.id],
  }),
  bannedByUser: one(users, {
    fields: [serverBans.bannedBy],
    references: [users.id],
  }),
}));



