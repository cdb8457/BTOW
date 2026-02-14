import { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

const MAX_FILE_SIZE = 26_214_400; // 25 MB

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/zip', 'application/x-tar', 'application/x-gzip', 'application/json',
];

export interface UploadedFile {
  file_id: string;
  file_url: string;
  filename: string;
  content_type: string;
  size: number;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile> => {
      if (file.size > MAX_FILE_SIZE) {
        const e = 'File too large (max 25MB)';
        setError(e);
        throw new Error(e);
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        const e = `Type not allowed: ${file.type}`;
        setError(e);
        throw new Error(e);
      }

      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Step 1: get presigned URL
        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
            size: file.size,
          }),
        });

        if (!presignRes.ok) {
          throw new Error(`Presign failed: ${presignRes.statusText}`);
        }

        const { upload_url, uploadUrl, file_url, fileUrl, file_id, fileId } =
          await presignRes.json();

        const resolvedUploadUrl: string = upload_url ?? uploadUrl;
        const resolvedFileUrl: string = file_url ?? fileUrl;
        const resolvedFileId: string = file_id ?? fileId;

        // Step 2: PUT file directly to MinIO via presigned URL
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
          xhr.open('PUT', resolvedUploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        setProgress(100);

        return {
          file_id: resolvedFileId,
          file_url: resolvedFileUrl,
          filename: file.name,
          content_type: file.type,
          size: file.size,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [accessToken]
  );

  return { upload, uploading, progress, error, reset };
}
