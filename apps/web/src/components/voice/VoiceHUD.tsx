import { useVoiceStore } from '../../stores/voiceStore';
import { useVoice } from '../../hooks/useVoice';
import { useAuthStore } from '../../stores/authStore';
import { useChannelStore } from '../../stores/channelStore';
import { VoiceParticipant } from './VoiceParticipant';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mobile?: boolean;
}

const FLOAT_DELAYS: (1 | 2 | 3)[] = [1, 2, 3, 1, 2, 3, 1, 2, 3];

export function VoiceHUD({ isOpen, onClose, mobile = false }: Props) {
  const { channelId, participants, isMuted, isDeafened, isConnecting } = useVoiceStore();
  const { toggleMute, toggleDeafen, leaveChannel } = useVoice();
  const { user } = useAuthStore();
  const { channels } = useChannelStore();

  if (!isOpen || !channelId) return null;

  const channel = channels.find((c) => c.id === channelId);
  const participantList = Array.from(participants.values());

  const handleLeave = async () => {
    await leaveChannel();
    onClose();
  };

  return (
    <div
      className={mobile ? 'relative w-full h-full flex flex-col' : 'fixed inset-0 z-40 flex flex-col'}
      style={mobile ? {} : { background: 'rgba(8,8,10,0.95)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 30% 40%, rgba(139,92,246,0.1), transparent),
            radial-gradient(ellipse 40% 30% at 70% 60%, rgba(246,90,246,0.07), transparent)
          `,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <p className="text-xs text-discord-textMuted uppercase tracking-widest font-semibold">Voice Channel</p>
          <h2 className="text-xl font-bold text-discord-textBright">
            🔊 {channel?.name ?? channelId}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full glass-slab flex items-center justify-center text-discord-textMuted hover:text-discord-textBright transition-colors"
          title="Close HUD (stay in voice)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Participant canvas */}
      <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden">
        {isConnecting && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full glass-coin mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-accent animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-discord-textMuted text-sm">Connecting to voice…</p>
          </div>
        )}

        {!isConnecting && participantList.length === 0 && (
          <div className="text-center opacity-60">
            <p className="text-4xl mb-3">🔇</p>
            <p className="text-discord-textMuted text-sm">No one else here yet</p>
          </div>
        )}

        {!isConnecting && participantList.length > 0 && (
          <div
            className="flex flex-wrap items-center justify-center gap-8 px-8"
            style={{ maxWidth: 900 }}
          >
            {participantList.map((p, i) => (
              <VoiceParticipant
                key={p.userId}
                participant={p}
                isLocal={p.userId === user?.id}
                floatDelay={FLOAT_DELAYS[i % FLOAT_DELAYS.length]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Control bar pill */}
      <div className="relative z-10 flex justify-center pb-8 px-4">
        <div className="glass-slab light-leak relative rounded-full px-8 py-4 flex items-center gap-6">
          {/* Left: user info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-accent/30 flex items-center justify-center text-xs font-bold text-white">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-xs font-semibold text-discord-textBright leading-tight">{user?.displayName}</p>
              <p className="text-[10px] text-lime-accent leading-tight">Voice Connected</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Center: controls */}
          <div className="flex items-center gap-3">
            {/* Mic */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              className={`w-12 h-12 rounded-full glass-slab flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'text-discord-textMuted hover:text-discord-textBright'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m-7 0a7 7 0 007-7m7 0V7a5 5 0 00-10 0v4" />
                    <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm0 18a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v2" />
                )}
              </svg>
            </button>

            {/* Headphones */}
            <button
              onClick={toggleDeafen}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
              className={`w-12 h-12 rounded-full glass-slab flex items-center justify-center transition-all ${
                isDeafened
                  ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                  : 'text-discord-textMuted hover:text-discord-textBright'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19H6a2 2 0 01-2-2v-3a2 2 0 012-2h1a2 2 0 012 2v3m6 0h3a2 2 0 002-2v-3a2 2 0 00-2-2h-1a2 2 0 00-2 2v3M5 10a7 7 0 0114 0" />
              </svg>
            </button>

            {/* Settings (placeholder) */}
            <button
              className="w-12 h-12 rounded-full glass-slab flex items-center justify-center text-discord-textMuted hover:text-discord-textBright transition-colors"
              title="Voice settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Right: disconnect */}
          <button
            onClick={handleLeave}
            title="Disconnect from voice"
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:border-red-500/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
