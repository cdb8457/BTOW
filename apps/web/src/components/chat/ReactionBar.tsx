import { useState, useRef, useEffect } from 'react';

export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

interface ReactionBarProps {
  messageId: string;
  reactions: ReactionGroup[];
  currentUserId: string;
  onAdd: (emoji: string) => void;
  onRemove: (emoji: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

export function ReactionBar({
  messageId: _messageId,
  reactions,
  currentUserId,
  onAdd,
  onRemove,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (reactions.length === 0 && !showPicker) return null;

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-2">
      {reactions.map((reaction) => {
        const hasReacted = reaction.userIds.includes(currentUserId);
        return (
          <button
            key={reaction.emoji}
            onClick={() => (hasReacted ? onRemove(reaction.emoji) : onAdd(reaction.emoji))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border transition-all duration-150 hover:scale-105 active:scale-95 ${
              hasReacted
                ? 'bg-primary/15 border-primary/40 shadow-[0_0_8px_rgba(246,90,246,0.2)]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <span className="leading-none">{reaction.emoji}</span>
            <span
              className={`text-[11px] font-bold font-mono ${
                hasReacted ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {reaction.count}
            </span>
          </button>
        );
      })}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowPicker((p) => !p)}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-slate-400 hover:text-white"
          title="Add reaction"
        >
          <span className="material-symbols-outlined text-sm">add_reaction</span>
        </button>

        {showPicker && (
          <div className="absolute bottom-full mb-2 left-0 z-20 glass-slab light-leak rounded-xl p-2 flex gap-1">
            {QUICK_EMOJIS.map((emoji) => {
              const g = reactions.find((r) => r.emoji === emoji);
              const picked = g?.userIds.includes(currentUserId) ?? false;
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    picked ? onRemove(emoji) : onAdd(emoji);
                    setShowPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-all hover:scale-125"
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
