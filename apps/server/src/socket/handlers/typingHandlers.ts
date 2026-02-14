import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import type { RedisClientType } from 'redis';

export function registerTypingHandlers(
  _io: SocketIOServer,
  socket: AuthenticatedSocket,
  redis: RedisClientType
) {
  socket.on('typing:start', async (data) => {
    try {
      const { channelId } = data as { channelId: string };
      if (!channelId) return;

      await redis.set(`typing:${channelId}:${socket.userId}`, '1', { EX: 5 });

      socket.to(`channel:${channelId}`).emit('typing:update', {
        channelId,
        userId: socket.userId,
        username: socket.username,
        typing: true,
      });
    } catch (err) {
      console.error('[Socket] typing:start error:', err);
    }
  });

  socket.on('typing:stop', async (data) => {
    try {
      const { channelId } = data as { channelId: string };
      if (!channelId) return;

      await redis.del(`typing:${channelId}:${socket.userId}`);

      socket.to(`channel:${channelId}`).emit('typing:update', {
        channelId,
        userId: socket.userId,
        username: socket.username,
        typing: false,
      });
    } catch (err) {
      console.error('[Socket] typing:stop error:', err);
    }
  });
}
