import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

export async function setupMiddleware(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin:
      process.env.NODE_ENV === 'production'
        ? (process.env.CLIENT_URL ?? 'https://btow.example.com')
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // @fastify/rate-limit uses `timeWindow` not `windowMs`
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
  });

  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url?.startsWith('/api/auth/')) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: { max: 10, timeWindow: '15 minutes' },
      };
    }
  });

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (error.validation) {
      return reply.status(400).send({ success: false, error: 'Validation failed', details: error.validation });
    }
    return reply.status(error.statusCode ?? 500).send({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  });

  // Simple request timeout via raw socket
  fastify.addHook('onRequest', async (_request, reply) => {
    const timer = setTimeout(() => {
      if (!reply.sent) reply.status(408).send({ success: false, error: 'Request timeout' });
    }, 30000);
    reply.raw.on('finish', () => clearTimeout(timer));
  });
}
