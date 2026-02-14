import type { VoiceParticipant as VoiceParticipantData } from '../../stores/voiceStore';

interface Props {
  participant: VoiceParticipantData;
  isLocal?: boolean;
  floatDelay?: 1 | 2 | 3;
}

const FLOAT_DELAY = {
  1: 'float-delay-1',
  2: 'float-delay-2',
  3: 'float-delay-3',
} as const;

export function VoiceParticipant({ participant, isLocal = false, floatDelay = 1 }: Props) {
  const { displayName, username, avatarUrl, isMuted, isDeafened, isSpeaking } = participant;
  const delayClass = FLOAT_DELAY[floatDelay];

  const size = isSpeaking ? 'w-40 h-40' : 'w-28 h-28';
  const filterClass = isMuted && !isSpeaking ? 'grayscale-[0.4] opacity-80' : '';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Avatar coin */}
      <div
        className={`
          relative glass-coin rounded-full floating-avatar ${delayClass}
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${size} ${filterClass}
          ${isSpeaking ? 'active-speaker-ring' : ''}
        `}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span
            className="text-white font-bold select-none"
            style={{ fontSize: isSpeaking ? '2.5rem' : '1.75rem' }}
          >
            {(displayName || username)[0]?.toUpperCase() ?? '?'}
          </span>
        )}

        {/* Muted overlay */}
        {isMuted && (
          <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Deafened overlay */}
        {isDeafened && (
          <div className="absolute bottom-1 left-1 w-7 h-7 rounded-full bg-yellow-500/80 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </div>
        )}

        {/* Local indicator */}
        {isLocal && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-lime-accent/80 border border-bg-dark flex items-center justify-center">
            <svg className="w-3 h-3 text-bg-dark" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4-1.3 4-4S14.7 4 12 4 8 5.3 8 8s1.3 4 4 4zm0 2c-2.7 0-8 1.35-8 4v2h16v-2c0-2.65-5.3-4-8-4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Name tag */}
      <div className="glass-slab px-3 py-1 rounded-full">
        <span className="text-xs font-medium text-discord-textBright truncate max-w-[120px] block text-center">
          {isLocal ? `${displayName} (You)` : displayName}
        </span>
      </div>
    </div>
  );
}
