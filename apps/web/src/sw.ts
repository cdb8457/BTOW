/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Background Sync event type (not yet in lib.webworker.d.ts)
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

// Workbox precache manifest injected at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

// ─── Runtime Caching ──────────────────────────────────────────────────────────

// API channel messages — stale-while-revalidate
registerRoute(
  ({ url }: { url: URL }) => /\/api\/channels\/.*\/messages/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'btow-messages',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// MinIO file uploads — cache first (immutable assets)
registerRoute(
  ({ url }: { url: URL }) => /\/btow-uploads\//.test(url.pathname) || /\/btow-uploads\//.test(url.href),
  new CacheFirst({
    cacheName: 'btow-uploads',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Google Fonts stylesheets
registerRoute(
  ({ url }: { url: URL }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// Google Fonts webfonts
registerRoute(
  ({ url }: { url: URL }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    data?: Record<string, unknown>;
  };

  const notifOptions: NotificationOptions & { vibrate?: number[] } = {
    body: data.body,
    icon: data.icon ?? '/icons/pwa-192x192.png',
    badge: data.badge ?? '/icons/badge-72x72.png',
    tag: data.tag ?? 'btow-message',
    data: { url: data.url ?? '/', ...data.data },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title, notifOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'btow-sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
}) as EventListener);

async function syncPendingMessages(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending-messages', 'readwrite');
  const store = tx.objectStore('pending-messages');

  const pending = await idbGetAll<PendingMessage>(store);

  for (const msg of pending) {
    try {
      const res = await fetch(`/api/channels/${msg.channel_id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${msg.token}`,
        },
        body: JSON.stringify({ content: msg.content }),
      });
      if (res.ok) {
        store.delete(msg.id);
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

interface PendingMessage {
  id: string;
  channel_id: string;
  content: string;
  token: string;
  queued_at: number;
}

function idbGetAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
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

// ─── Skip waiting on update message ──────────────────────────────────────────

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string })?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
