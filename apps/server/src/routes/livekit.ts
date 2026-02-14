import type { FastifyInstance } from 'fastify';
import { WebhookReceiver } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devapikey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'devapisecret';

export async function livekitRoutes(fastify: FastifyInstance) {
  const receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  // POST /api/livekit/webhook — Receive LiveKit server-side events
  // This is called by the LiveKit server, not by clients.
  // LiveKit sends raw body + Authorization header for verification.
  fastify.post(
    '/api/livekit/webhook',
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization ?? '';
        const body = (request as any).rawBody as string | undefined;

        if (!body) {
          return reply.status(400).send({ error: 'No body' });
        }

        // Verify signature
        const event = await receiver.receive(body, authHeader);
        const io = (fastify as any).io as import('socket.io').Server | undefined;

        if (!io) {
          return reply.status(200).send({ ok: true });
        }

        switch (event.event) {
          case 'participant_joined': {
            const roomName = event.room?.name;
            const participantId = event.participant?.identity;
            if (roomName && participantId) {
              io.to(`channel:${roomName}`).emit('voice:user_joined', {
                channelId: roomName,
                userId: participantId,
              });
            }
            break;
          }

          case 'participant_left': {
            const roomName = event.room?.name;
            const participantId = event.participant?.identity;
            if (roomName && participantId) {
              io.to(`channel:${roomName}`).emit('voice:user_left', {
                channelId: roomName,
                userId: participantId,
              });
            }
            break;
          }

          case 'track_published': {
            // Could emit speaking status based on audio track
            break;
          }

          default:
            break;
        }

        return reply.status(200).send({ ok: true });
      } catch (err) {
        fastify.log.warn({ err }, '[LiveKit webhook] Verification failed');
        return reply.status(401).send({ error: 'Invalid webhook signature' });
      }
    }
  );
}
