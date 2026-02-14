import { create } from 'zustand';

interface PresenceState {
  statusByUser: Record<string, string>;
  setUserStatus: (userId: string, status: string) => void;
  getStatus: (userId: string) => string;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  statusByUser: {},

  setUserStatus: (userId, status) =>
    set((state) => ({
      statusByUser: { ...state.statusByUser, [userId]: status },
    })),

  getStatus: (userId) => get().statusByUser[userId] ?? 'offline',
}));
