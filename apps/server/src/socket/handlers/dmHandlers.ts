import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { db } from '../../db';
import { dmParticipants } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export function registerDMHandlers(_io: SocketIOServer, socket: AuthenticatedSocket) {
  const userId = socket.userId!;

  // User joins their personal room on connect (already done in socket/index.ts via joinUserRooms,
  // but we ensure it here as well in case the handler is registered at a different point)
  socket.join(`user:${userId}`);

  socket.on('dm:typing:start', async ({ dm_channel_id }: { dm_channel_id: string }) => {
    // Verify user is a participant of this DM channel
    const [participation] = await db
      .select()
      .from(dmParticipants)
      .where(and(
        eq(dmParticipants.dmChannelId, dm_channel_id),
        eq(dmParticipants.userId, userId)
      ))
      .limit(1);

    if (!participation) {
      socket.emit('error', { message: 'Not authorized for this DM channel' });
      return;
    }

    socket.to(`dm:${dm_channel_id}`).emit('dm:typing:update', {
      dm_channel_id,
      user_id: userId,
      typing: true,
    });

    // Auto-clear typing after 5 seconds
    setTimeout(() => {
      socket.to(`dm:${dm_channel_id}`).emit('dm:typing:update', {
        dm_channel_id,
        user_id: userId,
        typing: false,
      });
    }, 5000);
  });

  socket.on('dm:typing:stop', async ({ dm_channel_id }: { dm_channel_id: string }) => {
    // Verify user is a participant of this DM channel
    const [participation] = await db
      .select()
      .from(dmParticipants)
      .where(and(
        eq(dmParticipants.dmChannelId, dm_channel_id),
        eq(dmParticipants.userId, userId)
      ))
      .limit(1);

    if (!participation) return;

    socket.to(`dm:${dm_channel_id}`).emit('dm:typing:update', {
      dm_channel_id,
      user_id: userId,
      typing: false,
    });
  });

  // Allow a socket to join a DM channel room - with authorization check
  socket.on('dm:join', async ({ dm_channel_id }: { dm_channel_id: string }, callback?: (response: { success: boolean; error?: string }) => void) => {
    // Verify user is a participant of this DM channel
    const [participation] = await db
      .select()
      .from(dmParticipants)
      .where(and(
        eq(dmParticipants.dmChannelId, dm_channel_id),
        eq(dmParticipants.userId, userId)
      ))
      .limit(1);

    if (!participation) {
      const errorResponse = { success: false, error: 'Not authorized for this DM channel' };
      socket.emit('error', { message: errorResponse.error });
      callback?.(errorResponse);
      return;
    }

    socket.join(`dm:${dm_channel_id}`);
    callback?.({ success: true });
  });

  socket.on('dm:leave', ({ dm_channel_id }: { dm_channel_id: string }) => {
    socket.leave(`dm:${dm_channel_id}`);
  });
}
