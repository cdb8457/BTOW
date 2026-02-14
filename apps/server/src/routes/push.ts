import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { pushSubscriptions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

export async function pushRoutes(fastify: FastifyInstance) {
  // GET /api/push/vapid-key — return public VAPID key for client subscription
  fastify.get('/api/push/vapid-key', async (_request, reply) => {
    return reply.send({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
  });

  // POST /api/push/subscribe — save a push subscription for the current user
  fastify.post(
    '/api/push/subscribe',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const { endpoint, keys, userAgent } = (request.body ?? {}) as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
        userAgent?: string;
      };

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return reply.status(400).send({ error: 'endpoint, keys.p256dh and keys.auth are required' });
      }

      await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent ?? null,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: { p256dh: keys.p256dh, auth: keys.auth },
        });

      return reply.status(201).send({ ok: true });
    }
  );

  // DELETE /api/push/subscribe — remove a push subscription
  fastify.delete(
    '/api/push/subscribe',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const { endpoint } = (request.body ?? {}) as { endpoint?: string };

      if (!endpoint) {
        return reply.status(400).send({ error: 'endpoint is required' });
      }

      await db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.endpoint, endpoint)
          )
        );

      return reply.send({ ok: true });
    }
  );
}
