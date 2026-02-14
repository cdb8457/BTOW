import { create } from 'zustand';

export interface VoiceParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}

interface VoiceState {
  // Connection state
  channelId: string | null;
  serverId: string | null;
  livekitUrl: string | null;
  token: string | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Local user controls
  isMuted: boolean;
  isDeafened: boolean;

  // Participants in the current channel (including self)
  participants: Map<string, VoiceParticipant>;

  // Actions
  setToken: (token: string, livekitUrl: string, channelId: string, serverId: string) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  addParticipant: (p: VoiceParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<VoiceParticipant>) => void;
  setSpeaking: (userId: string, speaking: boolean) => void;
  disconnect: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  channelId: null,
  serverId: null,
  livekitUrl: null,
  token: null,
  isConnected: false,
  isConnecting: false,
  isMuted: false,
  isDeafened: false,
  participants: new Map(),

  setToken: (token, livekitUrl, channelId, serverId) =>
    set({ token, livekitUrl, channelId, serverId, isConnecting: true }),

  setConnected: (isConnected) => set({ isConnected, isConnecting: false }),

  setConnecting: (isConnecting) => set({ isConnecting }),

  setMuted: (isMuted) => set({ isMuted }),

  setDeafened: (isDeafened) => set({ isDeafened }),

  addParticipant: (p) =>
    set((state) => {
      const next = new Map(state.participants);
      next.set(p.userId, p);
      return { participants: next };
    }),

  removeParticipant: (userId) =>
    set((state) => {
      const next = new Map(state.participants);
      next.delete(userId);
      return { participants: next };
    }),

  updateParticipant: (userId, updates) =>
    set((state) => {
      const existing = state.participants.get(userId);
      if (!existing) return {};
      const next = new Map(state.participants);
      next.set(userId, { ...existing, ...updates });
      return { participants: next };
    }),

  setSpeaking: (userId, speaking) =>
    set((state) => {
      const existing = state.participants.get(userId);
      if (!existing) return {};
      const next = new Map(state.participants);
      next.set(userId, { ...existing, isSpeaking: speaking });
      return { participants: next };
    }),

  disconnect: () =>
    set({
      channelId: null,
      serverId: null,
      livekitUrl: null,
      token: null,
      isConnected: false,
      isConnecting: false,
      isMuted: false,
      isDeafened: false,
      participants: new Map(),
    }),
}));
