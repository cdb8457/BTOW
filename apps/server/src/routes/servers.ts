import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { servers, channels, categories, members, roles, users } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { Permission, CreateServerSchema } from '@btow/shared';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

export async function serverRoutes(fastify: FastifyInstance) {
  // POST /api/servers — Create a new server
  fastify.post(
    '/api/servers',
    {
      preHandler: [authMiddleware],
      schema: {
        body: CreateServerSchema,
      },
    },
    async (request: AuthenticatedRequest, reply) => {
      // Schema validation is applied via CreateServerSchema
      const { name, description } = request.body as { name: string; description?: string };
      const userId = request.user!.userId;

      if (!name || name.trim().length === 0 || name.trim().length > 100) {
        return reply.status(400).send({ error: 'Server name is required (1-100 chars)' });
      }

      const serverId = uuidv7();
      const categoryId = uuidv7();
      const channelId = uuidv7();
      const adminRoleId = uuidv7();
      const defaultRoleId = uuidv7();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(servers).values({
          id: serverId,
          name: name.trim(),
          description: description?.trim() || null,
          iconUrl: null,
          ownerId: userId,
          createdAt: now,
          updatedAt: now,
        });

        // @everyone default role
        await tx.insert(roles).values({
          id: defaultRoleId,
          serverId,
          name: '@everyone',
          color: '#99AAB5',
          permissions:
            Permission.VIEW_CHANNELS |
            Permission.SEND_MESSAGES |
            Permission.ATTACH_FILES |
            Permission.ADD_REACTIONS |
            Permission.CONNECT_VOICE |
            Permission.SPEAK_VOICE |
            Permission.CREATE_INVITES,
          position: 0,
          isDefault: true,
          createdAt: now,
        });

        // Admin role
        await tx.insert(roles).values({
          id: adminRoleId,
          serverId,
          name: 'Admin',
          color: '#E74C3C',
          permissions: Permission.ADMINISTRATOR,
          position: 1,
          isDefault: false,
          createdAt: now,
        });

        // Creator as member with Admin role
        await tx.insert(members).values({
          userId,
          serverId,
          nickname: null,
          roles: [adminRoleId],
          joinedAt: now,
        });

        // Default "General" category
        await tx.insert(categories).values({
          id: categoryId,
          serverId,
          name: 'General',
          position: 0,
          createdAt: now,
        });

        // Default #general text channel
        await tx.insert(channels).values({
          id: channelId,
          serverId,
          name: 'general',
          type: 'text',
          topic: 'General conversation',
          categoryId,
          position: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Join user's sockets to the new server room
      const io = (fastify as any).io as import('socket.io').Server | undefined;
      if (io) {
        const userSockets = await io.in(`user:${userId}`).fetchSockets();
        for (const s of userSockets) {
          s.join(`server:${serverId}`);
        }
      }

      return reply.status(201).send({
        id: serverId,
        name: name.trim(),
        description: description?.trim() || null,
        iconUrl: null,
        ownerId: userId,
        defaultChannelId: channelId,
      });
    }
  );

  // GET /api/servers — list all servers the authenticated user is a member of
  fastify.get(
    '/api/servers',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const rows = await db
        .select({
          id: servers.id,
          name: servers.name,
          iconUrl: servers.iconUrl,
          ownerId: servers.ownerId,
          createdAt: servers.createdAt,
        })
        .from(servers)
        .innerJoin(members, and(eq(members.serverId, servers.id), eq(members.userId, userId)))
        .orderBy(asc(servers.createdAt));

      return reply.send({ servers: rows });
    }
  );

  // GET /api/servers/:serverId — single server info
  fastify.get(
    '/api/servers/:serverId',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const userId = request.user!.userId;

      const [server] = await db
        .select({
          id: servers.id,
          name: servers.name,
          iconUrl: servers.iconUrl,
          ownerId: servers.ownerId,
          createdAt: servers.createdAt,
        })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!server) {
        return reply.status(404).send({ success: false, error: 'Server not found' });
      }

      // Verify membership
      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ success: false, error: 'Not a member of this server' });
      }

      return reply.send({ server });
    }
  );

  // GET /api/servers/:serverId/channels — channels + categories for a server
  fastify.get(
    '/api/servers/:serverId/channels',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const userId = request.user!.userId;

      // Verify membership
      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ success: false, error: 'Not a member of this server' });
      }

      const [channelRows, categoryRows] = await Promise.all([
        db
          .select({
            id: channels.id,
            name: channels.name,
            type: channels.type,
            topic: channels.topic,
            position: channels.position,
            categoryId: channels.categoryId,
          })
          .from(channels)
          .where(eq(channels.serverId, serverId))
          .orderBy(asc(channels.position)),
        db
          .select({
            id: categories.id,
            name: categories.name,
            position: categories.position,
          })
          .from(categories)
          .where(eq(categories.serverId, serverId))
          .orderBy(asc(categories.position)),
      ]);

      return reply.send({ channels: channelRows, categories: categoryRows });
    }
  );

  // GET /api/servers/:serverId/members — member list with user info
  fastify.get(
    '/api/servers/:serverId/members',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const userId = request.user!.userId;

      // Verify membership
      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ success: false, error: 'Not a member of this server' });
      }

      const rows = await db
        .select({
          userId: members.userId,
          nickname: members.nickname,
          roles: members.roles,
          joinedAt: members.joinedAt,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(members.serverId, serverId))
        .orderBy(asc(users.displayName));

      return reply.send({ members: rows });
    }
  );
}
