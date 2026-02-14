import { useState, useRef, useCallback } from 'react';
import { useMessageStore } from '../../stores/messageStore';
import { useTypingStore } from '../../stores/typingStore';
import { ReplyPreview } from './ReplyPreview';

export interface ReplyTarget {
  id: string;
  content: string;
  author: { displayName: string; avatarUrl: string | null };
}

interface MessageInputProps {
  channelId: string;
  channelName: string;
  mobile?: boolean;
  replyTo?: ReplyTarget | null;
  onClearReply?: () => void;
}

export default function MessageInput({
  channelId,
  channelName,
  mobile = false,
  replyTo,
  onClearReply,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useMessageStore();
  const { startTyping, stopTyping } = useTypingStore();

  const submit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 4000) return;
    sendMessage(channelId, trimmed, replyTo?.id ?? undefined);
    setContent('');
    stopTyping(channelId);
    onClearReply?.();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [content, channelId, replyTo, sendMessage, stopTyping, onClearReply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    startTyping(channelId);
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  return (
    <div className="px-4 pb-4 pt-1 flex-shrink-0 flex flex-col">
      {/* Reply preview bar */}
      {replyTo && (
        <ReplyPreview
          message={replyTo}
          variant="composing"
          onDismiss={onClearReply}
        />
      )}

      {/* Input */}
      <div className="flex items-end gap-2 bg-discord-bgTertiary rounded-lg px-3 py-2">
        {/* Attach placeholder */}
        <button className="p-1 text-discord-textMuted hover:text-discord-text rounded transition-colors mb-0.5 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            replyTo
              ? `Reply to ${replyTo.author.displayName}…`
              : `Message #${channelName}`
          }
          className={`flex-1 bg-transparent text-discord-text placeholder-discord-textMuted resize-none outline-none max-h-48 py-0.5 leading-relaxed ${
            mobile ? 'text-base' : 'text-sm'
          }`}
          rows={1}
        />

        {(content.trim() || mobile) && (
          <button
            onClick={submit}
            disabled={!content.trim()}
            className="p-1.5 bg-discord-accent hover:bg-discord-accentHover disabled:opacity-40 text-white rounded transition-colors mb-0.5 flex-shrink-0 touch-target"
            title="Send"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
