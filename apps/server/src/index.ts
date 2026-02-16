import Fastify from 'fastify';
import { config } from 'dotenv';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { setupMiddleware } from './middleware';
import { authRoutes } from './routes/auth';
import { messageRoutes } from './routes/messages';
import { serverRoutes } from './routes/servers';
import { inviteRoutes } from './routes/invites';
import { channelRoutes } from './routes/channels';
import { uploadRoutes } from './routes/upload';
import { livekitRoutes } from './routes/livekit';
import { dmRoutes } from './routes/dms';
import { reactionRoutes } from './routes/reactions';
import { pinRoutes } from './routes/pins';
import { pushRoutes } from './routes/push';
import { userRoutes } from './routes/users';
import { serverSettingsRoutes } from './routes/serverSettings';
import { initializeSocketIO } from './socket';

// Load environment variables
config({ path: '../../.env' });

// Create Fastify instance
  const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

async function start() {
  try {
    // Set up middleware (CORS, helmet, rate-limit)
    await setupMiddleware(fastify);

    // Register REST routes
    await fastify.register(authRoutes);
    await fastify.register(messageRoutes);
    await fastify.register(serverRoutes);
    await fastify.register(inviteRoutes);
    await fastify.register(channelRoutes);
    await fastify.register(uploadRoutes);
    await fastify.register(livekitRoutes);
    await fastify.register(dmRoutes);
    await fastify.register(reactionRoutes);
    await fastify.register(pinRoutes);
    await fastify.register(pushRoutes);
    await fastify.register(userRoutes);
    await fastify.register(serverSettingsRoutes);

    // Health check
    fastify.get('/health', async (_request, _reply) => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    }));

    fastify.get('/', async (_request, _reply) => ({
      name: 'BTOW API',
      version: '0.1.0',
      status: 'running',
    }));

    // Start listening first — Socket.IO needs the underlying http.Server
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });

    // Initialize Socket.IO after server is listening
    await initializeSocketIO(fastify);

    fastify.log.info(`🚀 Server listening on http://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  fastify.log.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});

start();
