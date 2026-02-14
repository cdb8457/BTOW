import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { members, servers, roles } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export enum Permission {
  // Server management
  MANAGE_SERVER    = 1 << 0,   // 1   — rename, icon, delete server
  MANAGE_CHANNELS  = 1 << 1,   // 2   — create, edit, delete channels
  MANAGE_ROLES     = 1 << 2,   // 4   — create, edit, assign roles
  MANAGE_MEMBERS   = 1 << 3,   // 8   — kick, ban, manage nicknames

  // Messaging
  SEND_MESSAGES    = 1 << 4,   // 16
  MANAGE_MESSAGES  = 1 << 5,   // 32  — delete others' messages, pin
  ATTACH_FILES     = 1 << 6,   // 64
  ADD_REACTIONS    = 1 << 7,   // 128
  MENTION_EVERYONE = 1 << 8,   // 256

  // Voice
  CONNECT          = 1 << 9,   // 512
  SPEAK            = 1 << 10,  // 1024
  MUTE_MEMBERS     = 1 << 11,  // 2048
  DEAFEN_MEMBERS   = 1 << 12,  // 4096

  // Special
  ADMINISTRATOR    = 1 << 30,  // All permissions
}

export const DEFAULT_PERMISSIONS =
  Permission.SEND_MESSAGES |
  Permission.ATTACH_FILES |
  Permission.ADD_REACTIONS |
  Permission.CONNECT |
  Permission.SPEAK;

export const ADMIN_PERMISSIONS = Permission.ADMINISTRATOR;

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Check if a permission bitmask includes a specific permission
 */
export function hasPermissionBit(memberPermissions: number, permission: Permission): boolean {
  if (memberPermissions & Permission.ADMINISTRATOR) return true;
  return !!(memberPermissions & permission);
}

/**
 * Toggle a permission on/off in a permission bitmask
 */
export function togglePermission(current: number, permission: Permission): number {
  return current ^ permission;
}

/**
 * Check if a user has a specific permission in a server
 */
export async function hasPermission(
  userId: string,
  serverId: string,
  requiredPermission: Permission
): Promise<boolean> {
  // Get server to check if user is owner
  const [server] = await db
    .select({ ownerId: servers.ownerId })
    .from(servers)
    .where(eq(servers.id, serverId))
    .limit(1);

  if (!server) return false;

  // Server owner has all permissions
  if (server.ownerId === userId) return true;

  // Get member with their roles
  const [member] = await db
    .select({ roles: members.roles })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.serverId, serverId)))
    .limit(1);

  if (!member) return false;

  // If no roles assigned, they only have default permissions
  const roleIds = member.roles ?? [];
  
  if (roleIds.length === 0) {
    // Check default role permissions
    const [defaultRole] = await db
      .select({ permissions: roles.permissions })
      .from(roles)
      .where(and(eq(roles.serverId, serverId), eq(roles.isDefault, true)))
      .limit(1);
    
    if (!defaultRole) return false;
    return hasPermissionBit(defaultRole.permissions, requiredPermission);
  }

  // Get all roles for this member
  const memberRoles = await db
    .select({ permissions: roles.permissions, position: roles.position })
    .from(roles)
    .where(inArray(roles.id, roleIds));

  if (memberRoles.length === 0) return false;

  // Check if any role has the required permission (OR) or ADMINISTRATOR
  for (const role of memberRoles) {
    if (hasPermissionBit(role.permissions, Permission.ADMINISTRATOR)) {
      return true;
    }
    if (hasPermissionBit(role.permissions, requiredPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware factory for permission checking
 */
export function requirePermission(permission: Permission) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Try to get serverId from params
    const params = request.params as { serverId?: string; channelId?: string };
    let serverId = params.serverId;

    // If we have channelId but not serverId, look up the server
    if (!serverId && params.channelId) {
      const { channels } = await import('../db/schema');
      const [channel] = await db
        .select({ serverId: channels.serverId })
        .from(channels)
        .where(eq(channels.id, params.channelId))
        .limit(1);
      
      if (channel) {
        serverId = channel.serverId;
      }
    }

    if (!serverId) {
      return reply.status(400).send({ error: 'Server ID required' });
    }

    const hasAccess = await hasPermission(userId, serverId, permission);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}

/**
 * Check if user is server owner
 */
export async function isServerOwner(userId: string, serverId: string): Promise<boolean> {
  const [server] = await db
    .select({ ownerId: servers.ownerId })
    .from(servers)
    .where(eq(servers.id, serverId))
    .limit(1);

  return server?.ownerId === userId;
}

/**
 * Middleware for owner-only operations
 */
export async function requireServerOwner(request: AuthenticatedRequest, reply: FastifyReply) {
  const userId = request.user?.userId;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const params = request.params as { serverId?: string };
  const serverId = params.serverId;

  if (!serverId) {
    return reply.status(400).send({ error: 'Server ID required' });
  }

  const isOwner = await isServerOwner(userId, serverId);
  if (!isOwner) {
    return reply.status(403).send({ error: 'Only server owner can perform this action' });
  }
}
