import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { reactions, messages } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

export async function reactionRoutes(fastify: FastifyInstance) {
  // PUT /api/messages/:id/reactions/:emoji — add a reaction
  fastify.put(
    '/api/messages/:id/reactions/:emoji',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: messageId, emoji } = request.params as { id: string; emoji: string };
      const userId = request.user!.userId;

      const [msg] = await db
        .select({ id: messages.id, channelId: messages.channelId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!msg) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      await db
        .insert(reactions)
        .values({ messageId, userId, emoji })
        .onConflictDoNothing();

      const io = (fastify as any).io;
      if (io) {
        io.to(`channel:${msg.channelId}`).emit('reaction:added', {
          message_id: messageId,
          user_id: userId,
          emoji,
        });
      }

      return reply.send({ ok: true });
    }
  );

  // DELETE /api/messages/:id/reactions/:emoji/@me — remove own reaction
  fastify.delete(
    '/api/messages/:id/reactions/:emoji/@me',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: messageId, emoji } = request.params as { id: string; emoji: string };
      const userId = request.user!.userId;

      const [msg] = await db
        .select({ id: messages.id, channelId: messages.channelId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!msg) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      await db.delete(reactions).where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.userId, userId),
          eq(reactions.emoji, emoji)
        )
      );

      const io = (fastify as any).io;
      if (io) {
        io.to(`channel:${msg.channelId}`).emit('reaction:removed', {
          message_id: messageId,
          user_id: userId,
          emoji,
        });
      }

      return reply.send({ ok: true });
    }
  );
}
