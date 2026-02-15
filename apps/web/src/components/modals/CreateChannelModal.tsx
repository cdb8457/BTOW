import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useChannelStore } from '../../stores/channelStore';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';
import { getApiUrl } from '../../lib/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  categoryId?: string;
  categoryName?: string;
}

const API = getApiUrl();

function sanitize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');
}

export function CreateChannelModal({ isOpen, onClose, serverId, categoryId, categoryName }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { accessToken } = useAuthStore();
  const { fetchChannels } = useChannelStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId('create-channel');
  const descriptionId = useId('create-channel-desc');
  const errorId = useId('create-channel-error');

  // Initialize focus trap - handles focus management automatically
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

  const handleCreate = async () => {
    if (!name.trim()) { setError('Channel name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/servers/${serverId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          type,
          topic: topic.trim() || undefined,
          categoryId: categoryId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to create channel');
      }
      await fetchChannels(serverId);
      setName('');
      setTopic('');
      setType('text');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const preview = sanitize(name);

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
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 id={titleId} className="text-xl font-bold text-white">Create Channel</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 -mr-2 -mt-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p id={descriptionId} className="text-sm text-gray-400 mb-6">
          {categoryName ? `In ${categoryName}` : 'Create a new channel'}
        </p>

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

        {/* Channel type selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">Channel Type</label>
          <div className="flex gap-2">
            {(['text', 'voice'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition ${
                  type === t
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="text-lg" aria-hidden="true">{t === 'text' ? '#' : '🔊'}</span>
                <div className="text-left">
                  <p className="font-medium capitalize">{t}</p>
                  <p className="text-xs text-gray-500">
                    {t === 'text' ? 'Send messages and files' : 'Talk with friends'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Channel name */}
        <div className="mb-4">
          <label htmlFor={`${titleId}-name`} className="block text-xs font-semibold text-gray-300 uppercase mb-2">Channel Name</label>
          <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700 focus-within:border-blue-500">
            <span className="pl-3 text-gray-500" aria-hidden="true">{type === 'text' ? '#' : '🔊'}</span>
            <input
              id={`${titleId}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="new-channel"
              maxLength={100}
              autoFocus
              className="flex-1 bg-transparent text-white px-2 py-2.5 text-sm focus:outline-none placeholder-gray-500"
            />
          </div>
          {name && preview !== name.trim().toLowerCase() && (
            <p className="text-xs text-gray-500 mt-1">
              Will be created as: <span className="text-gray-300">#{preview}</span>
            </p>
          )}
        </div>

        {/* Topic (text channels only) */}
        {type === 'text' && (
          <div className="mb-4">
            <label htmlFor={`${titleId}-topic`} className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Topic <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id={`${titleId}-topic`}
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full bg-gray-900 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg transition"
          >
            {loading ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}
