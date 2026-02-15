import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { getSocket } from '../hooks/useSocket';
import { getApiUrl } from '../lib/config';
import type { MessagePayload, AttachmentPayload, EmbedPayload, ReactionGroup, LinkPreviewPayload } from '@btow/shared';

interface MessageState {
  messagesByChannel: Record<string, MessagePayload[]>;
  hasMore: Record<string, boolean>;
  loading: Record<string, boolean>;

  addMessage: (message: MessagePayload) => void;
  updateMessage: (message: MessagePayload) => void;
  deleteMessage: (messageId: string, channelId: string) => void;
  setMessages: (channelId: string, messages: MessagePayload[], hasMore: boolean) => void;
  prependMessages: (channelId: string, messages: MessagePayload[], hasMore: boolean) => void;

  sendMessage: (channelId: string, content: string, replyToId?: string) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessageAction: (messageId: string) => void;
  fetchMessages: (channelId: string, before?: string) => Promise<void>;
}

const API_URL = getApiUrl().replace(/\/api$/, '');

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByChannel: {},
  hasMore: {},
  loading: {},

  addMessage: (message) =>
    set((state) => {
      const existing = state.messagesByChannel[message.channelId] ?? [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [message.channelId]: [...existing, message],
        },
      };
    }),

  updateMessage: (message) =>
    set((state) => {
      const existing = state.messagesByChannel[message.channelId] ?? [];
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [message.channelId]: existing.map((m) =>
            m.id === message.id ? { ...m, ...message } : m
          ),
        },
      };
    }),

  deleteMessage: (messageId, channelId) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] ?? []).filter(
          (m) => m.id !== messageId
        ),
      },
    })),

  setMessages: (channelId, messages, hasMore) =>
    set((state) => ({
      messagesByChannel: { ...state.messagesByChannel, [channelId]: messages },
      hasMore: { ...state.hasMore, [channelId]: hasMore },
    })),

  prependMessages: (channelId, messages, hasMore) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [...messages, ...(state.messagesByChannel[channelId] ?? [])],
      },
      hasMore: { ...state.hasMore, [channelId]: hasMore },
    })),

  sendMessage: (channelId, content, replyToId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('message:send', { channelId, content, replyToId });
  },

  editMessage: (messageId, content) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('message:edit', { messageId, content });
  },

  deleteMessageAction: (messageId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('message:delete', { messageId });
  },

  fetchMessages: async (channelId, before) => {
    if (get().loading[channelId]) return;
    set((s) => ({ loading: { ...s.loading, [channelId]: true } }));

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (before) params.set('before', before);

      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_URL}/api/channels/${channelId}/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch messages');

      const data = (await res.json()) as { messages: MessagePayload[]; hasMore: boolean };

      if (before) {
        get().prependMessages(channelId, data.messages, data.hasMore);
      } else {
        get().setMessages(channelId, data.messages, data.hasMore);
      }
    } catch (err) {
      console.error('[Messages] fetch error:', err);
    } finally {
      set((s) => ({ loading: { ...s.loading, [channelId]: false } }));
    }
  },
}));
