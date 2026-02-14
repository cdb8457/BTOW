import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { channels, categories } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { requirePermission, hasPermission, Permission } from '../middleware/permissions';
import type { AuthenticatedRequest } from '../middleware/auth';

type SocketIO = import('socket.io').Server;

export async function channelRoutes(fastify: FastifyInstance) {
  // POST /api/servers/:serverId/channels — Create channel
  fastify.post(
    '/api/servers/:serverId/channels',
    { preHandler: [authMiddleware, requirePermission(Permission.MANAGE_CHANNELS)] },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const { name, type, topic, categoryId } = (request.body ?? {}) as {
        name?: string;
        type?: string;
        topic?: string;
        categoryId?: string;
      };

      if (!name || name.trim().length === 0 || name.length > 100) {
        return reply.status(400).send({ error: 'Channel name required (1-100 chars)' });
      }
      if (!type || !['text', 'voice'].includes(type)) {
        return reply.status(400).send({ error: 'Type must be "text" or "voice"' });
      }

      // Sanitise: lowercase, spaces→dashes, strip non-alphanumeric except - and _
      const sanitizedName = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-_]/g, '');

      if (sanitizedName.length === 0) {
        return reply.status(400).send({ error: 'Channel name must contain valid characters (a-z, 0-9, -, _)' });
      }

      const existing = await db
        .select({ position: channels.position })
        .from(channels)
        .where(eq(channels.serverId, serverId));

      const maxPosition = existing.reduce((max, ch) => Math.max(max, ch.position), -1);

      const channelId = uuidv7();
      const now = new Date();

      const newChannel = {
        id: channelId,
        serverId,
        name: sanitizedName,
        type: type as 'text' | 'voice',
        topic: topic?.trim() || null,
        categoryId: categoryId || null,
        position: maxPosition + 1,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(channels).values(newChannel);

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('channel:created', {
          ...newChannel,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }

      return reply.status(201).send({
        ...newChannel,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  );

  // PATCH /api/channels/:channelId — Edit channel name/topic
  fastify.patch(
    '/api/channels/:channelId',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { channelId } = request.params as { channelId: string };
      const userId = request.user!.userId;
      const { name, topic } = (request.body ?? {}) as { name?: string; topic?: string };

      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1);

      if (!channel) return reply.status(404).send({ error: 'Channel not found' });

      // Check permission
      const canManage = await hasPermission(userId, channel.serverId, Permission.MANAGE_CHANNELS);
      if (!canManage) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (name !== undefined) {
        const sanitized = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');
        if (sanitized.length === 0 || sanitized.length > 100) {
          return reply.status(400).send({ error: 'Invalid channel name' });
        }
        updates.name = sanitized;
      }
      if (topic !== undefined) {
        updates.topic = topic.trim() || null;
      }

      await db.update(channels).set(updates).where(eq(channels.id, channelId));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${channel.serverId}`).emit('channel:updated', {
          id: channelId,
          serverId: channel.serverId,
          ...updates,
          updatedAt: (updates.updatedAt as Date).toISOString(),
        });
      }

      return reply.send({ ...channel, ...updates });
    }
  );

  // DELETE /api/channels/:channelId — Delete channel
  fastify.delete(
    '/api/channels/:channelId',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { channelId } = request.params as { channelId: string };
      const userId = request.user!.userId;

      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1);

      if (!channel) return reply.status(404).send({ error: 'Channel not found' });

      // Check permission
      const canManage = await hasPermission(userId, channel.serverId, Permission.MANAGE_CHANNELS);
      if (!canManage) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Prevent deleting the last channel
      const allChannels = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.serverId, channel.serverId));

      if (allChannels.length <= 1) {
        return reply.status(400).send({ error: 'Cannot delete the last channel in a server' });
      }

      await db.delete(channels).where(eq(channels.id, channelId));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${channel.serverId}`).emit('channel:deleted', {
          channelId,
          serverId: channel.serverId,
        });
      }

      return reply.send({ message: 'Channel deleted' });
    }
  );

  // POST /api/servers/:serverId/categories — Create category
  fastify.post(
    '/api/servers/:serverId/categories',
    { preHandler: [authMiddleware, requirePermission(Permission.MANAGE_CHANNELS)] },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const { name } = (request.body ?? {}) as { name?: string };

      if (!name || name.trim().length === 0 || name.length > 100) {
        return reply.status(400).send({ error: 'Category name required (1-100 chars)' });
      }

      const existing = await db
        .select({ position: categories.position })
        .from(categories)
        .where(eq(categories.serverId, serverId));

      const maxPos = existing.reduce((max, c) => Math.max(max, c.position), -1);
      const categoryId = uuidv7();
      const now = new Date();

      await db.insert(categories).values({
        id: categoryId,
        serverId,
        name: name.trim(),
        position: maxPos + 1,
        createdAt: now,
      });

      const newCategory = { id: categoryId, serverId, name: name.trim(), position: maxPos + 1 };

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('category:created', newCategory);
      }

      return reply.status(201).send(newCategory);
    }
  );

  // PATCH /api/categories/:categoryId — Rename category
  fastify.patch(
    '/api/categories/:categoryId',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { categoryId } = request.params as { categoryId: string };
      const userId = request.user!.userId;
      const { name } = (request.body ?? {}) as { name?: string };

      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!cat) return reply.status(404).send({ error: 'Category not found' });

      // Check permission
      const canManage = await hasPermission(userId, cat.serverId, Permission.MANAGE_CHANNELS);
      if (!canManage) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      if (name !== undefined) {
        if (name.trim().length === 0 || name.length > 100) {
          return reply.status(400).send({ error: 'Invalid category name' });
        }
        await db
          .update(categories)
          .set({ name: name.trim() })
          .where(eq(categories.id, categoryId));
      }

      return reply.send({ ...cat, name: name?.trim() ?? cat.name });
    }
  );

  // DELETE /api/categories/:categoryId — Delete category (orphan its channels)
  fastify.delete(
    '/api/categories/:categoryId',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { categoryId } = request.params as { categoryId: string };
      const userId = request.user!.userId;

      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!cat) return reply.status(404).send({ error: 'Category not found' });

      // Check permission
      const canManage = await hasPermission(userId, cat.serverId, Permission.MANAGE_CHANNELS);
      if (!canManage) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Move channels in this category to uncategorized
      await db
        .update(channels)
        .set({ categoryId: null })
        .where(eq(channels.categoryId, categoryId));

      await db.delete(categories).where(eq(categories.id, categoryId));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${cat.serverId}`).emit('category:deleted', {
          categoryId,
          serverId: cat.serverId,
        });
      }

      return reply.send({ message: 'Category deleted' });
    }
  );
}
