import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { messages, users, channels, members, reactions } from '../db/schema';
import { eq, lt, desc, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { decryptMessage } from '../utils/encryption';

export async function messageRoutes(fastify: FastifyInstance) {
  // GET /api/channels/:channelId/messages — cursor-based pagination
  fastify.get(
    '/api/channels/:channelId/messages',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { before, limit: rawLimit } = request.query as {
        before?: string;
        limit?: string;
      };

      const limit = Math.min(Math.max(parseInt(rawLimit ?? '50', 10), 1), 100);

      // Verify channel exists and user is a member of the server
      const [channel] = await db
        .select({ id: channels.id, serverId: channels.serverId })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1);

      if (!channel) {
        return reply.status(404).send({ success: false, error: 'Channel not found' });
      }

      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(
          and(
            eq(members.userId, request.user!.userId),
            eq(members.serverId, channel.serverId)
          )
        )
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ success: false, error: 'Not a member of this server' });
      }

      // Query with cursor
      const whereClause = before
        ? and(eq(messages.channelId, channelId), lt(messages.id, before))
        : eq(messages.channelId, channelId);

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
        .limit(limit + 1); // +1 to detect hasMore

      const hasMore = rows.length > limit;
      const pageRows = rows.slice(0, limit);

      // Batch-fetch reaction counts for these messages
      const messageIds = pageRows.map((r) => r.msg.id);

      // Simple reaction aggregation — get all reactions for these messages
      const reactionRows =
        messageIds.length > 0
          ? await db
              .select({
                messageId: reactions.messageId,
                emoji: reactions.emoji,
                userId: reactions.userId,
              })
              .from(reactions)
              .where(
                sql`${reactions.messageId} = ANY(ARRAY[${sql.join(
                  messageIds.map((id) => sql`${id}::uuid`),
                  sql`, `
                )}])`
              )
          : [];

      // Group reactions by messageId
      const reactionsByMessage: Record<
        string,
        { emoji: string; count: number; userIds: string[] }[]
      > = {};
      for (const r of reactionRows) {
        if (!reactionsByMessage[r.messageId]) reactionsByMessage[r.messageId] = [];
        const existing = reactionsByMessage[r.messageId].find((x) => x.emoji === r.emoji);
        if (existing) {
          existing.count++;
          existing.userIds.push(r.userId);
        } else {
          reactionsByMessage[r.messageId].push({
            emoji: r.emoji,
            count: 1,
            userIds: [r.userId],
          });
        }
      }

      // Format in chronological order (reversed from DESC query)
      const formatted = pageRows
        .reverse()
        .map((row) => {
          // Decrypt message content
          let decryptedContent = row.msg.content;
          try {
            decryptedContent = decryptMessage(row.msg.content);
          } catch (err) {
            console.error('[Messages] Failed to decrypt message:', row.msg.id, err);
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
            replyTo: null, // Populated client-side or separate query
            editedAt: row.msg.editedAt?.toISOString() ?? null,
            pinned: row.msg.pinned,
            reactions: reactionsByMessage[row.msg.id] ?? [],
            createdAt: row.msg.createdAt.toISOString(),
            linkPreview: row.msg.linkPreview ?? null,
          };
        });

      return reply.send({ messages: formatted, hasMore });
    }
  );

  // GET /api/channels/:channelId/pins
  fastify.get(
    '/api/channels/:channelId/pins',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { channelId } = request.params as { channelId: string };

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
          console.error('[Messages] Failed to decrypt pinned message:', row.msg.id, err);
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
}
