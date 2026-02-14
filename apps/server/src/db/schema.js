"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStatesRelations = exports.dmParticipantsRelations = exports.dmChannelsRelations = exports.reactionsRelations = exports.invitesRelations = exports.membersRelations = exports.rolesRelations = exports.messagesRelations = exports.channelsRelations = exports.categoriesRelations = exports.serversRelations = exports.pushSubscriptionsRelations = exports.usersRelations = exports.pushSubscriptions = exports.readStates = exports.dmParticipants = exports.dmChannels = exports.reactions = exports.invites = exports.members = exports.roles = exports.messages = exports.channels = exports.categories = exports.servers = exports.users = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
// Users table
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    username: (0, pg_core_1.varchar)('username', { length: 32 }).notNull().unique(),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 32 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    avatarUrl: (0, pg_core_1.varchar)('avatar_url', { length: 512 }),
    bannerUrl: (0, pg_core_1.varchar)('banner_url', { length: 512 }),
    status: (0, pg_core_1.varchar)('status', { length: 10, enum: ['online', 'idle', 'dnd', 'offline'] }).notNull().default('offline'),
    customStatus: (0, pg_core_1.text)('custom_status'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, function (table) { return ({
    emailIdx: (0, pg_core_1.index)('users_email_idx').on(table.email),
    usernameIdx: (0, pg_core_1.index)('users_username_idx').on(table.username),
}); });
// Servers table
exports.servers = (0, pg_core_1.pgTable)('servers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    iconUrl: (0, pg_core_1.varchar)('icon_url', { length: 512 }),
    description: (0, pg_core_1.text)('description'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, function (table) { return ({
    ownerIdIdx: (0, pg_core_1.index)('servers_owner_id_idx').on(table.ownerId),
}); });
// Categories table
exports.categories = (0, pg_core_1.pgTable)('categories', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    serverId: (0, pg_core_1.uuid)('server_id').notNull().references(function () { return exports.servers.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    position: (0, pg_core_1.integer)('position').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, function (table) { return ({
    serverIdIdx: (0, pg_core_1.index)('categories_server_id_idx').on(table.serverId),
}); });
// Channels table
exports.channels = (0, pg_core_1.pgTable)('channels', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    serverId: (0, pg_core_1.uuid)('server_id').notNull().references(function () { return exports.servers.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 10, enum: ['text', 'voice'] }).notNull(),
    topic: (0, pg_core_1.text)('topic'),
    categoryId: (0, pg_core_1.uuid)('category_id').references(function () { return exports.categories.id; }, { onDelete: 'set null' }),
    position: (0, pg_core_1.integer)('position').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, function (table) { return ({
    serverIdIdx: (0, pg_core_1.index)('channels_server_id_idx').on(table.serverId),
    categoryIdIdx: (0, pg_core_1.index)('channels_category_id_idx').on(table.categoryId),
    serverCategoryPosIdx: (0, pg_core_1.index)('channels_server_category_pos_idx').on(table.serverId, table.categoryId, table.position),
}); });
// Messages table
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    channelId: (0, pg_core_1.uuid)('channel_id').notNull().references(function () { return exports.channels.id; }, { onDelete: 'cascade' }),
    authorId: (0, pg_core_1.uuid)('author_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    content: (0, pg_core_1.text)('content').notNull(),
    attachments: (0, pg_core_1.jsonb)('attachments').$type().default([]),
    embeds: (0, pg_core_1.jsonb)('embeds').$type().default([]),
    linkPreview: (0, pg_core_1.jsonb)('link_preview').$type(),
    replyToId: (0, pg_core_1.uuid)('reply_to_id').references(function () { return exports.messages.id; }, { onDelete: 'set null' }),
    editedAt: (0, pg_core_1.timestamp)('edited_at'),
    pinned: (0, pg_core_1.boolean)('pinned').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, function (table) { return ({
    channelIdIdx: (0, pg_core_1.index)('messages_channel_id_idx').on(table.channelId),
    authorIdIdx: (0, pg_core_1.index)('messages_author_id_idx').on(table.authorId),
    replyToIdIdx: (0, pg_core_1.index)('messages_reply_to_id_idx').on(table.replyToId),
    createdAtIdx: (0, pg_core_1.index)('messages_created_at_idx').on(table.createdAt),
    channelCreatedIdx: (0, pg_core_1.index)('messages_channel_created_idx').on(table.channelId, table.createdAt),
    pinnedIdx: (0, pg_core_1.index)('messages_pinned_idx').on(table.pinned, table.channelId),
}); });
// Roles table
exports.roles = (0, pg_core_1.pgTable)('roles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    serverId: (0, pg_core_1.uuid)('server_id').notNull().references(function () { return exports.servers.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    color: (0, pg_core_1.varchar)('color', { length: 7 }).notNull().default('#5865F2'),
    permissions: (0, pg_core_1.integer)('permissions').notNull().default(0),
    position: (0, pg_core_1.integer)('position').notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, function (table) { return ({
    serverIdIdx: (0, pg_core_1.index)('roles_server_id_idx').on(table.serverId),
}); });
// Members table (junction table for users and servers)
exports.members = (0, pg_core_1.pgTable)('members', {
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    serverId: (0, pg_core_1.uuid)('server_id').notNull().references(function () { return exports.servers.id; }, { onDelete: 'cascade' }),
    nickname: (0, pg_core_1.varchar)('nickname', { length: 32 }),
    roles: (0, pg_core_1.jsonb)('roles').$type().default([]),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').notNull().defaultNow(),
}, function (table) { return ({
    userIdServerIdIdx: (0, pg_core_1.index)('members_user_id_server_id_idx').on(table.userId, table.serverId),
}); });
// Invites table
exports.invites = (0, pg_core_1.pgTable)('invites', {
    code: (0, pg_core_1.varchar)('code', { length: 8 }).primaryKey(),
    serverId: (0, pg_core_1.uuid)('server_id').notNull().references(function () { return exports.servers.id; }, { onDelete: 'cascade' }),
    creatorId: (0, pg_core_1.uuid)('creator_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    uses: (0, pg_core_1.integer)('uses').notNull().default(0),
    maxUses: (0, pg_core_1.integer)('max_uses'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, function (table) { return ({
    serverIdIdx: (0, pg_core_1.index)('invites_server_id_idx').on(table.serverId),
    creatorIdIdx: (0, pg_core_1.index)('invites_creator_id_idx').on(table.creatorId),
    serverExpiresIdx: (0, pg_core_1.index)('invites_server_expires_idx').on(table.serverId, table.expiresAt),
}); });
// Reactions table
exports.reactions = (0, pg_core_1.pgTable)('reactions', {
    messageId: (0, pg_core_1.uuid)('message_id').notNull().references(function () { return exports.messages.id; }, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    emoji: (0, pg_core_1.varchar)('emoji', { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, function (table) { return ({
    messageIdUserIdEmojiIdx: (0, pg_core_1.index)('reactions_message_id_user_id_emoji_idx').on(table.messageId, table.userId, table.emoji),
}); });
// DM Channels table
exports.dmChannels = (0, pg_core_1.pgTable)('dm_channels', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    type: (0, pg_core_1.varchar)('type', { length: 20, enum: ['dm', 'group_dm'] }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }),
    ownerId: (0, pg_core_1.uuid)('owner_id').references(function () { return exports.users.id; }, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// DM Participants table (junction table for users and DM channels)
exports.dmParticipants = (0, pg_core_1.pgTable)('dm_participants', {
    dmChannelId: (0, pg_core_1.uuid)('dm_channel_id').notNull().references(function () { return exports.dmChannels.id; }, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').notNull().defaultNow(),
}, function (table) { return ({
    dmChannelIdUserIdIdx: (0, pg_core_1.index)('dm_participants_dm_channel_id_user_id_idx').on(table.dmChannelId, table.userId),
}); });
// Read State table
exports.readStates = (0, pg_core_1.pgTable)('read_states', {
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    channelId: (0, pg_core_1.uuid)('channel_id').notNull().references(function () { return exports.channels.id; }, { onDelete: 'cascade' }),
    lastReadMessageId: (0, pg_core_1.uuid)('last_read_message_id').notNull().references(function () { return exports.messages.id; }, { onDelete: 'cascade' }),
    mentionCount: (0, pg_core_1.integer)('mention_count').notNull().default(0),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, function (table) { return ({
    userIdChannelIdIdx: (0, pg_core_1.index)('read_states_user_id_channel_id_idx').on(table.userId, table.channelId),
}); });
// Push Subscriptions table
exports.pushSubscriptions = (0, pg_core_1.pgTable)('push_subscriptions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    endpoint: (0, pg_core_1.text)('endpoint').notNull().unique(),
    p256dh: (0, pg_core_1.text)('p256dh').notNull(),
    auth: (0, pg_core_1.text)('auth').notNull(),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)('push_subscriptions_user_idx').on(table.userId),
}); });
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, function (_a) {
    var many = _a.many;
    return ({
        ownedServers: many(exports.servers),
        messages: many(exports.messages),
        createdInvites: many(exports.invites),
        reactions: many(exports.reactions),
        dmParticipants: many(exports.dmParticipants),
        readStates: many(exports.readStates),
        pushSubscriptions: many(exports.pushSubscriptions),
    });
});
exports.pushSubscriptionsRelations = (0, drizzle_orm_1.relations)(exports.pushSubscriptions, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.pushSubscriptions.userId],
            references: [exports.users.id],
        }),
    });
});
exports.serversRelations = (0, drizzle_orm_1.relations)(exports.servers, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        owner: one(exports.users, {
            fields: [exports.servers.ownerId],
            references: [exports.users.id],
        }),
        categories: many(exports.categories),
        channels: many(exports.channels),
        roles: many(exports.roles),
        members: many(exports.members),
        invites: many(exports.invites),
    });
});
exports.categoriesRelations = (0, drizzle_orm_1.relations)(exports.categories, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        server: one(exports.servers, {
            fields: [exports.categories.serverId],
            references: [exports.servers.id],
        }),
        channels: many(exports.channels),
    });
});
exports.channelsRelations = (0, drizzle_orm_1.relations)(exports.channels, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        server: one(exports.servers, {
            fields: [exports.channels.serverId],
            references: [exports.servers.id],
        }),
        category: one(exports.categories, {
            fields: [exports.channels.categoryId],
            references: [exports.categories.id],
        }),
        messages: many(exports.messages),
        readStates: many(exports.readStates),
    });
});
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        channel: one(exports.channels, {
            fields: [exports.messages.channelId],
            references: [exports.channels.id],
        }),
        author: one(exports.users, {
            fields: [exports.messages.authorId],
            references: [exports.users.id],
        }),
        replyTo: one(exports.messages, {
            fields: [exports.messages.replyToId],
            references: [exports.messages.id],
        }),
        reactions: many(exports.reactions),
        readStates: many(exports.readStates),
    });
});
exports.rolesRelations = (0, drizzle_orm_1.relations)(exports.roles, function (_a) {
    var one = _a.one;
    return ({
        server: one(exports.servers, {
            fields: [exports.roles.serverId],
            references: [exports.servers.id],
        }),
    });
});
exports.membersRelations = (0, drizzle_orm_1.relations)(exports.members, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.members.userId],
            references: [exports.users.id],
        }),
        server: one(exports.servers, {
            fields: [exports.members.serverId],
            references: [exports.servers.id],
        }),
    });
});
exports.invitesRelations = (0, drizzle_orm_1.relations)(exports.invites, function (_a) {
    var one = _a.one;
    return ({
        server: one(exports.servers, {
            fields: [exports.invites.serverId],
            references: [exports.servers.id],
        }),
        creator: one(exports.users, {
            fields: [exports.invites.creatorId],
            references: [exports.users.id],
        }),
    });
});
exports.reactionsRelations = (0, drizzle_orm_1.relations)(exports.reactions, function (_a) {
    var one = _a.one;
    return ({
        message: one(exports.messages, {
            fields: [exports.reactions.messageId],
            references: [exports.messages.id],
        }),
        user: one(exports.users, {
            fields: [exports.reactions.userId],
            references: [exports.users.id],
        }),
    });
});
exports.dmChannelsRelations = (0, drizzle_orm_1.relations)(exports.dmChannels, function (_a) {
    var many = _a.many, one = _a.one;
    return ({
        participants: many(exports.dmParticipants),
        owner: one(exports.users, {
            fields: [exports.dmChannels.ownerId],
            references: [exports.users.id],
        }),
    });
});
exports.dmParticipantsRelations = (0, drizzle_orm_1.relations)(exports.dmParticipants, function (_a) {
    var one = _a.one;
    return ({
        dmChannel: one(exports.dmChannels, {
            fields: [exports.dmParticipants.dmChannelId],
            references: [exports.dmChannels.id],
        }),
        user: one(exports.users, {
            fields: [exports.dmParticipants.userId],
            references: [exports.users.id],
        }),
    });
});
exports.readStatesRelations = (0, drizzle_orm_1.relations)(exports.readStates, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.readStates.userId],
            references: [exports.users.id],
        }),
        channel: one(exports.channels, {
            fields: [exports.readStates.channelId],
            references: [exports.channels.id],
        }),
        lastReadMessage: one(exports.messages, {
            fields: [exports.readStates.lastReadMessageId],
            references: [exports.messages.id],
        }),
    });
});
