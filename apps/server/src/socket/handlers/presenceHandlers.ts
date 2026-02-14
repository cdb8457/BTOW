import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import type { RedisClientType } from 'redis';

export function registerPresenceHandlers(
  io: SocketIOServer,
  socket: AuthenticatedSocket,
  redis: RedisClientType
) {
  socket.on('presence:update', async (data) => {
    try {
      const { status } = data as { status: string };
      if (!['online', 'idle', 'dnd', 'offline'].includes(status)) return;

      await redis.hSet(`presence:${socket.userId}`, {
        status,
        lastSeen: Date.now().toString(),
      });
      await redis.expire(`presence:${socket.userId}`, 300);

      // Broadcast to all server rooms this socket is in
      socket.rooms.forEach((room) => {
        if (room.startsWith('server:')) {
          io.to(room).emit('presence:changed', {
            userId: socket.userId,
            status,
          });
        }
      });
    } catch (err) {
      console.error('[Socket] presence:update error:', err);
    }
  });
}
