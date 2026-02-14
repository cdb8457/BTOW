import { useState } from 'react';
import { usePush } from '../../hooks/usePush';

export function PushPermissionPrompt() {
  const { permission, subscribed, loading, subscribe } = usePush();
  const [dismissed, setDismissed] = useState(false);

  // Only show if permission hasn't been decided yet
  if (permission !== 'default' || subscribed || dismissed) return null;

  return (
    <div className="glass-slab light-leak rounded-2xl px-5 py-4 flex items-start gap-4 border border-violet-accent/20">
      <span className="material-symbols-outlined text-violet-accent text-2xl shrink-0 mt-0.5">
        notifications
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white mb-1">Enable notifications</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Get notified when your crew sends messages, even when the app is closed.
        </p>

        <div className="flex gap-3 mt-3">
          <button
            onClick={subscribe}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-violet-accent text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2 rounded-lg text-slate-500 text-xs hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
