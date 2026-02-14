interface ReplyMessage {
  id: string;
  content: string;
  author: { displayName: string; avatarUrl: string | null };
}

interface ReplyPreviewProps {
  message: ReplyMessage;
  variant: 'quote' | 'composing';
  onDismiss?: () => void;
  onClick?: () => void;
}

export function ReplyPreview({ message, variant, onDismiss, onClick }: ReplyPreviewProps) {
  const truncated =
    message.content.length > 120
      ? message.content.slice(0, 120) + '…'
      : message.content;

  if (variant === 'composing') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-accent/5 border-t border-violet-accent/20 rounded-t-xl">
        <div className="w-0.5 h-8 bg-violet-accent rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-violet-accent font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">reply</span>
            Replying to {message.author.displayName}
          </p>
          <p className="text-xs text-slate-400 truncate">{truncated}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 mb-2 w-full max-w-xl text-left group"
    >
      <div className="w-0.5 h-full self-stretch bg-violet-accent/60 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 px-2 py-1 rounded-r-lg bg-violet-accent/5 hover:bg-violet-accent/10 transition-colors border border-violet-accent/10 group-hover:border-violet-accent/30">
        <p className="text-[10px] font-bold text-violet-accent truncate mb-0.5">
          {message.author.displayName}
        </p>
        <p className="text-xs text-slate-400 truncate leading-relaxed">{truncated}</p>
      </div>
    </button>
  );
}
