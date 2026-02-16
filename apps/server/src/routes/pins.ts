import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { messages, users, members, channels } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { decryptMessage } from '../utils/encryption';

// Permission bit for MANAGE_MESSAGES (bit 13 — matches Discord-style permission flags)
const MANAGE_MESSAGES = 1 << 13;

async function hasManageMessages(userId: string, channelId: string): Promise<boolean> {
  const [channel] = await db
    .select({ serverId: channels.serverId })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel) return false;

  const [membership] = await db
    .select({ roles: members.roles })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.serverId, channel.serverId)))
    .limit(1);

  if (!membership) return false;
  // Server owner or any member with MANAGE_MESSAGES in their roles bitmask
  // For now we grant it to all members — fine-grained roles come in a later phase
  return true;
}

export async function pinRoutes(fastify: FastifyInstance) {
  // GET /api/channels/:id/pins — list pinned messages
  fastify.get(
    '/api/channels/:id/pins',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: channelId } = request.params as { id: string };

      const rows = await db
        .select({
          msg: messages,
          author: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.authorId, users.id))
        .where(and(eq(messages.channelId, channelId), eq(messages.pinned, true)))
        .orderBy(desc(messages.createdAt));

      const formatted = rows.map((row) => {
        // Decrypt message content
        let decryptedContent = row.msg.content;
        try {
          decryptedContent = decryptMessage(row.msg.content);
        } catch (err) {
          console.error('[Pins] Failed to decrypt pinned message:', row.msg.id, err);
          decryptedContent = '[Encrypted message - unable to decrypt]';
        }

        return {
          id: row.msg.id,
          channelId: row.msg.channelId,
          authorId: row.msg.authorId,
          author: row.author,
          content: decryptedContent,
          attachments: row.msg.attachments ?? [],
          embeds: row.msg.embeds ?? [],
          replyToId: row.msg.replyToId,
          replyTo: null,
          editedAt: row.msg.editedAt?.toISOString() ?? null,
          pinned: row.msg.pinned,
          reactions: [],
          createdAt: row.msg.createdAt.toISOString(),
          linkPreview: row.msg.linkPreview ?? null,
        };
      });

      return reply.send({ messages: formatted });
    }
  );

  // PUT /api/channels/:id/pins/:mid — pin a message
  fastify.put(
    '/api/channels/:id/pins/:mid',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: channelId, mid: messageId } = request.params as { id: string; mid: string };
      const userId = request.user!.userId;

      const allowed = await hasManageMessages(userId, channelId);
      if (!allowed) {
        return reply.status(403).send({ error: 'Missing MANAGE_MESSAGES permission' });
      }

      await db.update(messages).set({ pinned: true }).where(eq(messages.id, messageId));

      const io = (fastify as any).io;
      if (io) {
        io.to(`channel:${channelId}`).emit('message:updated', { id: messageId, pinned: true });
      }

      return reply.send({ ok: true });
    }
  );

  // DELETE /api/channels/:id/pins/:mid — unpin a message
  fastify.delete(
    '/api/channels/:id/pins/:mid',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: channelId, mid: messageId } = request.params as { id: string; mid: string };
      const userId = request.user!.userId;

      const allowed = await hasManageMessages(userId, channelId);
      if (!allowed) {
        return reply.status(403).send({ error: 'Missing MANAGE_MESSAGES permission' });
      }

      await db.update(messages).set({ pinned: false }).where(eq(messages.id, messageId));

      const io = (fastify as any).io;
      if (io) {
        io.to(`channel:${channelId}`).emit('message:updated', { id: messageId, pinned: false });
      }

      return reply.send({ ok: true });
    }
  );
}

// Export permission constant for use elsewhere
export { MANAGE_MESSAGES };
