// Socket.IO event names and payloads
export const SOCKET_EVENTS = {
  // Client -> Server
  CLIENT: {
    MESSAGE_SEND: 'message:send',
    MESSAGE_EDIT: 'message:edit',
    MESSAGE_DELETE: 'message:delete',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    PRESENCE_UPDATE: 'presence:update',
    VOICE_JOIN: 'voice:join',
    VOICE_LEAVE: 'voice:leave',
    VOICE_MUTE: 'voice:mute',
    VOICE_DEAFEN: 'voice:deafen',
    REACTION_ADD: 'reaction:add',
    REACTION_REMOVE: 'reaction:remove',
    CHANNEL_MARK_READ: 'channel:mark_read',
  },

  // Server -> Client
  SERVER: {
    MESSAGE_NEW: 'message:new',
    MESSAGE_UPDATED: 'message:updated',
    MESSAGE_DELETED: 'message:deleted',
    TYPING_UPDATE: 'typing:update',
    PRESENCE_CHANGED: 'presence:changed',
    MEMBER_JOINED: 'member:joined',
    MEMBER_LEFT: 'member:left',
    VOICE_USER_JOINED: 'voice:user_joined',
    VOICE_USER_LEFT: 'voice:user_left',
    VOICE_SPEAKING: 'voice:speaking',
    REACTION_ADDED: 'reaction:added',
    REACTION_REMOVED: 'reaction:removed',
    CHANNEL_CREATED: 'channel:created',
    CHANNEL_UPDATED: 'channel:updated',
    CHANNEL_DELETED: 'channel:deleted',
    SERVER_UPDATED: 'server:updated',
  },
} as const;

// Room patterns
export const ROOM_PATTERNS = {
  USER: (userId: string) => `user:${userId}`,
  SERVER: (serverId: string) => `server:${serverId}`,
  CHANNEL: (channelId: string) => `channel:${channelId}`,
} as const;