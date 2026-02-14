import { useLayoutStore, type MobileView } from '../../stores/layoutStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useDMStore } from '../../stores/dmStore';

interface NavItem {
  id: MobileView;
  icon: string;
  label: string;
  badge?: number;
}

export function BottomNav() {
  const { mobileView, setMobileView } = useLayoutStore();
  const { channelId: voiceChannelId } = useVoiceStore();
  const { dms } = useDMStore();

  const totalUnread = dms.reduce((sum, dm) => sum + (dm.unread_count ?? 0), 0);
  const inVoice = !!voiceChannelId;

  const navItems: NavItem[] = [
    { id: 'channels', icon: 'tag', label: 'Channels' },
    { id: 'chat', icon: 'chat', label: 'Chat' },
    { id: 'dms', icon: 'forum', label: 'DMs', badge: totalUnread },
    { id: 'voice', icon: inVoice ? 'volume_up' : 'mic', label: 'Voice' },
    { id: 'members', icon: 'group', label: 'Members' },
  ];

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-30 glass-slab border-t border-white/[0.06]">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = mobileView === item.id;
          const isVoiceActive = item.id === 'voice' && inVoice;

          return (
            <button
              key={item.id}
              onClick={() => setMobileView(item.id)}
              className={[
                'touch-target flex-1 flex flex-col items-center justify-center gap-1 relative',
                'transition-all duration-150 active:scale-95',
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70',
              ].join(' ')}
            >
              {/* Active indicator — lime bar at top */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-lime-accent rounded-full shadow-lime-sm" />
              )}

              {/* Voice active dot */}
              {isVoiceActive && (
                <div className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-lime-accent shadow-lime-sm animate-pulse" />
              )}

              <div className="relative">
                <span
                  className={`material-symbols-outlined text-xl ${
                    isActive
                      ? isVoiceActive
                        ? 'text-lime-accent'
                        : 'text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>

                {/* Unread badge */}
                {(item.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full bg-primary flex items-center justify-center text-[8px] font-black text-white px-0.5">
                    {(item.badge ?? 0) > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[9px] uppercase tracking-widest font-bold ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
