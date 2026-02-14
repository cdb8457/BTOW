import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface ServerData {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  createdAt: string;
}

interface ServerState {
  servers: ServerData[];
  activeServerId: string | null;
  loading: boolean;
  error: string | null;

  fetchServers: () => Promise<void>;
  setActiveServer: (id: string) => void;
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  activeServerId: null,
  loading: false,
  error: null,

  fetchServers: async () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    set({ loading: true, error: null });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/servers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch servers');
      const data = await res.json();
      set((state) => ({
        servers: data.servers,
        // Keep active server if it still exists, else pick first
        activeServerId:
          state.activeServerId && data.servers.some((s: ServerData) => s.id === state.activeServerId)
            ? state.activeServerId
            : data.servers[0]?.id ?? null,
        loading: false,
      }));
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  setActiveServer: (id) => set({ activeServerId: id }),
}));
