import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { servers, channels, roles, members, users, serverBans } from '../db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { hasPermission, isServerOwner, requirePermission, Permission } from '../middleware/permissions';
import type { AuthenticatedRequest } from '../middleware/auth';

type SocketIO = import('socket.io').Server;

export async function serverSettingsRoutes(fastify: FastifyInstance) {
  // ========================================
  // SERVER ROUTES
  // ========================================

  // PATCH /api/servers/:id — Rename server + update icon
  fastify.patch(
    '/api/servers/:id',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: serverId } = request.params as { id: string };
      const userId = request.user!.userId;
      const { name, iconUrl } = (request.body ?? {}) as { name?: string; iconUrl?: string | null };

      // Check if user is owner
      const isOwner = await isServerOwner(userId, serverId);
      if (!isOwner) {
        return reply.status(403).send({ error: 'Only server owner can edit server settings' });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (name !== undefined) {
        if (!name || name.trim().length === 0 || name.trim().length > 100) {
          return reply.status(400).send({ error: 'Server name must be 1-100 characters' });
        }
        updates.name = name.trim();
      }

      if (iconUrl !== undefined) {
        updates.iconUrl = iconUrl;
      }

      await db.update(servers).set(updates).where(eq(servers.id, serverId));

      const [updated] = await db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('server:updated', updated);
      }

      return reply.send(updated);
    }
  );

  // DELETE /api/servers/:id — Delete server (owner only)
  fastify.delete(
    '/api/servers/:id',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: serverId } = request.params as { id: string };
      const userId = request.user!.userId;

      // Check if user is owner
      const isOwner = await isServerOwner(userId, serverId);
      if (!isOwner) {
        return reply.status(403).send({ error: 'Only server owner can delete this server' });
      }

      await db.delete(servers).where(eq(servers.id, serverId));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('server:deleted', { serverId });
      }

      return reply.send({ message: 'Server deleted' });
    }
  );

  // ========================================
  // CHANNEL ROUTES (reorder)
  // ========================================

  // PATCH /api/servers/:id/channels/reorder — Reorder channels
  fastify.patch(
    '/api/servers/:id/channels/reorder',
    { preHandler: [authMiddleware, requirePermission(Permission.MANAGE_CHANNELS)] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: serverId } = request.params as { id: string };
      const { channelIds } = (request.body ?? {}) as { channelIds?: string[] };

      if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
        return reply.status(400).send({ error: 'channelIds array is required' });
      }

      // Verify all channels belong to this server
      const serverChannels = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.serverId, serverId));

      const serverChannelIds = new Set(serverChannels.map(c => c.id));
      for (const channelId of channelIds) {
        if (!serverChannelIds.has(channelId)) {
          return reply.status(400).send({ error: `Channel ${channelId} does not belong to this server` });
        }
      }

      // Update positions
      await db.transaction(async (tx) => {
        for (let i = 0; i < channelIds.length; i++) {
          await tx
            .update(channels)
            .set({ position: i })
            .where(eq(channels.id, channelIds[i]));
        }
      });

      const updatedChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.serverId, serverId))
        .orderBy(asc(channels.position));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('channels:reordered', { channels: updatedChannels });
      }

      return reply.send({ channels: updatedChannels });
    }
  );

  // ========================================
  // ROLE ROUTES
  // ========================================

  // GET /api/servers/:id/roles — List roles
  fastify.get(
    '/api/servers/:id/roles',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: serverId } = request.params as { id: string };
      const userId = request.user!.userId;

      // Verify membership
      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ error: 'Not a member of this server' });
      }

      const serverRoles = await db
        .select()
        .from(roles)
        .where(eq(roles.serverId, serverId))
        .orderBy(asc(roles.position));

      return reply.send({ roles: serverRoles });
    }
  );

  // POST /api/servers/:id/roles — Create role
  fastify.post(
    '/api/servers/:id/roles',
    { preHandler: [authMiddleware, requirePermission(Permission.MANAGE_ROLES)] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: serverId } = request.params as { id: string };
      const { name, color, permissions, hoist, mentionable } = (request.body ?? {}) as {
        name?: string;
        color?: string;
        permissions?: number;
        hoist?: boolean;
        mentionable?: boolean;
      };

      if (!name || name.trim().length === 0 || name.length > 100) {
        return reply.status(400).send({ error: 'Role name is required (1-100 chars)' });
      }

      // Get max position
      const existingRoles = await db
        .select({ position: roles.position })
        .from(roles)
        .where(eq(roles.serverId, serverId));

      const maxPosition = existingRoles.reduce((max, r) => Math.max(max, r.position), -1);

      const roleId = uuidv7();
      const now = new Date();

      const newRole = {
        id: roleId,
        serverId,
        name: name.trim(),
        color: color || '#5865F2',
        permissions: permissions ?? 0,
        position: maxPosition + 1,
        isDefault: false,
        hoist: hoist ?? false,
        mentionable: mentionable ?? false,
        createdAt: now,
      };

      await db.insert(roles).values(newRole);

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('role:created', newRole);
      }

      return reply.status(201).send(newRole);
    }
  );

  // PATCH /api/servers/:sid/roles/:rid — Update role
  fastify.patch(
    '/api/servers/:sid/roles/:rid',
    { preHandler: [authMiddleware, requirePermission(Permission.MANAGE_ROLES)] },
    async (request: AuthenticatedRequest, reply) => {
      const { sid: serverId, rid: roleId } = request.params as { sid: string; rid: string };
      const { name, color, permissions, hoist, mentionable, position } = (request.body ?? {}) as {
        name?: string;
        color?: string;
        permissions?: number;
        hoist?: boolean;
        mentionable?: boolean;
        position?: number;
      };

      // Verify role belongs to server
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.serverId, serverId)))
        .limit(1);

      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      // Prevent modifying @everyone role
      if (role.isDefault) {
        return reply.status(400).send({ error: 'Cannot modify the default role' });
      }

      const updates: Record<string, unknown> = {};

      if (name !== undefined) {
        if (!name || name.trim().length === 0 || name.length > 100) {
          return reply.status(400).send({ error: 'Invalid role name' });
        }
        updates.name = name.trim();
      }
      if (color !== undefined) {
        updates.color = color;
      }
      if (permissions !== undefined) {
        updates.permissions = permissions;
      }
      if (hoist !== undefined) {
        updates.hoist = hoist;
      }
      if (mentionable !== undefined) {
        updates.mentionable = mentionable;
      }
      if (position !== undefined) {
        updates.position = position;
      }

      await db.update(roles).set(updates).where(eq(roles.id, roleId));

      const [updated] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('role:updated', updated);
      }

      return reply.send(updated);
    }
  );

  // DELETE /api/servers/:sid/roles/:rid — Delete role
  fastify.delete(
    '/api/servers/:sid/roles/:rid',
    { preHandler: [authMiddleware, requirePermission(Permission.MANAGE_ROLES)] },
    async (request: AuthenticatedRequest, reply) => {
      const { sid: serverId, rid: roleId } = request.params as { sid: string; rid: string };

      // Verify role belongs to server
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.serverId, serverId)))
        .limit(1);

      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      // Prevent deleting @everyone role
      if (role.isDefault) {
        return reply.status(400).send({ error: 'Cannot delete the default role' });
      }

      // Remove role from all members
      await db.transaction(async (tx) => {
        // Get all members with this role
        const membersWithRole = await tx
          .select({ userId: members.userId, roles: members.roles })
          .from(members)
          .where(eq(members.serverId, serverId));

        // Update each member to remove the role
        for (const member of membersWithRole) {
          if (member.roles && member.roles.includes(roleId)) {
            const newRoles = member.roles.filter((r: string) => r !== roleId);
            await tx
              .update(members)
              .set({ roles: newRoles })
              .where(and(eq(members.userId, member.userId), eq(members.serverId, serverId)));
          }
        }

        // Delete the role
        await tx.delete(roles).where(eq(roles.id, roleId));
      });

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('role:deleted', { roleId, serverId });
      }

      return reply.send({ message: 'Role deleted' });
    }
  );

  // ========================================
  // MEMBER ROUTES
  // ========================================

  // PATCH /api/servers/:sid/members/:uid — Update member (nickname or roles)
  fastify.patch(
    '/api/servers/:sid/members/:uid',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { sid: serverId, uid: targetUserId } = request.params as { sid: string; uid: string };
      const userId = request.user!.userId;
      const { nickname, roles } = (request.body ?? {}) as { nickname?: string | null; roles?: string[] };

      // Check if the requester has permission to manage members
      const isOwner = await isServerOwner(userId, serverId);
      const hasManageRoles = await hasPermission(userId, serverId, Permission.MANAGE_ROLES);
      const hasManageMembers = await hasPermission(userId, serverId, Permission.MANAGE_MEMBERS);

      // Users can update their own nickname with MANAGE_NICKNAMES permission (or use default role)
      // For now, let's allow users to change their own nickname if they have a default role with that permission
      const isSelf = userId === targetUserId;

      if (!isOwner && !hasManageRoles && !hasManageMembers) {
        // If not owner/manage roles/kick, can only edit self
        if (!isSelf) {
          return reply.status(403).send({ error: 'Insufficient permissions' });
        }
        // Users can only change their own nickname, not roles
        if (roles !== undefined) {
          return reply.status(403).send({ error: 'Cannot assign roles to yourself' });
        }
      }

      // Verify target is a member
      const [member] = await db
        .select()
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)))
        .limit(1);

      if (!member) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      const updates: Record<string, unknown> = {};

      if (nickname !== undefined) {
        updates.nickname = nickname;
      }
      if (roles !== undefined) {
        // Only allow if requester has MANAGE_ROLES permission
        if (!isOwner && !hasManageRoles) {
          return reply.status(403).send({ error: 'Insufficient permissions to manage roles' });
        }
        updates.roles = roles;
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: 'No updates provided' });
      }

      await db.update(members).set(updates).where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)));

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)))
        .limit(1);

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('member:updated', {
          ...updatedMember,
          serverId,
          userId: targetUserId,
        });
      }

      return reply.send(updatedMember);
    }
  );

  // DELETE /api/servers/:sid/members/:uid — Kick member
  fastify.delete(
    '/api/servers/:sid/members/:uid',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { sid: serverId, uid: targetUserId } = request.params as { sid: string; uid: string };
      const userId = request.user!.userId;

      // Cannot kick yourself
      if (userId === targetUserId) {
        return reply.status(400).send({ error: 'Cannot kick yourself' });
      }

      // Check if requester is owner or has kick permission
      const isOwner = await isServerOwner(userId, serverId);
      const hasKick = await hasPermission(userId, serverId, Permission.MANAGE_MEMBERS);

      if (!isOwner && !hasKick) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Verify target is a member
      const [member] = await db
        .select()
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)))
        .limit(1);

      if (!member) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      // Cannot kick the server owner
      const [server] = await db
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (server?.ownerId === targetUserId) {
        return reply.status(400).send({ error: 'Cannot kick the server owner' });
      }

      // Higher roles can't be kicked by lower roles
      if (!isOwner) {
        const requesterMember = await db
          .select({ roles: members.roles })
          .from(members)
          .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
          .limit(1);

        const targetMemberRoles = await db
          .select({ position: roles.position })
          .from(roles)
          .where(inArray(roles.id, member.roles ?? []));

        const requesterRoles = await db
          .select({ position: roles.position })
          .from(roles)
          .where(inArray(roles.id, requesterMember?.[0]?.roles ?? []));

        const maxTargetPosition = Math.max(...targetMemberRoles.map(r => r.position), -1);
        const maxRequesterPosition = Math.max(...requesterRoles.map(r => r.position), -1);

        if (maxTargetPosition > maxRequesterPosition) {
          return reply.status(403).send({ error: 'Cannot kick a member with higher role' });
        }
      }

      await db.delete(members).where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        // Notify the kicked user
        io.to(`user:${targetUserId}`).emit('kicked', { serverId });
        // Notify server members
        io.to(`server:${serverId}`).emit('member:removed', { serverId, userId: targetUserId });
      }

      return reply.send({ message: 'Member kicked' });
    }
  );

  // ========================================
  // BAN ROUTES
  // ========================================

  // POST /api/servers/:sid/bans/:uid — Ban member
  fastify.post(
    '/api/servers/:sid/bans/:uid',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { sid: serverId, uid: targetUserId } = request.params as { sid: string; uid: string };
      const userId = request.user!.userId;
      const { reason } = (request.body ?? {}) as { reason?: string };

      // Cannot ban yourself
      if (userId === targetUserId) {
        return reply.status(400).send({ error: 'Cannot ban yourself' });
      }

      // Check if requester is owner or has ban permission
      const isOwner = await isServerOwner(userId, serverId);
      const hasBan = await hasPermission(userId, serverId, Permission.MANAGE_MEMBERS);

      if (!isOwner && !hasBan) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Verify target is a member
      const [member] = await db
        .select()
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)))
        .limit(1);

      if (!member) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      // Cannot ban the server owner
      const [server] = await db
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (server?.ownerId === targetUserId) {
        return reply.status(400).send({ error: 'Cannot ban the server owner' });
      }

      // Check if already banned
      const [existingBan] = await db
        .select()
        .from(serverBans)
        .where(and(eq(serverBans.serverId, serverId), eq(serverBans.userId, targetUserId)))
        .limit(1);

      if (existingBan) {
        return reply.status(400).send({ error: 'User is already banned' });
      }

      // Higher roles can't be banned by lower roles
      if (!isOwner) {
        const requesterMember = await db
          .select({ roles: members.roles })
          .from(members)
          .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
          .limit(1);

        const targetMemberRoles = await db
          .select({ position: roles.position })
          .from(roles)
          .where(inArray(roles.id, member.roles ?? []));

        const requesterRoles = await db
          .select({ position: roles.position })
          .from(roles)
          .where(inArray(roles.id, requesterMember?.[0]?.roles ?? []));

        const maxTargetPosition = Math.max(...targetMemberRoles.map(r => r.position), -1);
        const maxRequesterPosition = Math.max(...requesterRoles.map(r => r.position), -1);

        if (maxTargetPosition > maxRequesterPosition) {
          return reply.status(403).send({ error: 'Cannot ban a member with higher role' });
        }
      }

      const banId = uuidv7();
      const now = new Date();

      await db.transaction(async (tx) => {
        // Create ban record
        await tx.insert(serverBans).values({
          serverId,
          userId: targetUserId,
          bannedBy: userId,
          reason: reason || null,
          createdAt: now,
        });

        // Remove member from server
        await tx.delete(members).where(and(eq(members.serverId, serverId), eq(members.userId, targetUserId)));
      });

      const [targetUser] = await db
        .select({ username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        // Notify the banned user
        io.to(`user:${targetUserId}`).emit('banned', { serverId, reason });
        // Notify server members
        io.to(`server:${serverId}`).emit('member:removed', { serverId, userId: targetUserId, banned: true, reason });
      }

      return reply.status(201).send({
        id: banId,
        serverId,
        userId: targetUserId,
        bannedBy: userId,
        reason: reason || null,
        user: targetUser,
        createdAt: now,
      });
    }
  );

  // DELETE /api/servers/:sid/bans/:uid — Unban member
  fastify.delete(
    '/api/servers/:sid/bans/:uid',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { sid: serverId, uid: targetUserId } = request.params as { sid: string; uid: string };
      const userId = request.user!.userId;

      // Check if requester is owner or has ban permission
      const isOwner = await isServerOwner(userId, serverId);
      const hasBan = await hasPermission(userId, serverId, Permission.MANAGE_MEMBERS);

      if (!isOwner && !hasBan) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Verify user is banned
      const [ban] = await db
        .select()
        .from(serverBans)
        .where(and(eq(serverBans.serverId, serverId), eq(serverBans.userId, targetUserId)))
        .limit(1);

      if (!ban) {
        return reply.status(404).send({ error: 'User is not banned' });
      }

      await db.delete(serverBans).where(and(eq(serverBans.serverId, serverId), eq(serverBans.userId, targetUserId)));

      const io = (fastify as any).io as SocketIO | undefined;
      if (io) {
        io.to(`server:${serverId}`).emit('member:unbanned', { serverId, userId: targetUserId });
      }

      return reply.send({ message: 'User unbanned' });
    }
  );

  // GET /api/servers/:id/bans — List bans
  fastify.get(
    '/api/servers/:id/bans',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { id: serverId } = request.params as { id: string };
      const userId = request.user!.userId;

      // Verify membership (need to be a member to view bans)
      const [membership] = await db
        .select({ userId: members.userId })
        .from(members)
        .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ error: 'Not a member of this server' });
      }

      const banList = await db
        .select({
          id: serverBans.id,
          serverId: serverBans.serverId,
          userId: serverBans.userId,
          bannedBy: serverBans.bannedBy,
          reason: serverBans.reason,
          createdAt: serverBans.createdAt,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(serverBans)
        .innerJoin(users, eq(serverBans.userId, users.id))
        .where(eq(serverBans.serverId, serverId));

      return reply.send({ bans: banList });
    }
  );
}
