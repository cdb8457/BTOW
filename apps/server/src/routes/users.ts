import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const patchProfileSchema = z.object({
  displayName: z.string().min(1).max(32).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  customStatus: z.string().max(128).nullable().optional(),
});

const patchStatusSchema = z.object({
  status: z.enum(['online', 'idle', 'dnd', 'offline']),
});

export async function userRoutes(fastify: FastifyInstance) {
  // PATCH /api/users/@me — update display name, avatar, custom status
  fastify.patch(
    '/api/users/@me',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const parsed = patchProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid body' });
      }

      const updates: Partial<typeof users.$inferInsert> = {};
      if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
      if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl ?? undefined;
      if (parsed.data.customStatus !== undefined) updates.customStatus = parsed.data.customStatus ?? undefined;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      const [updated] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, request.user!.userId))
        .returning({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          bannerUrl: users.bannerUrl,
          customStatus: users.customStatus,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      return reply.send(updated);
    }
  );

  // PATCH /api/users/@me/status — update presence status
  fastify.patch(
    '/api/users/@me/status',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const parsed = patchStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid body' });
      }

      await db
        .update(users)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(users.id, request.user!.userId));

      return reply.send({ ok: true });
    }
  );
}
