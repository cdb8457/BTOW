import { useState, useEffect } from 'react';
import { useServerSettingsStore, Role } from '../../../stores/serverSettingsStore';
import { Permission, PERMISSION_LABELS, togglePermission } from '../../../utils/permissions';
import { SettingsToggle } from '../../settings/SettingsToggle';

interface RolesTabProps {
  serverId: string;
}

// Predefined color options for the color picker
const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#6b7280', '#9ca3af', '#f8fafc',
];

// Permission categories for grouping
const PERMISSION_CATEGORIES = [
  {
    id: 'general',
    label: 'Server',
    permissions: [
      Permission.ADMINISTRATOR,
      Permission.MANAGE_SERVER,
      Permission.MANAGE_CHANNELS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_MEMBERS,
    ],
  },
  {
    id: 'text',
    label: 'Messages',
    permissions: [
      Permission.SEND_MESSAGES,
      Permission.MANAGE_MESSAGES,
      Permission.ATTACH_FILES,
      Permission.ADD_REACTIONS,
      Permission.MENTION_EVERYONE,
    ],
  },
  {
    id: 'voice',
    label: 'Voice',
    permissions: [
      Permission.CONNECT,
      Permission.SPEAK,
      Permission.MUTE_MEMBERS,
      Permission.DEAFEN_MEMBERS,
    ],
  },
];

export function RolesTab({ serverId }: RolesTabProps) {
  const { roles, loading, loadRoles, createRole, updateRole, deleteRole } = useServerSettingsStore();
  
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Local editing state
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [editPermissions, setEditPermissions] = useState<number>(0);
  const [editHoist, setEditHoist] = useState(false);
  const [editMentionable, setEditMentionable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load roles on mount
  useEffect(() => {
    if (serverId) {
      loadRoles(serverId);
    }
  }, [serverId, loadRoles]);

  // Update local state when selected role changes
  useEffect(() => {
    const role = roles.find((r: Role) => r.id === selectedRoleId);
    if (role) {
      setEditName(role.name);
      setEditColor(role.color);
      // Convert string[] permissions to bitmask
      const permBitmask = role.permissions.reduce((acc: number, perm: string) => {
        const permEnum = parseInt(perm, 10);
        if (!isNaN(permEnum)) {
          return acc | permEnum;
        }
        return acc;
      }, 0);
      setEditPermissions(permBitmask);
    }
  }, [selectedRoleId, roles]);

  const selectedRole = roles.find((r: Role) => r.id === selectedRoleId);

  // Handle creating a new role
  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !serverId) return;
    
    setIsCreating(true);
    try {
      const newRole = await createRole(serverId, {
        name: newRoleName.trim(),
        color: editColor,
        permissions: [],
      });
      setSelectedRoleId(newRole.id);
      setNewRoleName('');
    } catch (err) {
      console.error('Failed to create role:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle updating role field
  const handleUpdateField = async (field: 'name' | 'color', value: string) => {
    if (!selectedRoleId || !serverId) return;
    
    setIsSaving(true);
    try {
      await updateRole(serverId, selectedRoleId, { [field]: value });
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = async (permission: Permission) => {
    if (!selectedRoleId || !serverId) return;
    
    const newPermissions = togglePermission(editPermissions, permission);
    setEditPermissions(newPermissions);
    
    setIsSaving(true);
    try {
      // Convert bitmask to string[]
      const permArray: string[] = [];
      for (const perm of Object.values(Permission)) {
        if (typeof perm === 'number' && (newPermissions & perm) === perm) {
          permArray.push(perm.toString());
        }
      }
      await updateRole(serverId, selectedRoleId, { permissions: permArray });
    } catch (err) {
      console.error('Failed to update permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete role
  const handleDeleteRole = async () => {
    if (!selectedRoleId || !serverId) return;
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) return;
    
    try {
      await deleteRole(serverId, selectedRoleId);
      setSelectedRoleId(null);
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  // Sort roles by position (higher position = higher in list)
  const sortedRoles = [...roles].sort((a, b) => b.position - a.position);

  return (
    <div className="flex h-full">
      {/* Roles List Panel */}
      <div className="w-64 border-r border-border-glass flex flex-col">
        <div className="p-4 border-b border-border-glass">
          <h2 className="text-sm font-semibold text-white">Roles</h2>
          <p className="text-[11px] text-slate-500 mt-1">Manage server roles</p>
        </div>
        
        {/* Roles List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-lime-accent/30 border-t-lime-accent rounded-full animate-spin" />
            </div>
          ) : sortedRoles.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4">No roles yet</p>
          ) : (
            <div className="space-y-1">
              {sortedRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150',
                    selectedRoleId === role.id
                      ? 'bg-violet-accent/20 border border-violet-accent/40'
                      : 'hover:bg-white/5 border border-transparent',
                  ].join(' ')}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="text-sm text-white truncate">{role.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Create New Role Input */}
        <div className="p-3 border-t border-border-glass">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="New role name..."
              className="flex-1 bg-black/40 border border-border-glass rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-accent/50"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
            />
            <button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim() || isCreating}
              className="px-3 py-2 bg-lime-accent/20 hover:bg-lime-accent/30 border border-lime-accent/40 rounded-lg text-lime-accent text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Role Editor Panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedRole ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl border-2"
                style={{ 
                  backgroundColor: `${editColor}20`,
                  borderColor: editColor,
                }}
              />
              <div>
                <h3 className="text-lg font-semibold text-white">{editName}</h3>
                <p className="text-xs text-slate-500">Role ID: {selectedRole.id}</p>
              </div>
            </div>

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">Role Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleUpdateField('name', editName)}
                className="w-full bg-black/40 border border-border-glass rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-accent/50 transition-colors"
              />
            </div>

            {/* Color Picker */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">Role Color</label>
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-border-glass"
                  style={{ backgroundColor: editColor }}
                />
                <div className="flex-1 grid grid-cols-10 gap-1.5">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setEditColor(color);
                        handleUpdateField('color', color);
                      }}
                      className={[
                        'w-5 h-5 rounded-md transition-transform hover:scale-110',
                        editColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : '',
                      ].join(' ')}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hoist & Mentionable Toggles */}
            <div className="mb-6 p-4 bg-bg-surface rounded-xl border border-border-glass">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Hoist Role</p>
                    <p className="text-[11px] text-slate-500">Show role separately in member list</p>
                  </div>
                  <SettingsToggle
                    value={editHoist}
                    onChange={(val: boolean) => setEditHoist(val)}
                  />
                </div>
                <div className="h-px bg-border-glass" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Mentionable</p>
                    <p className="text-[11px] text-slate-500">Allow @mention of this role</p>
                  </div>
                  <SettingsToggle
                    value={editMentionable}
                    onChange={(val: boolean) => setEditMentionable(val)}
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3">Permissions</label>
              <div className="space-y-4">
                {PERMISSION_CATEGORIES.map((category) => (
                  <div 
                    key={category.id}
                    className="p-4 bg-bg-surface rounded-xl border border-border-glass"
                  >
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      {category.label}
                    </h4>
                    <div className="space-y-2">
                      {category.permissions.map((perm) => {
                        const permInfo = PERMISSION_LABELS[perm];
                        const isEnabled = (editPermissions & perm) === perm;
                        
                        return (
                          <div 
                            key={perm}
                            className="flex items-center justify-between py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-white">{permInfo?.label ?? 'Unknown'}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                {permInfo?.description ?? ''}
                              </p>
                            </div>
                            <SettingsToggle
                              value={isEnabled}
                              onChange={() => handlePermissionToggle(perm)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Role Button */}
            <div className="pt-4 border-t border-border-glass">
              <button
                onClick={handleDeleteRole}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors"
              >
                Delete Role
              </button>
            </div>

            {/* Saving Indicator */}
            {isSaving && (
              <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-violet-accent/20 border border-violet-accent/40 rounded-lg text-xs text-violet-accent">
                Saving...
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-bg-surface border border-border-glass flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Select a Role</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Choose a role from the list to edit its settings, or create a new role to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
