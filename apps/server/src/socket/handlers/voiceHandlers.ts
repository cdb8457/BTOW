import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { AccessToken } from 'livekit-server-sdk';
import { db } from '../../db';
import { channels, members } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devapikey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'devapisecret';
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? 'ws://localhost:7880';

export function registerVoiceHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  // ─── voice:join — generate LiveKit token and return to client ────────────
  socket.on('voice:join', async (data: { channelId: string }) => {
    try {
      const { channelId } = data;
      if (!channelId || !socket.userId) return;

      // Verify channel exists and is a voice channel
      const [channel] = await db
        .select({ id: channels.id, serverId: channels.serverId, type: channels.type })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1);

      if (!channel || channel.type !== 'voice') {
        socket.emit('voice:error', { message: 'Channel not found or is not a voice channel' });
        return;
      }

      // Verify user is a member of the server
      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.userId, socket.userId), eq(members.serverId, channel.serverId)))
        .limit(1);

      if (!membership) {
        socket.emit('voice:error', { message: 'Not a member of this server' });
        return;
      }

      // Generate LiveKit access token
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: socket.userId,
        name: socket.username,
        ttl: '4h',
      });

      at.addGrant({
        roomJoin: true,
        room: channelId,       // room name = channel ID
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();

      // Track in socket state
      socket.voiceChannelId = channelId;

      // Join the Socket.IO channel room for real-time events
      socket.join(`channel:${channelId}`);

      // Notify others in the channel
      socket.to(`channel:${channelId}`).emit('voice:user_joined', {
        channelId,
        userId: socket.userId,
        username: socket.username,
      });

      // Return token to the connecting client
      socket.emit('voice:token', {
        token,
        livekitUrl: LIVEKIT_URL,
        channelId,
      });
    } catch (err) {
      console.error('[Socket] voice:join error:', err);
      socket.emit('voice:error', { message: 'Failed to join voice channel' });
    }
  });

  // ─── voice:leave ──────────────────────────────────────────────────────────
  socket.on('voice:leave', (data: { channelId: string }) => {
    const { channelId } = data ?? {};
    if (!channelId) return;

    socket.leave(`channel:${channelId}`);
    socket.to(`channel:${channelId}`).emit('voice:user_left', {
      channelId,
      userId: socket.userId,
    });

    if (socket.voiceChannelId === channelId) {
      socket.voiceChannelId = undefined;
    }
  });

  // ─── voice:mute ───────────────────────────────────────────────────────────
  socket.on('voice:mute', (data: { channelId: string; muted: boolean }) => {
    const { channelId, muted } = data ?? {};
    if (!channelId) return;

    io.to(`channel:${channelId}`).emit('voice:speaking', {
      channelId,
      userId: socket.userId,
      speaking: false,
      muted,
    });
  });

  // ─── voice:deafen ─────────────────────────────────────────────────────────
  socket.on('voice:deafen', (data: { channelId: string; deafened: boolean }) => {
    const { channelId, deafened } = data ?? {};
    if (!channelId) return;

    io.to(`channel:${channelId}`).emit('voice:deafen', {
      channelId,
      userId: socket.userId,
      deafened,
    });
  });

  // ─── Auto-leave on disconnect ──────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (socket.voiceChannelId) {
      socket.to(`channel:${socket.voiceChannelId}`).emit('voice:user_left', {
        channelId: socket.voiceChannelId,
        userId: socket.userId,
      });
    }
  });
}
