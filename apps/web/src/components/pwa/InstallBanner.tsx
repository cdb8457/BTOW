import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="relative glass-slab light-leak rounded-2xl px-5 py-4 flex items-center gap-4 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-violet-accent/10 border border-violet-accent/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-violet-accent text-2xl">hub</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Install BTOW</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Add to home screen for the full experience
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-lg bg-lime-accent text-black text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(217,249,157,0.4)]"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-1.5 rounded-lg text-slate-500 text-xs hover:text-white transition-colors text-center"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
