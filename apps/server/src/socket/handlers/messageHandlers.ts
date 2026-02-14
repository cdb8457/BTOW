import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket, MessagePayload } from '../types';
import { db } from '../../db';
import { messages, users, channels, members } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sendPushToUser } from '../../services/pushService';
import { fetchLinkPreview } from '../../services/linkPreview';
import { EditMessageSchema, MessageIdSchema } from '@btow/shared';
import { encryptMessage, decryptMessage } from '../../utils/encryption';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

const sendSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string(),
        url: z.string(),
        contentType: z.string(),
        size: z.number().max(26214400),
      })
    )
    .optional()
    .default([]),
  replyToId: z.string().uuid().optional(),
});

async function buildMessagePayload(
  messageId: string,
  channelId: string,
  authorId: string,
  encryptedContent: string,
  attachments: MessagePayload['attachments'],
  replyToId: string | null,
  replyTo: MessagePayload | null,
  editedAt: Date | null,
  pinned: boolean,
  createdAt: Date,
  linkPreview: MessagePayload['linkPreview'] = null
): Promise<MessagePayload> {
  const [author] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, authorId))
    .limit(1);

  // Decrypt message content
  let content = encryptedContent;
  try {
    content = decryptMessage(encryptedContent);
  } catch (err) {
    console.error('[Socket] Failed to decrypt message content:', {
      messageId,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    // Return error indicator instead of crashing
    content = '[Decryption failed]';
  }

  return {
    id: messageId,
    channelId,
    authorId,
    author,
    content,
    attachments,
    embeds: [],
    replyToId,
    replyTo,
    editedAt: editedAt?.toISOString() ?? null,
    pinned,
    reactions: [],
    createdAt: createdAt.toISOString(),
    linkPreview: linkPreview ?? null,
  };
}

export function registerMessageHandlers(
  io: SocketIOServer,
  socket: AuthenticatedSocket
) {
  // ─── SEND MESSAGE ───
  socket.on('message:send', async (data, callback) => {
    try {
      const parsed = sendSchema.safeParse(data);
      if (!parsed.success) {
        const errorMessage = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        callback?.({ success: false, error: errorMessage || 'Invalid message data' });
        return;
      }

      const { channelId, content, attachments, replyToId } = parsed.data;

      // Verify channel exists and user is a member of its server
      const [channel] = await db
        .select({ id: channels.id, serverId: channels.serverId })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1);

      if (!channel) {
        callback?.({ success: false, error: 'Channel not found' });
        return;
      }

      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(
          and(
            eq(members.userId, socket.userId!),
            eq(members.serverId, channel.serverId)
          )
        )
        .limit(1);

      if (!membership) {
        callback?.({ success: false, error: 'Not a member of this server' });
        return;
      }

      const now = new Date();

      // Encrypt message content before storing
      let encryptedContent: string;
      try {
        encryptedContent = encryptMessage(content.trim());
      } catch (err) {
        console.error('[Socket] Failed to encrypt message:', {
          channelId,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        callback?.({ success: false, error: 'Failed to encrypt message' });
        return;
      }

      // Persist message — use DB-generated UUID
      const [inserted] = await db
        .insert(messages)
        .values({
          channelId,
          authorId: socket.userId!,
          content: encryptedContent,
          attachments: attachments as any[],
          embeds: [],
          replyToId: replyToId ?? null,
          pinned: false,
          createdAt: now,
        })
        .returning({ id: messages.id });

      // Build reply preview if needed
      let replyTo: MessagePayload | null = null;
      if (replyToId) {
        const [replyMsg] = await db
          .select()
          .from(messages)
          .where(eq(messages.id, replyToId))
          .limit(1);

        if (replyMsg) {
          replyTo = await buildMessagePayload(
            replyMsg.id,
            replyMsg.channelId,
            replyMsg.authorId,
            replyMsg.content, // Pass full encrypted content for decryption
            [],
            null,
            null,
            replyMsg.editedAt,
            replyMsg.pinned,
            replyMsg.createdAt
          );
        }
      }

      const payload = await buildMessagePayload(
        inserted.id,
        channelId,
        socket.userId!,
        encryptedContent,
        attachments as MessagePayload['attachments'],
        replyToId ?? null,
        replyTo,
        null,
        false,
        now
      );

      // Broadcast to channel room
      io.to(`channel:${channelId}`).emit('message:new', payload);

      // Non-blocking: detect URLs, fetch OG preview, broadcast update
      const urls = content.trim().match(URL_REGEX);
      if (urls && urls.length > 0) {
        fetchLinkPreview(urls[0]).then(async (preview) => {
          if (!preview) return;
          await db
            .update(messages)
            .set({ linkPreview: preview })
            .where(eq(messages.id, inserted.id));
          io.to(`channel:${channelId}`).emit('message:updated', {
            ...payload,
            linkPreview: preview,
          });
        }).catch(() => { /* best-effort */ });
      }

      // Notify server room for unread badge updates on all members
      io.to(`server:${channel.serverId}`).emit('unread:update', {
        channelId,
        count: 1,
        mentionCount: 0,
      });

      // Push notifications to offline server members (non-blocking)
      try {
        const connectedUserIds = new Set(
          Array.from(io.sockets.sockets.values())
            .map((s) => (s as AuthenticatedSocket).userId)
            .filter((id): id is string => Boolean(id))
        );

        const serverMembers = await db
          .select({ userId: members.userId })
          .from(members)
          .where(eq(members.serverId, channel.serverId));

        const [author] = await db
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, socket.userId!))
          .limit(1);

        const authorName = author?.displayName ?? socket.username ?? 'Someone';
        const channelRecord = await db
          .select({ name: channels.name })
          .from(channels)
          .where(eq(channels.id, channelId))
          .limit(1);
        const channelName = channelRecord[0]?.name ?? channelId;

        for (const member of serverMembers) {
          if (!connectedUserIds.has(member.userId) && member.userId !== socket.userId) {
            sendPushToUser(member.userId, {
              title: `#${channelName}`,
              body: `${authorName}: ${content.trim().slice(0, 100)}`,
              url: `/channels/${channel.serverId}/${channelId}`,
              tag: `channel-${channelId}`,
            }).catch(() => { /* swallow — non-critical */ });
          }
        }
      } catch {
        // Push is best-effort; never block message delivery
      }

      // Clear typing for sender
      const redis = (io as any).redisClient;
      if (redis) {
        await redis.del(`typing:${channelId}:${socket.userId}`);
        io.to(`channel:${channelId}`).emit('typing:update', {
          channelId,
          userId: socket.userId,
          username: socket.username,
          typing: false,
        });
      }

      callback?.({ success: true, message: payload });
    } catch (err) {
      console.error('[Socket] message:send error:', err);
      callback?.({ success: false, error: 'Failed to send message' });
    }
  });

  // ─── EDIT MESSAGE ───
  socket.on('message:edit', async (data, callback) => {
    try {
      // Validate using shared schema
      const parsed = EditMessageSchema.safeParse(data);
      if (!parsed.success) {
        const errorMessage = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        callback?.({ success: false, error: errorMessage || 'Invalid message data' });
        return;
      }

      const { messageId, content } = data as { messageId: string; content: string };

      if (!content?.trim() || content.length > 4000) {
        callback?.({ success: false, error: 'Invalid content' });
        return;
      }

      const [msg] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!msg) {
        callback?.({ success: false, error: 'Message not found' });
        return;
      }
      if (msg.authorId !== socket.userId) {
        callback?.({ success: false, error: 'Can only edit your own messages' });
        return;
      }

      const now = new Date();

      // Encrypt new content before updating
      let encryptedContent: string;
      try {
        encryptedContent = encryptMessage(content.trim());
      } catch (err) {
        console.error('[Socket] Failed to encrypt edited message:', {
          messageId,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        callback?.({ success: false, error: 'Failed to encrypt message' });
        return;
      }

      await db
        .update(messages)
        .set({ content: encryptedContent, editedAt: now })
        .where(eq(messages.id, messageId));

      const payload = await buildMessagePayload(
        messageId,
        msg.channelId,
        socket.userId!,
        encryptedContent,
        msg.attachments as MessagePayload['attachments'],
        msg.replyToId,
        null,
        now,
        msg.pinned,
        msg.createdAt
      );

      io.to(`channel:${msg.channelId}`).emit('message:updated', payload);
      callback?.({ success: true, message: payload });
    } catch (err) {
      console.error('[Socket] message:edit error:', err);
      callback?.({ success: false, error: 'Failed to edit message' });
    }
  });

  // ─── DELETE MESSAGE ───
  socket.on('message:delete', async (data, callback) => {
    try {
      // Validate using shared schema
      const parsed = MessageIdSchema.safeParse(data.messageId);
      if (!parsed.success) {
        callback?.({ success: false, error: 'Invalid message ID' });
        return;
      }

      const { messageId } = data as { messageId: string };

      const [msg] = await db
        .select({ id: messages.id, channelId: messages.channelId, authorId: messages.authorId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!msg) {
        callback?.({ success: false, error: 'Message not found' });
        return;
      }
      // Authors can delete their own; MANAGE_MESSAGES check can be added later
      if (msg.authorId !== socket.userId) {
        callback?.({ success: false, error: 'Cannot delete this message' });
        return;
      }

      await db.delete(messages).where(eq(messages.id, messageId));

      io.to(`channel:${msg.channelId}`).emit('message:deleted', {
        messageId,
        channelId: msg.channelId,
      });
      callback?.({ success: true });
    } catch (err) {
      console.error('[Socket] message:delete error:', err);
      callback?.({ success: false, error: 'Failed to delete message' });
    }
  });
}
