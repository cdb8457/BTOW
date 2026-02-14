import { create } from 'zustand';
import { useAuthStore } from './authStore';

// ============== Types ==============

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
  createdAt: string;
}

export interface ServerMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  joinedAt: string;
}

export interface BannedUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
  reason: string | null;
  bannedAt: string;
  bannedBy: string;
}

export interface ServerSettings {
  name: string;
  iconUrl: string | null;
  description: string | null;
}

// ============== Store ==============

interface ServerSettingsState {
  roles: Role[];
  members: ServerMember[];
  bans: BannedUser[];
  loading: boolean;
  loadedServerId: string | null;

  // Load actions
  loadRoles: (serverId: string) => Promise<void>;
  loadMembers: (serverId: string) => Promise<void>;
  loadBans: (serverId: string) => Promise<void>;

  // Role actions
  createRole: (serverId: string, data: { name: string; color: string; permissions: string[] }) => Promise<Role>;
  updateRole: (serverId: string, roleId: string, data: Partial<{ name: string; color: string; permissions: string[]; position: number }>) => Promise<void>;
  deleteRole: (serverId: string, roleId: string) => Promise<void>;

  // Member actions
  updateMember: (serverId: string, userId: string, data: { roles?: string[] }) => Promise<void>;
  kickMember: (serverId: string, userId: string) => Promise<void>;
  banMember: (serverId: string, userId: string, reason?: string) => Promise<void>;
  unbanMember: (serverId: string, userId: string) => Promise<void>;

  // Server actions
  updateServer: (serverId: string, data: Partial<ServerSettings>) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;

  // Utility
  clearSettings: () => void;
}

export const useServerSettingsStore = create<ServerSettingsState>((set) => ({
  roles: [],
  members: [],
  bans: [],
  loading: false,
  loadedServerId: null,

  // ============== Load actions ==============

  loadRoles: async (serverId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    set({ loading: true });
    try {
      const res = await fetch(`/api/servers/${serverId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load roles');
      const data = await res.json();
      set({ roles: data.roles, loadedServerId: serverId, loading: false });
    } catch (err) {
      console.error('Error loading roles:', err);
      set({ loading: false });
    }
  },

  loadMembers: async (serverId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    set({ loading: true });
    try {
      const res = await fetch(`/api/servers/${serverId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load members');
      const data = await res.json();
      set({ members: data.members, loadedServerId: serverId, loading: false });
    } catch (err) {
      console.error('Error loading members:', err);
      set({ loading: false });
    }
  },

  loadBans: async (serverId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    set({ loading: true });
    try {
      const res = await fetch(`/api/servers/${serverId}/bans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load bans');
      const data = await res.json();
      set({ bans: data.bans, loadedServerId: serverId, loading: false });
    } catch (err) {
      console.error('Error loading bans:', err);
      set({ loading: false });
    }
  },

  // ============== Role actions ==============

  createRole: async (serverId: string, data: { name: string; color: string; permissions: string[] }) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create role');

    const newRole = (await res.json()) as Role;
    set((state) => ({ roles: [...state.roles, newRole] }));
    return newRole;
  },

  updateRole: async (serverId: string, roleId: string, data: Partial<{ name: string; color: string; permissions: string[]; position: number }>) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/roles/${roleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update role');

    const updatedRole = (await res.json()) as Role;
    set((state) => ({
      roles: state.roles.map((r) => (r.id === roleId ? updatedRole : r)),
    }));
  },

  deleteRole: async (serverId: string, roleId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete role');

    set((state) => ({
      roles: state.roles.filter((r) => r.id !== roleId),
    }));
  },

  // ============== Member actions ==============

  updateMember: async (serverId: string, userId: string, data: { roles?: string[] }) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/members/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update member');

    const updatedMember = (await res.json()) as ServerMember;
    set((state) => ({
      members: state.members.map((m) => (m.userId === userId ? updatedMember : m)),
    }));
  },

  kickMember: async (serverId: string, userId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to kick member');

    set((state) => ({
      members: state.members.filter((m) => m.userId !== userId),
    }));
  },

  banMember: async (serverId: string, userId: string, reason?: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/bans/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to ban member');

    const bannedUser = (await res.json()) as BannedUser;
    set((state) => ({
      bans: [...state.bans, bannedUser],
      members: state.members.filter((m) => m.userId !== userId),
    }));
  },

  unbanMember: async (serverId: string, userId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}/bans/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to unban member');

    set((state) => ({
      bans: state.bans.filter((b) => b.userId !== userId),
    }));
  },

  // ============== Server actions ==============

  updateServer: async (serverId: string, data: Partial<ServerSettings>) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update server');
  },

  deleteServer: async (serverId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/servers/${serverId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete server');
  },

  // ============== Utility ==============

  clearSettings: () => {
    set({
      roles: [],
      members: [],
      bans: [],
      loadedServerId: null,
    });
  },
}));
