import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

export async function authMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const authService = new AuthService();
    const decoded = authService.verifyAccessToken(token);
    
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ success: false, error: 'Invalid token' });
  }
}

export async function optionalAuthMiddleware(request: AuthenticatedRequest, _reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const authService = new AuthService();
      request.user = authService.verifyAccessToken(token);
    }
  } catch {
    // optional — ignore
  }
}