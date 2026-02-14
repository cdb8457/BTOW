import { FastifyError, FastifyReply, FastifyRequest, FastifyInstance, FastifyPluginOptions } from 'fastify';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Custom API Error class with status code, error code, message and optional details
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Error Factory Functions

/**
 * 400 Bad Request - The server cannot or will not process the request due to something that is perceived to be a client error
 */
export function BadRequestError(message: string, details?: unknown): ApiError {
  return new ApiError(400, 'BAD_REQUEST', message, details);
}

/**
 * 401 Unauthorized - Although the HTTP standard specifies "unauthorized", semantically this means "unauthenticated"
 */
export function UnauthorizedError(message: string = 'Unauthorized'): ApiError {
  return new ApiError(401, 'UNAUTHORIZED', message);
}

/**
 * 403 Forbidden - The server understood the request but refuses to authorize it
 */
export function ForbiddenError(message: string = 'Forbidden'): ApiError {
  return new ApiError(403, 'FORBIDDEN', message);
}

/**
 * 404 Not Found - The requested resource could not be found on the server
 */
export function NotFoundError(resource: string): ApiError {
  return new ApiError(404, 'NOT_FOUND', `${resource} not found`);
}

/**
 * 409 Conflict - The request conflicts with the current state of the server
 */
export function ConflictError(message: string): ApiError {
  return new ApiError(409, 'CONFLICT', message);
}

/**
 * 422 Unprocessable Entity - The server understands the content type of the request entity, but was unable to process the contained instructions
 */
export function ValidationError(message: string, details?: unknown): ApiError {
  return new ApiError(422, 'VALIDATION_ERROR', message, details);
}

/**
 * 500 Internal Server Error - The server has encountered a situation it doesn't know how to handle
 */
export function InternalServerError(message: string = 'Internal server error'): ApiError {
  return new ApiError(500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Helper to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && typeof (error as ApiError).statusCode === 'number';
}

/**
 * Format error for response
 */
function formatErrorResponse(error: ApiError): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details !== undefined) {
    response.error.details = error.details;
  }

  return response;
}

/**
 * Fastify plugin for centralized error handling
 */
async function errorHandlerPlugin(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Set a generic 500 error handler for unhandled errors
  fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Check if this is already an ApiError or if the error has statusCode
    if (isApiError(error)) {
      const errorResponse = formatErrorResponse(error);
      
      if (isDevelopment) {
        fastify.log.error({
          err: error,
          url: request.url,
          method: request.method,
          statusCode: error.statusCode,
          code: error.code,
        });
      }

      return reply.status(error.statusCode).send(errorResponse);
    }

    // Handle Fastify's built-in errors with statusCode
    if (error.statusCode && error.statusCode >= 400) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      };

      if (isDevelopment && error.stack) {
        (errorResponse.error as Record<string, unknown>).stack = error.stack;
      }

      return reply.status(error.statusCode).send(errorResponse);
    }

    // Handle generic errors (500 Internal Server Error)
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
      },
    };

    // Log full error in development
    if (isDevelopment) {
      fastify.log.error({
        err: error,
        url: request.url,
        method: request.method,
        stack: error.stack,
      });
      (errorResponse.error as Record<string, unknown>).stack = error.stack;
    } else {
      // In production, just log a generic message to avoid leaking sensitive info
      fastify.log.error({
        err: error,
        url: request.url,
        method: request.method,
        msg: 'Unhandled error occurred',
      });
    }

    return reply.status(500).send(errorResponse);
  });

  // Handle 404 errors for routes that don't exist
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    };

    if (isDevelopment) {
      fastify.log.warn({
        url: request.url,
        method: request.method,
        msg: 'Route not found',
      });
    }

    return reply.status(404).send(errorResponse);
  });
}

// Export the error handler as a Fastify plugin
export const errorHandler = errorHandlerPlugin;

export default errorHandler;
