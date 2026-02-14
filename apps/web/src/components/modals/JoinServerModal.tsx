import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useServerStore } from '../../stores/serverStore';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerPreview {
  code: string;
  server: {
    id: string;
    name: string;
    iconUrl: string | null;
    description: string | null;
    memberCount: number;
  };
}

const API = import.meta.env.VITE_API_URL;

function extractCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/invite\/([a-z0-9]+)/i);
  return match ? match[1] : trimmed;
}

export function JoinServerModal({ isOpen, onClose }: Props) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ServerPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const { accessToken } = useAuthStore();
  const { fetchServers, setActiveServer } = useServerStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId('join-server');
  const descriptionId = useId('join-server-desc');
  const errorId = useId('join-server-error');

  // Initialize focus trap
  useFocusTrap(isOpen, modalRef as React.RefObject<HTMLElement>);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePreview = async () => {
    const code = extractCode(input);
    if (!code) { setError('Please enter an invite link or code'); return; }
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const res = await fetch(`${API}/api/invites/${code}`);
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Invalid invite');
      }
      const data = await res.json() as ServerPreview;
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = extractCode(input);
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/invites/${code}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to join');
      }
      const data = await res.json() as { serverId: string };
      await fetchServers();
      setActiveServer(data.serverId);
      onClose();
      setInput('');
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setJoining(false);
    }
  };

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
          <h2 id={titleId} className="text-xl font-bold text-white">Join a Server</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 -mr-2 -mt-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p id={descriptionId} className="text-sm text-gray-400 mb-6">Enter an invite link or code to join a server.</p>

        {error && (
          <div 
            id={errorId}
            role="alert"
            aria-live="polite"
            className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4"
          >
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <label htmlFor={titleId + '-input'} className="sr-only">Invite code or link</label>
          <input
            id={titleId + '-input'}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setPreview(null); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
            placeholder="https://…/invite/abc123 or abc123"
            autoFocus
            className="flex-1 bg-gray-900 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
          />
          <button
            onClick={handlePreview}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '…' : 'Preview'}
          </button>
        </div>

        {preview && (
          <div className="bg-gray-900 rounded-lg p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden" aria-hidden="true">
              {preview.server.iconUrl ? (
                <img src={preview.server.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                preview.server.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{preview.server.name}</p>
              {preview.server.description && (
                <p className="text-gray-400 text-xs truncate">{preview.server.description}</p>
              )}
              <p className="text-gray-500 text-xs mt-0.5">
                {preview.server.memberCount} {preview.server.memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
            Cancel
          </button>
          {preview && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-lg transition"
            >
              {joining ? 'Joining…' : 'Join Server'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
