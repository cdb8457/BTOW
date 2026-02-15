import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useServerStore } from '../stores/serverStore';
import { getApiUrl } from '../lib/config';

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

const API = getApiUrl();

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { fetchServers, setActiveServer } = useServerStore();

  const [preview, setPreview] = useState<ServerPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetch(`${API}/api/invites/${code}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          throw new Error(data.error ?? 'Invalid invite');
        }
        return res.json() as Promise<ServerPreview>;
      })
      .then(setPreview)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login, then come back
      navigate(`/login?redirect=/invite/${code}`);
      return;
    }
    if (!code) return;
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
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-bg flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm p-8 shadow-2xl text-center">
        {loading ? (
          <p className="text-discord-textMuted">Loading invite…</p>
        ) : error ? (
          <>
            <p className="text-4xl mb-4">🔗</p>
            <h1 className="text-xl font-bold text-white mb-2">Invalid Invite</h1>
            <p className="text-discord-textMuted text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-discord-accent hover:bg-discord-accentHover text-white rounded-lg text-sm font-medium transition"
            >
              Go Home
            </button>
          </>
        ) : preview ? (
          <>
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 overflow-hidden">
              {preview.server.iconUrl ? (
                <img src={preview.server.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                preview.server.name.charAt(0).toUpperCase()
              )}
            </div>
            <p className="text-discord-textMuted text-xs uppercase tracking-wide mb-1">You've been invited to join</p>
            <h1 className="text-2xl font-bold text-white mb-1">{preview.server.name}</h1>
            {preview.server.description && (
              <p className="text-discord-textMuted text-sm mb-2">{preview.server.description}</p>
            )}
            <p className="text-discord-textMuted text-xs mb-6">
              {preview.server.memberCount} {preview.server.memberCount === 1 ? 'member' : 'members'}
            </p>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={handleAccept}
              disabled={joining}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white rounded-lg font-semibold transition"
            >
              {joining ? 'Joining…' : isAuthenticated ? 'Accept Invite' : 'Log in to Join'}
            </button>
            {!isAuthenticated && (
              <p className="text-discord-textMuted text-xs mt-3">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate(`/register?redirect=/invite/${code}`)}
                  className="text-discord-accent hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
