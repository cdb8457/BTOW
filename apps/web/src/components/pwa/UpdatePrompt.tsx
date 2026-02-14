import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Poll for updates every hour
      if (r) setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative glass-slab light-leak rounded-2xl px-5 py-4 flex items-center gap-4 max-w-xs shadow-[0_0_30px_rgba(139,92,246,0.2)]">
        <span className="material-symbols-outlined text-violet-accent text-2xl shrink-0">
          system_update
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Update available</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Reload to get the latest version</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-lg bg-violet-accent text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform shrink-0"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
