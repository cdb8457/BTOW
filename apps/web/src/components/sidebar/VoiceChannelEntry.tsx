import { useVoiceStore } from '../../stores/voiceStore';
import { useVoice } from '../../hooks/useVoice';

interface Props {
  channelId: string;
  channelName: string;
  serverId: string;
  onOpenHUD: () => void;
}

export function VoiceChannelEntry({ channelId, channelName, serverId, onOpenHUD }: Props) {
  const { channelId: activeVoiceChannel, participants } = useVoiceStore();
  const { joinChannel } = useVoice();

  const isActive = activeVoiceChannel === channelId;
  const connectedParticipants = isActive ? Array.from(participants.values()) : [];

  const handleClick = () => {
    if (isActive) {
      onOpenHUD();
    } else {
      joinChannel(channelId, serverId);
    }
  };

  return (
    <div className="mb-0.5">
      <button
        onClick={handleClick}
        className={`w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors group ${
          isActive
            ? 'bg-discord-bg/60 text-lime-accent'
            : 'text-discord-textMuted hover:text-discord-text hover:bg-discord-bg/30'
        }`}
      >
        {/* Voice icon */}
        <svg
          className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-lime-accent' : 'text-discord-textMuted'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072M12 6a6 6 0 016 6v1a1 1 0 01-2 0v-1a4 4 0 00-8 0v1a1 1 0 01-2 0v-1a6 6 0 016-6z"
          />
        </svg>
        <span className="flex-1 truncate">{channelName}</span>

        {/* Connected indicator */}
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-lime-accent flex-shrink-0 animate-pulse" />
        )}
      </button>

      {/* Connected participants (shown when someone is in the channel) */}
      {isActive && connectedParticipants.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {connectedParticipants.map((p) => (
            <div key={p.userId} className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-discord-textMuted">
              <div className="w-4 h-4 rounded-full bg-violet-accent/30 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                {p.displayName[0]?.toUpperCase()}
              </div>
              <span className="truncate">{p.displayName}</span>
              {p.isMuted && (
                <svg className="w-3 h-3 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" opacity="0.5" />
                </svg>
              )}
              {p.isSpeaking && !p.isMuted && (
                <span className="w-1.5 h-1.5 rounded-full bg-lime-accent animate-pulse flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
