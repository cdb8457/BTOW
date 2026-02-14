import { useState, useEffect, useMemo } from 'react';
import { useServerSettingsStore, ServerMember, BannedUser, Role } from '../../../stores/serverSettingsStore';

interface MembersTabProps {
  serverId: string;
}

type ViewMode = 'members' | 'bans';

export function MembersTab({ serverId }: MembersTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('members');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banMember, setBanMember] = useState<ServerMember | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);

  // Store actions and data
  const { 
    members, 
    roles, 
    bans, 
    loading, 
    loadMembers, 
    loadBans, 
    loadRoles,
    kickMember,
    banMember: storeBanMember,
    unbanMember 
  } = useServerSettingsStore();

  // Load data on mount
  useEffect(() => {
    loadMembers(serverId);
    loadBans(serverId);
    loadRoles(serverId);
  }, [serverId, loadMembers, loadBans, loadRoles]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(query) ||
        m.username.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Get role by ID
  const getRoleById = (roleId: string): Role | undefined => {
    return roles.find((r) => r.id === roleId);
  };

  // Handle kick
  const handleKick = async (member: ServerMember) => {
    try {
      await kickMember(serverId, member.userId);
    } catch (err) {
      console.error('[MembersTab] Failed to kick member:', err);
    }
  };

  // Handle ban click
  const handleBanClick = (member: ServerMember) => {
    setBanMember(member);
    setBanReason('');
    setShowBanModal(true);
  };

  // Handle ban confirm
  const handleBanConfirm = async () => {
    if (!banMember) return;
    setBanning(true);
    try {
      await storeBanMember(serverId, banMember.userId, banReason || undefined);
      setShowBanModal(false);
      setBanMember(null);
      setBanReason('');
    } catch (err) {
      console.error('[MembersTab] Failed to ban member:', err);
    } finally {
      setBanning(false);
    }
  };

  // Handle unban
  const handleUnban = async (bannedUser: BannedUser) => {
    try {
      await unbanMember(serverId, bannedUser.userId);
    } catch (err) {
      console.error('[MembersTab] Failed to unban user:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Members</h2>
        
        {/* View Toggle */}
        <div className="flex rounded-xl obsidian-control border border-white/10 overflow-hidden">
          <button
            onClick={() => setViewMode('members')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              viewMode === 'members'
                ? 'bg-lime-accent/10 text-lime-accent'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">group</span>
            Members
          </button>
          <button
            onClick={() => setViewMode('bans')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              viewMode === 'bans'
                ? 'bg-lime-accent/10 text-lime-accent'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">block</span>
            Bans
          </button>
        </div>
      </div>

      {/* Search (only for members view) */}
      {viewMode === 'members' && (
        <div className="mb-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg" aria-hidden="true">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full obsidian-control rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 text-sm focus:ring-1 focus:ring-violet-accent/50 focus:outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-lime-accent/30 border-t-lime-accent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'members' ? (
          filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              {searchQuery ? 'No members found' : 'No members'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  getRoleById={getRoleById}
                  onKick={handleKick}
                  onBan={handleBanClick}
                />
              ))}
            </div>
          )
        ) : (
          bans.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No bans
            </div>
          ) : (
            <div className="space-y-1">
              {bans.map((bannedUser) => (
                <BannedUserRow
                  key={bannedUser.userId}
                  bannedUser={bannedUser}
                  onUnban={handleUnban}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Ban Confirmation Modal */}
      {showBanModal && banMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ban-modal-title">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowBanModal(false)} aria-hidden="true" />
          
          {/* Modal */}
          <div className="relative w-full max-w-md glass-panel rounded-2xl p-6">
            <h3 id="ban-modal-title" className="text-lg font-semibold text-white mb-2">
              Ban {banMember.displayName || banMember.username}?
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              They will be removed from the server and unable to rejoin.
            </p>
            
            <div className="mb-6">
              <label htmlFor="ban-reason" className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                Reason (optional)
              </label>
              <textarea
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Why are you banning this user?"
                rows={3}
                className="w-full obsidian-control rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:ring-1 focus:ring-violet-accent/50 focus:outline-none transition-all resize-none"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBanModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBanConfirm}
                disabled={banning}
                className="px-6 py-2 rounded-xl bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {banning ? 'Banning...' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Member Row ==============

interface MemberRowProps {
  member: ServerMember;
  getRoleById: (roleId: string) => Role | undefined;
  onKick: (member: ServerMember) => void;
  onBan: (member: ServerMember) => void;
}

function MemberRow({ member, getRoleById, onKick, onBan }: MemberRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get member's role objects
  const memberRoles = useMemo(() => {
    return member.roles
      .map((roleId) => getRoleById(roleId))
      .filter((r): r is Role => r !== undefined);
  }, [member.roles, getRoleById]);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        isHovered ? 'bg-white/[0.06]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-violet-accent/30 flex items-center justify-center text-white font-medium">
            {(member.displayName || member.username)[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Name & Roles */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">
            {member.displayName || member.username}
          </span>
          {member.displayName && (
            <span className="text-slate-500 text-sm truncate">@{member.username}</span>
          )}
        </div>
        {memberRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {memberRoles.map((role) => (
              <span
                key={role.id}
                className="glass-chip"
                style={{ 
                  color: role.color,
                  borderColor: `${role.color}40`,
                  background: `${role.color}15`
                }}
              >
                {role.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onKick(member)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Kick"
            aria-label={`Kick ${member.displayName || member.username}`}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
          <button
            onClick={() => onBan(member)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            title="Ban"
            aria-label={`Ban ${member.displayName || member.username}`}
          >
            <span className="material-symbols-outlined text-lg">block</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============== Banned User Row ==============

interface BannedUserRowProps {
  bannedUser: BannedUser;
  onUnban: (bannedUser: BannedUser) => void;
}

function BannedUserRow({ bannedUser, onUnban }: BannedUserRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        isHovered ? 'bg-white/[0.06]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {bannedUser.avatarUrl ? (
          <img
            src={bannedUser.avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover opacity-60"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 font-medium">
            {bannedUser.username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Name & Reason */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-medium truncate">
            {bannedUser.username}
          </span>
        </div>
        {bannedUser.reason && (
          <p className="text-xs text-slate-500 truncate mt-0.5">
            Reason: {bannedUser.reason}
          </p>
        )}
      </div>

      {/* Unban Button */}
      {isHovered && (
        <button
          onClick={() => onUnban(bannedUser)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-lime-accent hover:bg-lime-accent/10 transition-colors shrink-0"
          title="Unban"
          aria-label={`Unban ${bannedUser.username}`}
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">undo</span>
          Unban
        </button>
      )}
    </div>
  );
}
