import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { invites, servers, members, roles, users } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { CreateInviteSchema } from '@btow/shared';
import crypto from 'node:crypto';

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url').substring(0, 8).toLowerCase();
}

export async function inviteRoutes(fastify: FastifyInstance) {
  // POST /api/servers/:serverId/invites — Create invite
  fastify.post(
    '/api/servers/:serverId/invites',
    {
      preHandler: [authMiddleware],
      schema: {
        body: CreateInviteSchema,
      },
    },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const userId = request.user!.userId;
      const { maxUses, expiresInHours } = request.body as { maxUses?: number; expiresInHours?: number };

      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.userId, userId), eq(members.serverId, serverId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ error: 'Not a member of this server' });
      }

      // Generate unique code
      let code = generateInviteCode();
      for (let i = 0; i < 5; i++) {
        const [existing] = await db
          .select({ code: invites.code })
          .from(invites)
          .where(eq(invites.code, code))
          .limit(1);
        if (!existing) break;
        code = generateInviteCode();
      }

      const now = new Date();
      const expiresAt =
        expiresInHours && expiresInHours > 0
          ? new Date(now.getTime() + expiresInHours * 3_600_000)
          : null;

      await db.insert(invites).values({
        code,
        serverId,
        creatorId: userId,
        uses: 0,
        maxUses: maxUses ?? null,
        expiresAt,
        createdAt: now,
      });

      const inviteUrl = `${process.env.PUBLIC_URL ?? 'http://localhost:5173'}/invite/${code}`;

      return reply.status(201).send({
        code,
        url: inviteUrl,
        serverId,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt?.toISOString() ?? null,
        uses: 0,
      });
    }
  );

  // GET /api/invites/:code — Public invite preview (no auth required)
  fastify.get('/api/invites/:code', async (request, reply) => {
    const { code } = request.params as { code: string };

    const [inv] = await db
      .select({
        code: invites.code,
        serverId: invites.serverId,
        serverName: servers.name,
        serverIcon: servers.iconUrl,
        serverDescription: servers.description,
        uses: invites.uses,
        maxUses: invites.maxUses,
        expiresAt: invites.expiresAt,
      })
      .from(invites)
      .innerJoin(servers, eq(invites.serverId, servers.id))
      .where(eq(invites.code, code))
      .limit(1);

    if (!inv) {
      return reply.status(404).send({ error: 'Invite not found' });
    }
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      return reply.status(410).send({ error: 'This invite has expired' });
    }
    if (inv.maxUses !== null && inv.uses >= inv.maxUses) {
      return reply.status(410).send({ error: 'This invite has reached its maximum uses' });
    }

    const [memberCount] = await db
      .select({ count: sql<string>`count(*)` })
      .from(members)
      .where(eq(members.serverId, inv.serverId));

    return reply.send({
      code: inv.code,
      server: {
        id: inv.serverId,
        name: inv.serverName,
        iconUrl: inv.serverIcon,
        description: inv.serverDescription,
        memberCount: Number(memberCount.count),
      },
    });
  });

  // POST /api/invites/:code/accept — Join server via invite
  fastify.post(
    '/api/invites/:code/accept',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { code } = request.params as { code: string };
      const userId = request.user!.userId;

      const [inv] = await db
        .select()
        .from(invites)
        .where(eq(invites.code, code))
        .limit(1);

      if (!inv) return reply.status(404).send({ error: 'Invite not found' });
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
        return reply.status(410).send({ error: 'This invite has expired' });
      }
      if (inv.maxUses !== null && inv.uses >= inv.maxUses) {
        return reply.status(410).send({ error: 'This invite has reached its maximum uses' });
      }

      // Already a member?
      const [existing] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.userId, userId), eq(members.serverId, inv.serverId)))
        .limit(1);

      if (existing) {
        return reply.status(200).send({ message: 'Already a member', serverId: inv.serverId });
      }

      const [defaultRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.serverId, inv.serverId), eq(roles.isDefault, true)))
        .limit(1);

      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(members).values({
          userId,
          serverId: inv.serverId,
          nickname: null,
          roles: defaultRole ? [defaultRole.id] : [],
          joinedAt: now,
        });
        await tx
          .update(invites)
          .set({ uses: inv.uses + 1 })
          .where(eq(invites.code, code));
      });

      // Socket: join user to server room + broadcast member_joined
      const io = (fastify as any).io as import('socket.io').Server | undefined;
      if (io) {
        const userSockets = await io.in(`user:${userId}`).fetchSockets();
        for (const s of userSockets) {
          s.join(`server:${inv.serverId}`);
        }

        const [userInfo] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        io.to(`server:${inv.serverId}`).emit('server:member_joined', {
          serverId: inv.serverId,
          member: {
            ...userInfo,
            roles: defaultRole ? [defaultRole.id] : [],
            joinedAt: now.toISOString(),
          },
        });
      }

      return reply.status(200).send({ message: 'Joined server', serverId: inv.serverId });
    }
  );

  // GET /api/servers/:serverId/invites — List invites (must be member)
  fastify.get(
    '/api/servers/:serverId/invites',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { serverId } = request.params as { serverId: string };
      const userId = request.user!.userId;

      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.userId, userId), eq(members.serverId, serverId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ error: 'Not a member of this server' });
      }

      const rows = await db
        .select({
          code: invites.code,
          uses: invites.uses,
          maxUses: invites.maxUses,
          expiresAt: invites.expiresAt,
          createdAt: invites.createdAt,
          creatorUsername: users.username,
        })
        .from(invites)
        .innerJoin(users, eq(invites.creatorId, users.id))
        .where(eq(invites.serverId, serverId));

      return reply.send({ invites: rows });
    }
  );

  // DELETE /api/invites/:code — Revoke invite (owner only for now)
  fastify.delete(
    '/api/invites/:code',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { code } = request.params as { code: string };
      const userId = request.user!.userId;

      const [inv] = await db
        .select({ serverId: invites.serverId })
        .from(invites)
        .where(eq(invites.code, code))
        .limit(1);

      if (!inv) return reply.status(404).send({ error: 'Invite not found' });

      const [server] = await db
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(eq(servers.id, inv.serverId))
        .limit(1);

      if (!server || server.ownerId !== userId) {
        // Also allow the creator to delete their own invite
        const [invite] = await db
          .select({ creatorId: invites.creatorId })
          .from(invites)
          .where(eq(invites.code, code))
          .limit(1);
        if (!invite || invite.creatorId !== userId) {
          return reply.status(403).send({ error: 'Not authorised to revoke this invite' });
        }
      }

      await db.delete(invites).where(eq(invites.code, code));
      return reply.send({ message: 'Invite revoked' });
    }
  );
}
