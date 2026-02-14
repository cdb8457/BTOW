import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth';
import { registerMessageHandlers } from './handlers/messageHandlers';
import { registerTypingHandlers } from './handlers/typingHandlers';
import { registerPresenceHandlers } from './handlers/presenceHandlers';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { registerVoiceHandlers } from './handlers/voiceHandlers';
import { registerDMHandlers } from './handlers/dmHandlers';
import type { AuthenticatedSocket } from './types';
import { db } from '../db';
import { members } from '../db/schema';
import { eq } from 'drizzle-orm';

const authService = new AuthService();

async function setUserPresence(
  redis: ReturnType<typeof createClient>,
  userId: string,
  status: string
) {
  await redis.hSet(`presence:${userId}`, {
    status,
    lastSeen: Date.now().toString(),
  });
  await redis.expire(`presence:${userId}`, 300);
}

function broadcastPresence(
  io: SocketIOServer,
  socket: AuthenticatedSocket,
  status: string
) {
  socket.rooms.forEach((room) => {
    if (room.startsWith('server:')) {
      io.to(room).emit('presence:changed', { userId: socket.userId, status });
    }
  });
}

async function clearUserTyping(
  redis: ReturnType<typeof createClient>,
  userId: string
) {
  const keys = await redis.keys(`typing:*:${userId}`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

async function joinUserRooms(socket: AuthenticatedSocket) {
  socket.join(`user:${socket.userId}`);

  const userServers = await db
    .select({ serverId: members.serverId })
    .from(members)
    .where(eq(members.userId, socket.userId!));

  for (const { serverId } of userServers) {
    socket.join(`server:${serverId}`);
  }
}

export async function initializeSocketIO(fastify: FastifyInstance) {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,
  });

  // ─── Redis adapter for horizontal scaling ───
  const redisUrl = process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || 'devpassword'}@localhost:6379`;
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('[Redis pub] error:', err));
  subClient.on('error', (err) => console.error('[Redis sub] error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // Expose redis client for handlers
  (io as any).redisClient = pubClient;

  // ─── JWT auth middleware ───
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Authentication required'));

      const payload = authService.verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.username = payload.username;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection handler ───
  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`[Socket] Connected: ${socket.username} (${socket.id})`);

    await joinUserRooms(socket);
    await setUserPresence(pubClient, socket.userId!, 'online');
    broadcastPresence(io, socket, 'online');

    // Register all event handlers
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket, pubClient as any);
    registerPresenceHandlers(io, socket, pubClient as any);
    registerRoomHandlers(io, socket);
    registerVoiceHandlers(io, socket);
    registerDMHandlers(io, socket);

    // ─── Disconnect ───
    socket.on('disconnect', async (reason) => {
      console.log(`[Socket] Disconnected: ${socket.username} — ${reason}`);

      // 10-second grace period for page refreshes
      setTimeout(async () => {
        const sockets = await io.in(`user:${socket.userId}`).fetchSockets();
        if (sockets.length === 0) {
          await setUserPresence(pubClient, socket.userId!, 'offline');
          broadcastPresence(io, socket, 'offline');
          await clearUserTyping(pubClient, socket.userId!);
        }
      }, 10000);
    });
  });

  // Make io accessible from REST routes if needed
  (fastify as any).io = io;

  console.log('[Socket] WebSocket server ready');
  return io;
}
