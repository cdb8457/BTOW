import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { dmChannels, dmParticipants, messages, users } from '../db/schema';
import { eq, and, inArray, desc, lt } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { encryptMessage, decryptMessage } from '../utils/encryption';

export async function dmRoutes(fastify: FastifyInstance) {
  // GET /api/dms — list all DM channels for the current user
  fastify.get(
    '/api/dms',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const participations = await db
        .select({ dmChannelId: dmParticipants.dmChannelId })
        .from(dmParticipants)
        .where(eq(dmParticipants.userId, userId));

      const dmIds = participations.map((p) => p.dmChannelId);
      if (dmIds.length === 0) return reply.send([]);

      const dms = await db
        .select()
        .from(dmChannels)
        .where(inArray(dmChannels.id, dmIds));

      return reply.send(dms);
    }
  );

  // POST /api/dms — open (or find existing) DM with a recipient
  fastify.post(
    '/api/dms',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const { recipient_id } = (request.body ?? {}) as { recipient_id?: string };

      if (!recipient_id) {
        return reply.status(400).send({ error: 'recipient_id is required' });
      }

      // Find existing DM between these two users - single query with subquery
      const myDmChannelIds = db
        .select({ dmChannelId: dmParticipants.dmChannelId })
        .from(dmParticipants)
        .where(eq(dmParticipants.userId, userId))
        .as('my_dm_channels');

      const [existingDm] = await db
        .select({ dmChannelId: dmParticipants.dmChannelId })
        .from(dmParticipants)
        .innerJoin(myDmChannelIds, eq(dmParticipants.dmChannelId, myDmChannelIds.dmChannelId))
        .innerJoin(dmChannels, eq(dmChannels.id, dmParticipants.dmChannelId))
        .where(
          and(
            eq(dmParticipants.userId, recipient_id),
            eq(dmChannels.type, 'dm')
          )
        )
        .limit(1);

      if (existingDm) {
        return reply.send({ id: existingDm.dmChannelId });
      }

      // Create new DM channel
      const [newDm] = await db
        .insert(dmChannels)
        .values({ type: 'dm' })
        .returning({ id: dmChannels.id });

      await db.insert(dmParticipants).values([
        { dmChannelId: newDm.id, userId },
        { dmChannelId: newDm.id, userId: recipient_id },
      ]);

      return reply.status(201).send({ id: newDm.id });
    }
  );

  // GET /api/dms/:id/messages — paginated messages for a DM channel
  fastify.get(
    '/api/dms/:id/messages',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };
      const { before, limit: rawLimit } = request.query as { before?: string; limit?: string };
      const userId = request.user!.userId;

      const [participation] = await db
        .select()
        .from(dmParticipants)
        .where(
          and(
            eq(dmParticipants.dmChannelId, id),
            eq(dmParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participation) {
        return reply.status(403).send({ error: 'Not a participant' });
      }

      const limit = Math.min(parseInt(rawLimit ?? '50', 10), 50);

      const whereClause = before
        ? and(eq(messages.channelId, id), lt(messages.id, before))
        : eq(messages.channelId, id);

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
        .where(whereClause)
        .orderBy(desc(messages.id))
        .limit(limit);

      const formatted = rows.reverse().map((row) => {
        // Decrypt message content
        let decryptedContent = row.msg.content;
        try {
          decryptedContent = decryptMessage(row.msg.content);
        } catch (err) {
          console.error('[DMs] Failed to decrypt message:', row.msg.id, err);
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
        };
      });

      return reply.send({ messages: formatted, hasMore: false });
    }
  );

  // POST /api/dms/:id/messages — send a message in a DM channel
  fastify.post(
    '/api/dms/:id/messages',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;
      const { content, attachments } = (request.body ?? {}) as {
        content?: string;
        attachments?: Array<{ file_url: string; filename: string; content_type: string; size: number }>;
      };

      const [participation] = await db
        .select()
        .from(dmParticipants)
        .where(
          and(
            eq(dmParticipants.dmChannelId, id),
            eq(dmParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participation) {
        return reply.status(403).send({ error: 'Not a participant' });
      }

      const messageContent = content ?? '';
      const now = new Date();
      
      // Encrypt content before storing in DB
      const encryptedContent = encryptMessage(messageContent);
      
      const [inserted] = await db
        .insert(messages)
        .values({
          channelId: id,
          authorId: userId,
          content: encryptedContent,
          attachments: (attachments ?? []) as any[],
          embeds: [],
          pinned: false,
          createdAt: now,
        })
        .returning({ id: messages.id });

      const msg = {
        id: inserted.id,
        channelId: id,
        authorId: userId,
        content: messageContent, // Return decrypted content for immediate display
        attachments: attachments ?? [],
        embeds: [],
        replyToId: null,
        replyTo: null,
        editedAt: null,
        pinned: false,
        reactions: [],
        createdAt: now.toISOString(),
      };

      // Notify all participants via Socket.IO
      const io = (fastify as any).io;
      if (io) {
        const participants = await db
          .select({ userId: dmParticipants.userId })
          .from(dmParticipants)
          .where(eq(dmParticipants.dmChannelId, id));

        for (const p of participants) {
          io.to(`user:${p.userId}`).emit('dm:message:new', { ...msg, dm_channel_id: id });
        }
      }

      return reply.status(201).send(msg);
    }
  );
}
