import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
}

const API = import.meta.env.VITE_API_URL;

export function InviteModal({ isOpen, onClose, serverId, serverName }: Props) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>('24');
  const [maxUses, setMaxUses] = useState<string>('unlimited');
  const { accessToken } = useAuthStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId('invite');
  const descriptionId = useId('invite-desc');
  const copiedId = useId('invite-copied');

  // Initialize focus trap
  useFocusTrap(isOpen, modalRef as React.RefObject<HTMLElement>);

  const generateInvite = useCallback(async () => {
    setLoading(true);
    setInviteUrl('');
    try {
      const res = await fetch(`${API}/api/servers/${serverId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          expiresInHours: expiresIn === 'never' ? undefined : Number(expiresIn),
          maxUses: maxUses === 'unlimited' ? undefined : Number(maxUses),
        }),
      });
      if (!res.ok) throw new Error('Failed to create invite');
      const data = await res.json() as { url: string };
      setInviteUrl(data.url);
    } catch {
      setInviteUrl('');
    } finally {
      setLoading(false);
    }
  }, [serverId, accessToken, expiresIn, maxUses]);

  useEffect(() => {
    if (isOpen) generateInvite();
    else { setInviteUrl(''); setCopied(false); }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const el = document.createElement('input');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-1">
          <h2 id={titleId} className="text-xl font-bold text-white">Invite friends to {serverName}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 -mr-2 -mt-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p id={descriptionId} className="text-sm text-gray-400 mb-6">Share this link with your friends to let them join.</p>

        <div className="flex items-center gap-2 mb-4">
          <label htmlFor={titleId + '-url'} className="sr-only">Invite URL</label>
          <input
            id={titleId + '-url'}
            type="text"
            value={loading ? 'Generating...' : inviteUrl}
            readOnly
            aria-describedby={copied ? copiedId : undefined}
            className="flex-1 bg-gray-900 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 select-all"
          />
          {copied && (
            <span id={copiedId} role="status" aria-live="polite" className="sr-only">
              Link copied to clipboard
            </span>
          )}
          <button
            onClick={handleCopy}
            disabled={loading || !inviteUrl}
            aria-label={copied ? 'Link copied' : 'Copy link'}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition ${
              copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor={titleId + '-expires'} className="block text-xs text-gray-400 mb-1">Expires after</label>
            <select
              id={titleId + '-expires'}
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-sm border border-gray-700"
            >
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
              <option value="never">Never</option>
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor={titleId + '-uses'} className="block text-xs text-gray-400 mb-1">Max uses</label>
            <select
              id={titleId + '-uses'}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-sm border border-gray-700"
            >
              <option value="1">1 use</option>
              <option value="5">5 uses</option>
              <option value="10">10 uses</option>
              <option value="25">25 uses</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>

        <button 
          onClick={generateInvite} 
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          Generate a new link
        </button>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
