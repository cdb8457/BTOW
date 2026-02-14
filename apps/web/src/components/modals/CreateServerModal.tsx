import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useServerStore } from '../../stores/serverStore';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const API = import.meta.env.VITE_API_URL;

export function CreateServerModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { accessToken } = useAuthStore();
  const { fetchServers, setActiveServer } = useServerStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId('create-server');
  const descriptionId = useId('create-server-desc');
  const errorId = useId('create-server-error');

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

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to create server');
      }
      const server = await res.json() as { id: string };
      await fetchServers();
      setActiveServer(server.id);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); }
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 id={titleId} className="text-xl font-bold text-white">Create a Server</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 -mr-2 -mt-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p id={descriptionId} className="text-sm text-gray-400 mb-6">Your server is where you and your friends hang out.</p>

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

        <div className="space-y-4">
          <div>
            <label htmlFor={titleId + '-name'} className="block text-xs font-semibold text-gray-300 uppercase mb-2">Server Name</label>
            <input
              id={titleId + '-name'}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Server"
              maxLength={100}
              autoFocus
              className="w-full bg-gray-900 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
            />
          </div>
          <div>
            <label htmlFor={titleId + '-description'} className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Description <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              id={titleId + '-description'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this server about?"
              maxLength={1000}
              rows={2}
              className="w-full bg-gray-900 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg transition"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
