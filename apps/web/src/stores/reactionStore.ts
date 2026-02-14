import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

interface ReactionState {
  reactions: Record<string, ReactionGroup[]>;
  addReaction: (messageId: string, userId: string, emoji: string) => void;
  removeReaction: (messageId: string, userId: string, emoji: string) => void;
  setReactions: (messageId: string, reactions: ReactionGroup[]) => void;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
}

const getToken = () => useAuthStore.getState().accessToken ?? '';
const getMe = () => useAuthStore.getState().user;

export const useReactionStore = create<ReactionState>((set, get) => ({
  reactions: {},

  addReaction: (messageId, userId, emoji) =>
    set((s) => {
      const existing = s.reactions[messageId] ?? [];
      const group = existing.find((r) => r.emoji === emoji);
      const updated = group
        ? existing.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
              : r
          )
        : [...existing, { emoji, count: 1, userIds: [userId] }];
      return { reactions: { ...s.reactions, [messageId]: updated } };
    }),

  removeReaction: (messageId, userId, emoji) =>
    set((s) => {
      const updated = (s.reactions[messageId] ?? [])
        .map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== userId) }
            : r
        )
        .filter((r) => r.count > 0);
      return { reactions: { ...s.reactions, [messageId]: updated } };
    }),

  setReactions: (messageId, reactions) =>
    set((s) => ({
      reactions: { ...s.reactions, [messageId]: reactions },
    })),

  toggleReaction: async (messageId, emoji) => {
    const me = getMe();
    if (!me) return;

    const group = (get().reactions[messageId] ?? []).find((r) => r.emoji === emoji);
    const hasReacted = group?.userIds.includes(me.id) ?? false;

    if (hasReacted) {
      get().removeReaction(messageId, me.id, emoji);
      await fetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } else {
      get().addReaction(messageId, me.id, emoji);
      await fetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    }
  },
}));
