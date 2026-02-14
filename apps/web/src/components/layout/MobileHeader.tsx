import { useLayoutStore } from '../../stores/layoutStore';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showMembers?: boolean;
}

export function MobileHeader({
  title,
  subtitle,
  showBack,
  onBack,
  showMembers,
}: MobileHeaderProps) {
  const { togglePanel } = useLayoutStore();

  return (
    <header className="flex items-center gap-3 px-4 py-3 glass-slab border-b border-white/[0.06] shrink-0">
      {showBack ? (
        <button
          onClick={onBack}
          className="touch-target w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      ) : (
        <button
          onClick={() => togglePanel('channels')}
          className="touch-target w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
          aria-label="Open channel list"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-white truncate">{title}</h1>
        {subtitle && (
          <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">
            {subtitle}
          </p>
        )}
      </div>

      {showMembers && (
        <button
          onClick={() => togglePanel('members')}
          className="touch-target w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
          aria-label="Toggle member list"
        >
          <span className="material-symbols-outlined">group</span>
        </button>
      )}
    </header>
  );
}
