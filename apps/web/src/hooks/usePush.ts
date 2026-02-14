import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePush() {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermission);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setLoading(true);
    try {
      // Fetch VAPID public key
      const keyRes = await fetch('/api/push/vapid-key');
      const { publicKey } = (await keyRes.json()) as { publicKey: string | null };

      if (!publicKey) {
        console.warn('[Push] VAPID public key not configured on server');
        return;
      }

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== 'granted') return;

      // Subscribe via service worker push manager
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const p256dhBuffer = subscription.getKey('p256dh');
      const authBuffer = subscription.getKey('auth');
      if (!p256dhBuffer || !authBuffer) throw new Error('Missing subscription keys');

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhBuffer)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(authBuffer)));

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[Push] subscription failed:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setSubscribed(false);
    } catch (err) {
      console.error('[Push] unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return { permission, subscribed, loading, subscribe, unsubscribe };
}
