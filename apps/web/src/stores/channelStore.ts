import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface ChannelData {
  id: string;
  name: string;
  type: string;
  topic: string | null;
  position: number;
  categoryId: string | null;
}

export interface CategoryData {
  id: string;
  name: string;
  position: number;
}

interface ChannelState {
  channels: ChannelData[];
  categories: CategoryData[];
  activeChannelId: string | null;
  loadedServerId: string | null;
  loading: boolean;
  error: string | null;

  fetchChannels: (serverId: string) => Promise<void>;
  setActiveChannel: (id: string) => void;
}

export const useChannelStore = create<ChannelState>((set) => ({
  channels: [],
  categories: [],
  activeChannelId: null,
  loadedServerId: null,
  loading: false,
  error: null,

  fetchChannels: async (serverId: string) => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/servers/${serverId}/channels`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch channels');
      const data = await res.json();
      set((state) => ({
        channels: data.channels,
        categories: data.categories,
        loadedServerId: serverId,
        // Keep active channel if it belongs to this server, else pick first text channel
        activeChannelId:
          state.activeChannelId && data.channels.some((c: ChannelData) => c.id === state.activeChannelId)
            ? state.activeChannelId
            : data.channels.find((c: ChannelData) => c.type === 'text')?.id ?? null,
        loading: false,
      }));
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  setActiveChannel: (id) => set({ activeChannelId: id }),
}));
