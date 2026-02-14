import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Reuse existing live connection
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => console.log('[Socket] Connected'));
    socket.on('disconnect', (reason) => console.log(`[Socket] Disconnected: ${reason}`));
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

    socketInstance = socket;
    socketRef.current = socket;
  }, [accessToken]);

  // Disconnect on logout
  useEffect(() => {
    if (!accessToken && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      socketRef.current = null;
    }
  }, [accessToken]);

  return socketRef.current;
}

export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event, ...deps]);
}

export function getSocket(): Socket | null {
  return socketInstance;
}
