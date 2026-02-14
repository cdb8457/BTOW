import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useServerStore } from '../stores/serverStore';
import { useChannelStore, type ChannelData } from '../stores/channelStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useDMStore } from '../stores/dmStore';
import { useLayoutStore } from '../stores/layoutStore';
import { useServerEvents } from '../hooks/useServerEvents';
import { useDMSocketEvents } from '../hooks/useDMSocketEvents';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useSwipe } from '../hooks/useSwipe';
import ChatView from '../components/ChatView';
import { VoiceControlBar } from '../components/voice/VoiceControlBar';
import { VoiceHUD } from '../components/voice/VoiceHUD';
import { VoiceChannelEntry } from '../components/sidebar/VoiceChannelEntry';
import { CreateServerModal } from '../components/modals/CreateServerModal';
import { JoinServerModal } from '../components/modals/JoinServerModal';
import { InviteModal } from '../components/modals/InviteModal';
import { CreateChannelModal } from '../components/modals/CreateChannelModal';
import { DMList, type DMContact } from '../components/dm/DMList';
import { DMConversation } from '../components/dm/DMConversation';
import { BottomNav } from '../components/layout/BottomNav';
import { Drawer } from '../components/layout/Drawer';
import { MobileHeader } from '../components/layout/MobileHeader';
import { usePresenceStore as usePresence } from '../stores/presenceStore';
import { SettingsModal } from '../components/settings/SettingsModal';
import { ServerSettingsModal } from '../components/serverSettings/ServerSettingsModal';
import { create as zustandCreate } from 'zustand';

// Tiny store so SettingsButton can open the modal without prop drilling
const useSettingsOpenStore = zustandCreate<{ isOpen: boolean; open: () => void; close: () => void }>(
  (set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  })
);

const STATUS_DOT: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

function presenceToSignal(status: string): 0 | 1 | 2 | 3 | 4 {
  switch (status) {
    case 'online': return 4;
    case 'idle': return 2;
    case 'dnd': return 1;
    default: return 0;
  }
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

interface ServerStripProps {
  servers: { id: string; name: string; iconUrl?: string | null }[];
  activeServerId: string | null;
  showDMs: boolean;
  onSelectServer: (id: string) => void;
  onToggleDMs: () => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
}

function ServerStrip({
  servers,
  activeServerId,
  showDMs,
  onSelectServer,
  onToggleDMs,
  onCreateServer,
  onJoinServer,
}: ServerStripProps) {
  return (
    <div
      className="w-[72px] flex flex-col items-center py-3 gap-2 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button
        onClick={onToggleDMs}
        title="Direct Messages"
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
        style={
          showDMs
            ? { background: 'rgba(139,92,246,0.35)', border: '1px solid rgba(139,92,246,0.5)', borderRadius: 14 }
            : { background: 'rgba(255,255,255,0.05)' }
        }
      >
        <span className="material-symbols-outlined text-white text-xl">forum</span>
      </button>

      <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />

      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          title={server.name}
          className="w-12 h-12 rounded-2xl hover:rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all overflow-hidden"
          style={
            server.id === activeServerId && !showDMs
              ? { background: 'rgba(139,92,246,0.35)', border: '1px solid rgba(139,92,246,0.5)', borderRadius: 14 }
              : { background: 'rgba(255,255,255,0.05)' }
          }
        >
          {server.iconUrl ? (
            <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
          ) : (
            server.name[0].toUpperCase()
          )}
        </button>
      ))}

      <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />

      <button
        onClick={onCreateServer}
        title="Create a Server"
        className="w-12 h-12 rounded-2xl hover:rounded-xl flex items-center justify-center text-discord-textMuted hover:text-white transition-all text-xl"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        +
      </button>
      <button
        onClick={onJoinServer}
        title="Join a Server"
        className="w-12 h-12 rounded-2xl hover:rounded-xl flex items-center justify-center text-discord-textMuted hover:text-white transition-all text-sm"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        ↓
      </button>
    </div>
  );
}

interface ChannelSidebarProps {
  activeServer: { id: string; name: string } | undefined;
  activeServerId: string | null;
  activeChannelId: string | null;
  activeChannelIdForVoice: string | null;
  showDMs: boolean;
  categories: { id: string; name: string }[];
  textByCategory: Record<string, ChannelData[]>;
  voiceByCategory: Record<string, ChannelData[]>;
  contacts: DMContact[];
  activeDmId: string | null;
  user: { id: string; displayName?: string; username?: string } | null;
  voiceChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onSelectDm: (id: string) => void;
  onOpenCreateChannel: (catId?: string, catName?: string) => void;
  onOpenHUD: () => void;
  onOpenInvite: () => void;
  onOpenServerSettings: () => void;
  onChannelSelect?: () => void; // mobile: close drawer / navigate
}

function ChannelSidebar({
  activeServer,
  activeServerId,
  activeChannelId,
  showDMs,
  categories,
  textByCategory,
  voiceByCategory,
  contacts,
  activeDmId,
  user,
  voiceChannelId,
  onSelectChannel,
  onSelectDm,
  onOpenCreateChannel,
  onOpenHUD,
  onOpenInvite,
  onOpenServerSettings,
  onChannelSelect,
}: ChannelSidebarProps) {
  const { getStatus } = usePresenceStore();

  return (
    <>
      {showDMs ? (
        <div className="flex-1 overflow-hidden pt-4">
          <DMList contacts={contacts} activeId={activeDmId} onSelect={onSelectDm} />
        </div>
      ) : (
        <>
          <div
            className="h-12 px-4 flex items-center gap-2 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="font-semibold text-discord-textBright flex-1 truncate">
              {activeServer?.name ?? 'Loading…'}
            </span>
            {activeServerId && (
              <>
                <button
                  onClick={onOpenServerSettings}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  aria-label="Server Settings"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                </button>
                <button
                  onClick={onOpenInvite}
                  className="text-discord-textMuted hover:text-discord-textBright transition-colors text-sm px-1"
                  title="Invite People"
                >
                  🔗
                </button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {(textByCategory['__none__'] ?? []).map((ch) => (
              <ChannelButton
                key={ch.id}
                ch={ch}
                active={ch.id === activeChannelId}
                onClick={() => { onSelectChannel(ch.id); onChannelSelect?.(); }}
              />
            ))}
            {(voiceByCategory['__none__'] ?? []).map((ch) => (
              <VoiceChannelEntry
                key={ch.id}
                channelId={ch.id}
                channelName={ch.name}
                serverId={activeServerId ?? ''}
                onOpenHUD={onOpenHUD}
              />
            ))}
            {categories.map((cat) => (
              <div key={cat.id} className="group">
                <div className="flex items-center px-2 pt-3 pb-1">
                  <p className="flex-1 text-xs font-semibold text-discord-textMuted uppercase tracking-wide">
                    {cat.name}
                  </p>
                  <button
                    onClick={() => onOpenCreateChannel(cat.id, cat.name)}
                    className="opacity-0 group-hover:opacity-100 text-discord-textMuted hover:text-discord-textBright transition-opacity text-lg leading-none"
                    title={`Create channel in ${cat.name}`}
                  >
                    +
                  </button>
                </div>
                {(textByCategory[cat.id] ?? []).map((ch) => (
                  <ChannelButton
                    key={ch.id}
                    ch={ch}
                    active={ch.id === activeChannelId}
                    onClick={() => { onSelectChannel(ch.id); onChannelSelect?.(); }}
                  />
                ))}
                {(voiceByCategory[cat.id] ?? []).map((ch) => (
                  <VoiceChannelEntry
                    key={ch.id}
                    channelId={ch.id}
                    channelName={ch.name}
                    serverId={activeServerId ?? ''}
                    onOpenHUD={onOpenHUD}
                  />
                ))}
              </div>
            ))}
            {activeServerId && (
              <button
                onClick={() => onOpenCreateChannel(undefined, undefined)}
                className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-discord-textMuted hover:text-discord-text hover:bg-white/5 transition-colors mt-1"
              >
                <span>+</span> Add Channel
              </button>
            )}
          </div>

          {voiceChannelId && <VoiceControlBar onOpenHUD={onOpenHUD} />}
        </>
      )}

      {/* User panel */}
      <div
        className="h-14 flex items-center px-2 gap-2 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: 'rgba(139,92,246,0.35)' }}
          >
            {user?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
              STATUS_DOT[getStatus(user?.id ?? '')] ?? STATUS_DOT['offline']
            }`}
            style={{ borderColor: 'rgba(8,8,10,1)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-discord-textBright truncate">
            {user?.displayName ?? user?.username}
          </div>
          <div className="text-xs text-discord-textMuted truncate">#{user?.username}</div>
        </div>
        <SettingsButton />
        <LogoutButton />
      </div>
    </>
  );
}

function SettingsButton() {
  return (
    <button
      onClick={() => useSettingsOpenStore.getState().open()}
      className="p-1 text-discord-textMuted hover:text-lime-accent rounded transition-colors"
      title="Settings"
    >
      <span className="material-symbols-outlined text-base leading-none">settings</span>
    </button>
  );
}

function LogoutButton() {
  const { logout } = useAuthStore();
  return (
    <button
      onClick={logout}
      className="p-1 text-discord-textMuted hover:text-discord-text rounded transition-colors"
      title="Logout"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore();
  usePresenceStore(); // keep subscription active

  const { servers, activeServerId, fetchServers, setActiveServer } = useServerStore();
  const { channels, categories, activeChannelId, loadedServerId, fetchChannels, setActiveChannel } =
    useChannelStore();
  const { channelId: voiceChannelId } = useVoiceStore();
  const { dms, activeDmId, setActiveDm, loadDMs } = useDMStore();
  const { getStatus: getPresenceStatus } = usePresence();

  const { activePanel, closePanel, mobileView, setMobileView } = useLayoutStore();
  const { isMobile, isTablet } = useBreakpoint();

  const [showDMs, setShowDMs] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string | undefined>();
  const [createChannelCategoryName, setCreateChannelCategoryName] = useState<string | undefined>();
  const [showVoiceHUD, setShowVoiceHUD] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);

  useEffect(() => { fetchServers(); }, [fetchServers]);
  useEffect(() => { loadDMs(); }, [loadDMs]);

  useEffect(() => {
    if (activeServerId && activeServerId !== loadedServerId) {
      fetchChannels(activeServerId);
    }
  }, [activeServerId, loadedServerId, fetchChannels]);

  useServerEvents();
  useDMSocketEvents();

  const activeServer = servers.find((s) => s.id === activeServerId);
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeDm = dms.find((d) => d.id === activeDmId);
  const activeDmRecipient =
    activeDm?.participants.find((p) => p.id !== user?.id) ?? activeDm?.participants[0];

  const contacts: DMContact[] = dms.map((dm) => {
    const other = dm.participants.find((p) => p.id !== user?.id) ?? dm.participants[0];
    const status = other ? getPresenceStatus(other.id) : 'offline';
    return {
      id: dm.id,
      user: {
        id: other?.id ?? '',
        displayName: other?.displayName ?? 'Unknown',
        avatarUrl: other?.avatarUrl ?? null,
        status: (status || 'offline') as 'online' | 'idle' | 'dnd' | 'offline',
      },
      unreadCount: dm.unread_count,
      signalStrength: presenceToSignal(status || 'offline'),
    };
  });

  const textByCategory: Record<string, ChannelData[]> = { __none__: [] };
  const voiceByCategory: Record<string, ChannelData[]> = { __none__: [] };
  for (const cat of categories) {
    textByCategory[cat.id] = [];
    voiceByCategory[cat.id] = [];
  }
  for (const ch of channels) {
    const key = ch.categoryId ?? '__none__';
    if (ch.type === 'text') {
      if (!textByCategory[key]) textByCategory[key] = [];
      textByCategory[key].push(ch);
    } else {
      if (!voiceByCategory[key]) voiceByCategory[key] = [];
      voiceByCategory[key].push(ch);
    }
  }

  const openCreateChannel = (catId?: string, catName?: string) => {
    setCreateChannelCategoryId(catId);
    setCreateChannelCategoryName(catName);
    setShowCreateChannel(true);
  };

  // Shared sidebar props
  const sidebarProps: ChannelSidebarProps = {
    activeServer,
    activeServerId,
    activeChannelId,
    activeChannelIdForVoice: voiceChannelId,
    showDMs,
    categories,
    textByCategory,
    voiceByCategory,
    contacts,
    activeDmId,
    user,
    voiceChannelId,
    onSelectChannel: setActiveChannel,
    onSelectDm: setActiveDm,
    onOpenCreateChannel: openCreateChannel,
    onOpenHUD: () => setShowVoiceHUD(true),
    onOpenInvite: () => setShowInvite(true),
    onOpenServerSettings: () => setShowServerSettings(true),
  };

  // Shared server strip props
  const stripProps: ServerStripProps = {
    servers,
    activeServerId,
    showDMs,
    onSelectServer: (id) => { setActiveServer(id); setShowDMs(false); },
    onToggleDMs: () => setShowDMs((v) => !v),
    onCreateServer: () => setShowCreateServer(true),
    onJoinServer: () => setShowJoinServer(true),
  };

  // ─── Main chat / DM content area ──────────────────────────────────────────
  const MainContent = () => (
    <>
      {showDMs ? (
        activeDmId && activeDmRecipient ? (
          <DMConversation
            dmId={activeDmId}
            recipient={{
              id: activeDmRecipient.id,
              displayName: activeDmRecipient.displayName,
              avatarUrl: activeDmRecipient.avatarUrl,
              status: getPresenceStatus(activeDmRecipient.id) || 'offline',
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-slate-700">forum</span>
              <p className="mt-4 text-slate-500 uppercase tracking-widest text-xs">
                Select a conversation
              </p>
            </div>
          </div>
        )
      ) : activeChannelId && activeChannel ? (
        <ChatView
          channelId={activeChannelId}
          channelName={activeChannel.name}
          channelTopic={activeChannel.topic}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-discord-textMuted">
          {channels.length === 0 ? 'Loading channels…' : 'Select a channel'}
        </div>
      )}
    </>
  );

  // Swipe handlers for mobile chat view
  const swipeHandlers = useSwipe({
    onSwipeRight: () => { if (mobileView === 'chat') setMobileView('channels'); },
    onSwipeLeft: () => { if (mobileView === 'chat') setMobileView('members'); },
  });

  // ─── Modals (shared across all layouts) ───────────────────────────────────
  const settingsOpen = useSettingsOpenStore((s) => s.isOpen);
  const closeSettings = useSettingsOpenStore((s) => s.close);

  const Modals = () => (
    <>
      <CreateServerModal isOpen={showCreateServer} onClose={() => setShowCreateServer(false)} />
      <JoinServerModal isOpen={showJoinServer} onClose={() => setShowJoinServer(false)} />
      {activeServerId && (
        <>
          <InviteModal
            isOpen={showInvite}
            onClose={() => setShowInvite(false)}
            serverId={activeServerId}
            serverName={activeServer?.name ?? ''}
          />
          <CreateChannelModal
            isOpen={showCreateChannel}
            onClose={() => {
              setShowCreateChannel(false);
              setCreateChannelCategoryId(undefined);
              setCreateChannelCategoryName(undefined);
            }}
            serverId={activeServerId}
            categoryId={createChannelCategoryId}
            categoryName={createChannelCategoryName}
          />
        </>
      )}
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
      <ServerSettingsModal isOpen={showServerSettings} onClose={() => setShowServerSettings(false)} />
    </>
  );

  // ─── DESKTOP LAYOUT (≥ 1024px) ────────────────────────────────────────────
  if (!isMobile && !isTablet) {
    return (
      <div className="flex h-screen smoke-bg overflow-hidden">
        <ServerStrip {...stripProps} />

        <div
          className="w-60 flex flex-col flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <ChannelSidebar {...sidebarProps} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <MainContent />
        </div>

        <VoiceHUD isOpen={showVoiceHUD} onClose={() => setShowVoiceHUD(false)} />
        <Modals />
      </div>
    );
  }

  // ─── TABLET LAYOUT (768–1023px) ────────────────────────────────────────────
  if (isTablet) {
    return (
      <div className="flex h-screen smoke-bg overflow-hidden">
        <ServerStrip {...stripProps} />

        <div
          className="w-56 flex flex-col flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <ChannelSidebar {...sidebarProps} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <MainContent />
        </div>

        {/* Member list slides in from the right on tablet */}
        <Drawer open={activePanel === 'members'} onClose={closePanel} side="right" width="240px">
          <div className="p-4 pt-12">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Members</p>
            <p className="text-slate-600 text-sm">Member list coming soon</p>
          </div>
        </Drawer>

        <VoiceHUD isOpen={showVoiceHUD} onClose={() => setShowVoiceHUD(false)} />
        <Modals />
      </div>
    );
  }

  // ─── MOBILE LAYOUT (< 768px) ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen smoke-bg overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative" {...swipeHandlers}>

        {/* CHANNELS VIEW */}
        {mobileView === 'channels' && (
          <div className="h-full flex flex-col">
            <MobileHeader title={activeServer?.name ?? 'Channels'} />
            <div
              className="flex-1 overflow-y-auto touch-scroll flex flex-col"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <ChannelSidebar
                {...sidebarProps}
                onChannelSelect={() => setMobileView('chat')}
              />
            </div>
          </div>
        )}

        {/* CHAT VIEW */}
        {mobileView === 'chat' && (
          <div className="h-full flex flex-col">
            <MobileHeader
              title={
                showDMs
                  ? (activeDmRecipient?.displayName ?? 'Messages')
                  : `#${activeChannel?.name ?? '…'}`
              }
              subtitle={showDMs ? undefined : activeServer?.name}
              showBack
              onBack={() => setMobileView('channels')}
              showMembers={!showDMs}
            />
            <div className="flex-1 overflow-hidden">
              <MainContent />
            </div>
          </div>
        )}

        {/* DMS VIEW */}
        {mobileView === 'dms' && (
          <div className="h-full flex flex-col">
            {activeDmId && activeDmRecipient ? (
              <>
                <MobileHeader
                  title={activeDmRecipient.displayName}
                  showBack
                  onBack={() => setActiveDm('')}
                />
                <div className="flex-1 overflow-hidden">
                  <DMConversation
                    dmId={activeDmId}
                    recipient={{
                      id: activeDmRecipient.id,
                      displayName: activeDmRecipient.displayName,
                      avatarUrl: activeDmRecipient.avatarUrl,
                      status: getPresenceStatus(activeDmRecipient.id) || 'offline',
                    }}
                    mobile
                  />
                </div>
              </>
            ) : (
              <>
                <MobileHeader title="Direct Messages" />
                <div className="flex-1 overflow-y-auto touch-scroll p-4">
                  <DMList
                    contacts={contacts}
                    activeId={activeDmId}
                    onSelect={(id) => setActiveDm(id)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* VOICE VIEW */}
        {mobileView === 'voice' && (
          <div className="h-full flex flex-col">
            <MobileHeader
              title="Voice"
              showBack
              onBack={() => setMobileView('chat')}
            />
            <div className="flex-1">
              <VoiceHUD isOpen={true} onClose={() => setMobileView('chat')} mobile />
            </div>
          </div>
        )}

        {/* MEMBERS VIEW */}
        {mobileView === 'members' && (
          <div className="h-full flex flex-col">
            <MobileHeader
              title="Members"
              showBack
              onBack={() => setMobileView('chat')}
            />
            <div className="flex-1 overflow-y-auto touch-scroll p-4">
              <p className="text-slate-600 text-sm">Member list coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Channel + server strip drawer — slides in from left */}
      <Drawer open={activePanel === 'channels'} onClose={closePanel} side="left">
        <div className="flex h-full">
          <ServerStrip {...stripProps} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChannelSidebar
              {...sidebarProps}
              onChannelSelect={() => { closePanel(); setMobileView('chat'); }}
            />
          </div>
        </div>
      </Drawer>

      {/* Bottom navigation */}
      <BottomNav />
      {/* Spacer so content isn't hidden behind the bottom nav */}
      <div className="h-16 shrink-0" />

      <Modals />
    </div>
  );
}

// ─── Channel button ───────────────────────────────────────────────────────────

interface ChannelButtonProps {
  ch: { id: string; name: string };
  active: boolean;
  onClick: () => void;
}

function ChannelButton({ ch, active, onClick }: ChannelButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors"
      style={
        active
          ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)', color: '#f8f8ff' }
          : { color: '#6b6b80' }
      }
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#c4c4d4'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#6b6b80'; }}
    >
      <span style={{ color: '#6b6b80' }}>#</span>
      {ch.name}
    </button>
  );
}
