import { useEffect, useRef } from 'react';

export interface DMContact {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline';
  };
  unreadCount?: number;
  signalStrength: 0 | 1 | 2 | 3 | 4;
}

function SignalMeter({ strength }: { strength: number }) {
  return (
    <div className="signal-meter">
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={`signal-bar ${bar <= strength ? 'active' : ''}`}
          style={{ height: `${bar * 3}px` }}
        />
      ))}
    </div>
  );
}

function statusLabel(status: string, strength: number): string {
  if (status === 'offline' || strength === 0) return 'Offline';
  if (strength === 4) return 'Neural Connection: Stable';
  if (strength === 3) return 'Signal Strong';
  if (strength === 2) return 'Data Burst Pending...';
  return 'Signal Weak';
}

export function DMContactCard({
  contact,
  isActive,
  onSelect,
}: {
  contact: DMContact;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`contact-card ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(contact.id)}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {contact.user.avatarUrl ? (
            <img
              src={contact.user.avatarUrl}
              alt={contact.user.displayName}
              className={`w-12 h-12 rounded-full border ${
                isActive ? 'border-violet-accent/50' : 'border-white/10'
              } ${contact.user.status === 'offline' ? 'opacity-70' : ''}`}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                isActive
                  ? 'border-violet-accent/50 bg-violet-accent/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${
                  isActive ? 'text-violet-accent' : 'text-slate-400'
                }`}
              >
                account_circle
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`font-bold text-sm truncate ${
                isActive ? 'text-white' : 'text-slate-300'
              }`}
            >
              {contact.user.displayName}
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {(contact.unreadCount ?? 0) > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-black text-white">
                  {(contact.unreadCount ?? 0) > 9 ? '9+' : contact.unreadCount}
                </span>
              )}
              <SignalMeter strength={contact.signalStrength} />
            </div>
          </div>
          <p
            className={`text-[11px] font-medium uppercase tracking-wider truncate ${
              isActive ? 'text-violet-accent/80' : 'text-slate-500'
            }`}
          >
            {statusLabel(contact.user.status, contact.signalStrength)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DMList({
  contacts,
  activeId,
  onSelect,
  onNewDM,
}: {
  contacts: DMContact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewDM?: () => void;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

  return (
    <aside className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-8 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-violet-accent">blur_on</span>
          <h2 className="text-xl font-bold tracking-tight text-white">COMM_LINK</h2>
        </div>
        {onNewDM && (
          <button
            onClick={onNewDM}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="New message"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        )}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-1 pb-8">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
            <span className="material-symbols-outlined text-3xl text-slate-600">forum</span>
            <p className="text-xs text-slate-500 uppercase tracking-widest">No active channels</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                ref={contact.id === activeId ? activeRef : undefined}
              >
                <DMContactCard
                  contact={contact}
                  isActive={contact.id === activeId}
                  onSelect={onSelect}
                />
              </div>
            ))}
            <div className="h-8" />
          </div>
        )}
      </div>
    </aside>
  );
}
