import { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full glass-slab transition-all ${
        isOnline
          ? 'border border-lime-accent/40 shadow-[0_0_15px_rgba(217,249,157,0.2)]'
          : 'border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isOnline ? 'bg-lime-accent shadow-[0_0_6px_#d9f99d]' : 'bg-red-500'
        }`}
      />
      <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">
        {isOnline
          ? 'Back online'
          : 'No connection — messages will sync when online'}
      </span>
    </div>
  );
}
