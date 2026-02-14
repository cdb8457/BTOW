import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface DMAttachment {
  id: string;
  filename: string;
  url: string;
  content_type: string;
  size: number;
}

export interface DMMessage {
  id: string;
  author_id: string;
  content: string;
  attachments: DMAttachment[];
  created_at: string;
}

export interface DMChannel {
  id: string;
  type: 'dm' | 'group_dm';
  name: string | null;
  participants: DMParticipant[];
  last_message?: DMMessage;
  unread_count: number;
}

export interface DMParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
}

interface DMState {
  dms: DMChannel[];
  dmsLoaded: boolean;
  messages: Record<string, DMMessage[]>;
  typingUsers: Record<string, Set<string>>;
  activeDmId: string | null;
  loadDMs: () => Promise<void>;
  loadMessages: (dmId: string, before?: string) => Promise<void>;
  sendMessage: (dmId: string, content: string, attachments?: DMAttachment[]) => Promise<void>;
  addMessage: (dmId: string, message: DMMessage) => void;
  setTyping: (dmId: string, userId: string, typing: boolean) => void;
  setActiveDm: (dmId: string | null) => void;
  markRead: (dmId: string) => void;
  createDM: (recipientId: string) => Promise<string>;
}

const apiFetch = async (path: string, options?: RequestInit) => {
  const token = useAuthStore.getState().accessToken ?? '';
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export const useDMStore = create<DMState>((set, get) => ({
  dms: [],
  dmsLoaded: false,
  messages: {},
  typingUsers: {},
  activeDmId: null,

  loadDMs: async () => {
    const dms = await apiFetch('/api/dms');
    set({ dms: (dms as DMChannel[]).map((d) => ({ ...d, participants: d.participants ?? [], unread_count: d.unread_count ?? 0 })), dmsLoaded: true });
  },

  loadMessages: async (dmId, before) => {
    const url = before
      ? `/api/dms/${dmId}/messages?before=${before}&limit=50`
      : `/api/dms/${dmId}/messages?limit=50`;
    const data = await apiFetch(url);
    // API returns { messages: [...], hasMore: bool } or just an array
    const msgs: DMMessage[] = Array.isArray(data) ? data : (data.messages ?? []);
    set((s) => ({
      messages: {
        ...s.messages,
        [dmId]: before ? [...msgs, ...(s.messages[dmId] ?? [])] : msgs,
      },
    }));
  },

  sendMessage: async (dmId, content, attachments) => {
    const msg = await apiFetch(`/api/dms/${dmId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments: attachments ?? [] }),
    });
    get().addMessage(dmId, msg as DMMessage);
  },

  addMessage: (dmId, message) =>
    set((s) => {
      const existing = s.messages[dmId] ?? [];
      // Deduplicate by id
      if (existing.some((m) => m.id === message.id)) return s;
      return {
        messages: { ...s.messages, [dmId]: [...existing, message] },
        dms: s.dms.map((dm) =>
          dm.id === dmId
            ? {
                ...dm,
                last_message: message,
                unread_count: dm.id === s.activeDmId ? 0 : dm.unread_count + 1,
              }
            : dm
        ),
      };
    }),

  setTyping: (dmId, userId, typing) =>
    set((s) => {
      const current = new Set(s.typingUsers[dmId] ?? []);
      if (typing) current.add(userId);
      else current.delete(userId);
      return { typingUsers: { ...s.typingUsers, [dmId]: current } };
    }),

  setActiveDm: (dmId) => {
    set({ activeDmId: dmId });
    if (dmId) get().markRead(dmId);
  },

  markRead: (dmId) =>
    set((s) => ({
      dms: s.dms.map((dm) => (dm.id === dmId ? { ...dm, unread_count: 0 } : dm)),
    })),

  createDM: async (recipientId) => {
    const dm = await apiFetch('/api/dms', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId }),
    });
    const dmChannel: DMChannel = {
      id: (dm as { id: string }).id,
      type: 'dm',
      name: null,
      participants: [],
      unread_count: 0,
    };
    set((s) => ({
      dms: s.dms.some((d) => d.id === dmChannel.id) ? s.dms : [dmChannel, ...s.dms],
    }));
    return dmChannel.id;
  },
}));
