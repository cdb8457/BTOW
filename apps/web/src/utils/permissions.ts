/**
 * Frontend Permissions Utility - BTOW Phase 9
 * Bitmask-based permission system matching backend
 */

export enum Permission {
  MANAGE_SERVER    = 1 << 0,
  MANAGE_CHANNELS  = 1 << 1,
  MANAGE_ROLES     = 1 << 2,
  MANAGE_MEMBERS   = 1 << 3,
  SEND_MESSAGES    = 1 << 4,
  MANAGE_MESSAGES  = 1 << 5,
  ATTACH_FILES     = 1 << 6,
  ADD_REACTIONS    = 1 << 7,
  MENTION_EVERYONE = 1 << 8,
  CONNECT          = 1 << 9,
  SPEAK            = 1 << 10,
  MUTE_MEMBERS     = 1 << 11,
  DEAFEN_MEMBERS   = 1 << 12,
  ADMINISTRATOR    = 1 << 30,
}

export interface PermissionLabel {
  category: 'general' | 'text' | 'voice' | 'moderation';
  label: string;
  description: string;
}

export const PERMISSION_LABELS: Record<Permission, PermissionLabel> = {
  [Permission.ADMINISTRATOR]: {
    category: 'general',
    label: 'Administrator',
    description: 'Grants all permissions and bypasses channel-specific restrictions',
  },
  [Permission.MANAGE_SERVER]: {
    category: 'general',
    label: 'Manage Server',
    description: 'Can modify server name, icon, and region settings',
  },
  [Permission.MANAGE_CHANNELS]: {
    category: 'general',
    label: 'Manage Channels',
    description: 'Can create, edit, and delete channels',
  },
  [Permission.MANAGE_ROLES]: {
    category: 'general',
    label: 'Manage Roles',
    description: 'Can create, edit, and delete roles',
  },
  [Permission.MANAGE_MEMBERS]: {
    category: 'moderation',
    label: 'Manage Members',
    description: 'Can kick, ban, and manage member roles',
  },
  [Permission.SEND_MESSAGES]: {
    category: 'text',
    label: 'Send Messages',
    description: 'Can send messages in text channels',
  },
  [Permission.MANAGE_MESSAGES]: {
    category: 'moderation',
    label: 'Manage Messages',
    description: 'Can delete and pin messages',
  },
  [Permission.ATTACH_FILES]: {
    category: 'text',
    label: 'Attach Files',
    description: 'Can upload files to the channel',
  },
  [Permission.ADD_REACTIONS]: {
    category: 'text',
    label: 'Add Reactions',
    description: 'Can add reactions to messages',
  },
  [Permission.MENTION_EVERYONE]: {
    category: 'text',
    label: 'Mention Everyone',
    description: 'Can use @everyone and @here mentions',
  },
  [Permission.CONNECT]: {
    category: 'voice',
    label: 'Connect',
    description: 'Can join voice channels',
  },
  [Permission.SPEAK]: {
    category: 'voice',
    label: 'Speak',
    description: 'Can speak in voice channels',
  },
  [Permission.MUTE_MEMBERS]: {
    category: 'moderation',
    label: 'Mute Members',
    description: 'Can mute members in voice channels',
  },
  [Permission.DEAFEN_MEMBERS]: {
    category: 'moderation',
    label: 'Deafen Members',
    description: 'Can deafen members in voice channels',
  },
};

/**
 * Check if a member's permissions include a specific permission
 */
export function hasPermission(memberPerms: number, permission: Permission): boolean {
  return (memberPerms & permission) === permission;
}

/**
 * Toggle a permission in the current permission bitmask
 */
export function togglePermission(current: number, permission: Permission): number {
  return current ^ permission;
}

/**
 * Get all permissions as an array of enabled Permission values
 */
export function getEnabledPermissions(bitmask: number): Permission[] {
  const enabled: Permission[] = [];
  for (const perm of Object.values(Permission)) {
    if (typeof perm === 'number' && hasPermission(bitmask, perm)) {
      enabled.push(perm);
    }
  }
  return enabled;
}

/**
 * Get human-readable permission names from a bitmask
 */
export function getPermissionNames(bitmask: number): string[] {
  return getEnabledPermissions(bitmask).map(p => PERMISSION_LABELS[p]?.label ?? 'Unknown');
}
