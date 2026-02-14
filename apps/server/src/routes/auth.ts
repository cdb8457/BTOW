import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '@btow/shared';
import { z } from 'zod';

const RegisterResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      username: z.string(),
      displayName: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      bannerUrl: z.string().nullable(),
      status: z.enum(['online', 'idle', 'dnd', 'offline']),
      customStatus: z.string().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

const LoginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      username: z.string(),
      displayName: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      bannerUrl: z.string().nullable(),
      status: z.enum(['online', 'idle', 'dnd', 'offline']),
      customStatus: z.string().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

const RefreshResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // Register endpoint
  fastify.post(
    '/api/auth/register',
    {
      schema: {
        body: RegisterSchema,
        response: {
          201: RegisterResponseSchema,
          400: z.object({ success: z.boolean(), error: z.string() }),
          409: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { username, displayName, email, password } = request.body as z.infer<typeof RegisterSchema>;

      try {
        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
          return reply.status(409).send({ success: false, error: 'Email already registered' });
        }

        // Check username
        const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (existingUsername.length > 0) {
          return reply.status(409).send({ success: false, error: 'Username already taken' });
        }

        // Hash password
        const passwordHash = await authService.hashPassword(password);

        // Create user
        const [newUser] = await db.insert(users).values({
          username,
          displayName,
          email,
          passwordHash,
          status: 'offline',
        }).returning();

        // Generate tokens
        const { accessToken, refreshToken } = authService.generateTokenPair({
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
        });

        return reply.status(201).send({
          success: true,
          data: {
            user: {
              id: newUser.id,
              username: newUser.username,
              displayName: newUser.displayName,
              email: newUser.email,
              avatarUrl: newUser.avatarUrl,
              bannerUrl: newUser.bannerUrl,
              status: newUser.status,
              customStatus: newUser.customStatus,
              createdAt: newUser.createdAt,
              updatedAt: newUser.updatedAt,
            },
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal server error' });
      }
    }
  );

  // Login endpoint
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        body: LoginSchema,
        response: {
          200: LoginResponseSchema,
          400: z.object({ success: z.boolean(), error: z.string() }),
          401: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as z.infer<typeof LoginSchema>;

      try {
        // Find user
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!existingUser) {
          return reply.status(401).send({ success: false, error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await authService.comparePassword(password, existingUser.passwordHash);
        if (!isValidPassword) {
          return reply.status(401).send({ success: false, error: 'Invalid credentials' });
        }

        // Generate tokens
        const { accessToken, refreshToken } = authService.generateTokenPair({
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
        });

        return reply.send({
          success: true,
          data: {
            user: {
              id: existingUser.id,
              username: existingUser.username,
              displayName: existingUser.displayName,
              email: existingUser.email,
              avatarUrl: existingUser.avatarUrl,
              bannerUrl: existingUser.bannerUrl,
              status: existingUser.status,
              customStatus: existingUser.customStatus,
              createdAt: existingUser.createdAt,
              updatedAt: existingUser.updatedAt,
            },
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal server error' });
      }
    }
  );

  // Refresh token endpoint
  fastify.post(
    '/api/auth/refresh',
    {
      schema: {
        body: RefreshTokenSchema,
        response: {
          200: RefreshResponseSchema,
          400: z.object({ success: z.boolean(), error: z.string() }),
          401: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as z.infer<typeof RefreshTokenSchema>;

      try {
        // Verify refresh token
        const decoded = authService.verifyRefreshToken(refreshToken);

        // Find user
        const [existingUser] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
        if (!existingUser) {
          return reply.status(401).send({ success: false, error: 'Invalid refresh token' });
        }

        // Generate new tokens
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = authService.generateTokenPair({
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
        });

        return reply.send({
          success: true,
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        });
      } catch (error) {
        return reply.status(401).send({ success: false, error: 'Invalid refresh token' });
      }
    }
  );

  // Logout endpoint
  fastify.post(
    '/api/auth/logout',
    {
      schema: {
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ success: true });
    }
  );
}