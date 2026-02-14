import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { db } from '../../db';
import { readStates } from '../../db/schema';

export function registerRoomHandlers(
  _io: SocketIOServer,
  socket: AuthenticatedSocket
) {
  socket.on('channel:focus', (data) => {
    const { channelId } = data as { channelId: string };
    if (!channelId) return;

    // Leave previous active channel room
    if (socket.activeChannel && socket.activeChannel !== channelId) {
      socket.leave(`channel:${socket.activeChannel}`);
    }

    socket.join(`channel:${channelId}`);
    socket.activeChannel = channelId;
  });

  socket.on('channel:blur', (data) => {
    const { channelId } = data as { channelId: string };
    if (!channelId) return;

    socket.leave(`channel:${channelId}`);
    if (socket.activeChannel === channelId) {
      socket.activeChannel = undefined;
    }
  });

  socket.on('channel:mark_read', async (data) => {
    try {
      const { channelId, messageId } = data as { channelId: string; messageId: string };
      if (!channelId || !messageId) return;

      await db
        .insert(readStates)
        .values({
          userId: socket.userId!,
          channelId,
          lastReadMessageId: messageId,
          mentionCount: 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [readStates.userId, readStates.channelId],
          set: {
            lastReadMessageId: messageId,
            mentionCount: 0,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.error('[Socket] channel:mark_read error:', err);
    }
  });
}
