import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

interface PendingMessage {
  id: string;
  channel_id: string;
  content: string;
  token: string;
  queued_at: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('btow-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-messages')) {
        db.createObjectStore('pending-messages', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useOfflineSync() {
  const { accessToken } = useAuthStore();

  /**
   * Queue a message in IndexedDB for background sync when offline.
   * Returns the pending message id.
   */
  const queueMessage = useCallback(
    async (channelId: string, content: string): Promise<string> => {
      const db = await openDB();
      const pending: PendingMessage = {
        id: crypto.randomUUID(),
        channel_id: channelId,
        content,
        token: accessToken ?? '',
        queued_at: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('pending-messages', 'readwrite');
        tx.objectStore('pending-messages').add(pending);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Register Background Sync if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
          .sync.register('btow-sync-messages');
      }

      return pending.id;
    },
    [accessToken]
  );

  // When back online, re-trigger sync registration
  useEffect(() => {
    const handleOnline = async () => {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
            .sync.register('btow-sync-messages');
        } catch {
          // SyncManager may not be available in all environments
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    queueMessage,
  };
}
