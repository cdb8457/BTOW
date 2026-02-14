import type { FastifyInstance } from 'fastify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v7 as uuidv7 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const BUCKET = process.env.MINIO_BUCKET || 'btow-uploads';
const MAX_FILE_SIZE = 26_214_400; // 25 MB
const MAX_IMAGE_SIZE = 8_388_608; // 8 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/zip', 'application/x-tar', 'application/x-gzip', 'application/json',
];

function makeS3Client(): S3Client {
  return new S3Client({
    endpoint: `http://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? 9000}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? '',
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
    },
    forcePathStyle: true,
  });
}

export async function uploadRoutes(fastify: FastifyInstance) {
  // POST /api/upload/presign — Get a presigned URL to upload a file directly to MinIO
  fastify.post(
    '/api/upload/presign',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply) => {
      const { filename, contentType, content_type, size, context } = (request.body ?? {}) as {
        filename?: string;
        contentType?: string;
        content_type?: string;
        size?: number;
        context?: 'avatar' | 'server-icon' | 'attachment';
      };

      // Accept both camelCase and snake_case content type field
      const resolvedContentType = contentType ?? content_type;

      if (!filename || !resolvedContentType || size === undefined) {
        return reply.status(400).send({ error: 'filename, contentType/content_type, and size are required' });
      }

      if (size > MAX_FILE_SIZE) {
        return reply.status(400).send({ error: 'File too large (max 25 MB)' });
      }

      const isImage = context === 'avatar' || context === 'server-icon';
      const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;

      if (!allowedTypes.includes(resolvedContentType)) {
        return reply.status(400).send({ error: `File type not allowed: ${resolvedContentType}` });
      }

      if (isImage && size > MAX_IMAGE_SIZE) {
        return reply.status(400).send({ error: 'Image too large (max 8 MB for avatars/icons)' });
      }

      const ext = filename.split('.').pop() ?? 'bin';
      const folder = context ?? 'attachments';
      const fileId = uuidv7();
      const key = `${folder}/${fileId}.${ext}`;

      const s3 = makeS3Client();
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: resolvedContentType,
        ContentLength: size,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      const fileUrl = `${process.env.PUBLIC_MINIO_URL ?? 'http://localhost:9000'}/${BUCKET}/${key}`;

      return reply.send({ uploadUrl, fileUrl, fileId, key, upload_url: uploadUrl, file_url: fileUrl, file_id: fileId });
    }
  );
}
