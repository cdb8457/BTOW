import { useVoice } from '../../hooks/useVoice';
import { useAuthStore } from '../../stores/authStore';
import { useChannelStore } from '../../stores/channelStore';

interface Props {
  onOpenHUD?: () => void;
}

export function VoiceControlBar({ onOpenHUD }: Props) {
  const { channelId, isMuted, isDeafened, toggleMute, toggleDeafen, leaveChannel } = useVoice();
  const { user } = useAuthStore();
  const { channels } = useChannelStore();

  if (!channelId) return null;

  const channel = channels.find((c) => c.id === channelId);

  return (
    <div
      className="glass-slab light-leak relative rounded-2xl mx-2 mb-2 px-4 py-3 flex items-center gap-3"
      style={{ minHeight: 64 }}
    >
      {/* Left: status */}
      <div
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
        onClick={onOpenHUD}
        title="Open Voice HUD"
      >
        {/* Speaking indicator dot */}
        <div className="w-2 h-2 rounded-full bg-lime-accent animate-pulse flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-lime-accent truncate">Voice Connected</p>
          <p className="text-xs text-discord-textMuted truncate">
            #{channel?.name ?? channelId}
          </p>
        </div>
      </div>

      {/* Center: controls */}
      <div className="flex items-center gap-2">
        {/* Mute */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`w-9 h-9 rounded-full glass-slab flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'text-discord-textMuted hover:text-discord-textBright hover:bg-white/5'
          }`}
        >
          {isMuted ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" opacity="0.4" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M19 11a7 7 0 01-7 7m-7 0a7 7 0 007-7M12 18v3m-4 0h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm0 18a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v2m-4 0h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Deafen */}
        <button
          onClick={toggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
          className={`w-9 h-9 rounded-full glass-slab flex items-center justify-center transition-all ${
            isDeafened
              ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
              : 'text-discord-textMuted hover:text-discord-textBright hover:bg-white/5'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a6 6 0 016 6v1a1 1 0 01-2 0v-1a4 4 0 00-8 0v1a1 1 0 01-2 0v-1a6 6 0 016-6z" />
            {isDeafened && <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {/* Right: user + disconnect */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-violet-accent/30 flex items-center justify-center text-xs font-bold text-white">
          {user?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <button
          onClick={leaveChannel}
          title="Disconnect from voice"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
