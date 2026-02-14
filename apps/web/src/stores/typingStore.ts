import { create } from 'zustand';
import { getSocket } from '../hooks/useSocket';

interface TypingUser {
  userId: string;
  username: string;
  clearAt: ReturnType<typeof setTimeout>;
}

interface TypingState {
  typingByChannel: Record<string, TypingUser[]>;

  setUserTyping: (channelId: string, userId: string, username: string) => void;
  clearUserTyping: (channelId: string, userId: string) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
}

let localTypingTimer: ReturnType<typeof setTimeout> | null = null;
let isTyping = false;

export const useTypingStore = create<TypingState>((set, get) => ({
  typingByChannel: {},

  setUserTyping: (channelId, userId, username) =>
    set((state) => {
      const existing = state.typingByChannel[channelId] ?? [];
      const prev = existing.find((u) => u.userId === userId);
      if (prev) clearTimeout(prev.clearAt);

      const clearAt = setTimeout(() => {
        get().clearUserTyping(channelId, userId);
      }, 6000);

      return {
        typingByChannel: {
          ...state.typingByChannel,
          [channelId]: [
            ...existing.filter((u) => u.userId !== userId),
            { userId, username, clearAt },
          ],
        },
      };
    }),

  clearUserTyping: (channelId, userId) =>
    set((state) => {
      const existing = state.typingByChannel[channelId] ?? [];
      const user = existing.find((u) => u.userId === userId);
      if (user) clearTimeout(user.clearAt);
      return {
        typingByChannel: {
          ...state.typingByChannel,
          [channelId]: existing.filter((u) => u.userId !== userId),
        },
      };
    }),

  startTyping: (channelId) => {
    const socket = getSocket();
    if (!socket) return;

    if (!isTyping) {
      socket.emit('typing:start', { channelId });
      isTyping = true;
    }

    if (localTypingTimer) clearTimeout(localTypingTimer);
    localTypingTimer = setTimeout(() => {
      get().stopTyping(channelId);
    }, 3000);
  },

  stopTyping: (channelId) => {
    const socket = getSocket();
    if (isTyping && socket) {
      socket.emit('typing:stop', { channelId });
      isTyping = false;
    }
    if (localTypingTimer) {
      clearTimeout(localTypingTimer);
      localTypingTimer = null;
    }
  },
}));
