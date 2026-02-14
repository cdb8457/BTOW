import { useState, useCallback, memo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMessageStore, type MessagePayload } from '../../stores/messageStore';
import { useReactionStore } from '../../stores/reactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ReactionBar } from './ReactionBar';
import { ReplyPreview } from './ReplyPreview';
import { LinkEmbed } from './LinkEmbed';
import { FileAttachment } from './FileAttachment';

interface MessageItemProps {
  message: MessagePayload;
  showAuthor: boolean;
  onReply?: (message: MessagePayload) => void;
}

const MessageItem = memo(function MessageItem({ message, showAuthor, onReply }: MessageItemProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Use Zustand selectors to prevent unnecessary re-renders
  const user = useAuthStore((state) => state.user);
  const editMessage = useMessageStore((state) => state.editMessage);
  const deleteMessageAction = useMessageStore((state) => state.deleteMessageAction);
  const reactions = useReactionStore((state) => state.reactions);
  const toggleReaction = useReactionStore((state) => state.toggleReaction);
  const messageDisplay = useSettingsStore((state) => state.messageDisplay);
  const showAvatars = useSettingsStore((state) => state.showAvatars);
  const showTimestamps = useSettingsStore((state) => state.showTimestamps);
  const fontSize = useSettingsStore((state) => state.fontSize);

  const isOwn = user?.id === message.authorId;
  const isCompact = messageDisplay === 'compact';
  const messageReactions = reactions[message.id] ?? message.reactions ?? [];

  const ts = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      editMessage(message.id, editContent.trim());
    }
    setEditing(false);
  };

  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setEditContent(message.content);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message?')) {
      deleteMessageAction(message.id);
    }
  };

  const handleAddReaction = useCallback(
    (emoji: string) => toggleReaction(message.id, emoji),
    [message.id, toggleReaction]
  );
  const handleRemoveReaction = useCallback(
    (emoji: string) => toggleReaction(message.id, emoji),
    [message.id, toggleReaction]
  );

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex gap-3 px-2 rounded hover:bg-white/5 transition-colors ${
        showAuthor ? (isCompact ? 'mt-2' : 'mt-4') : (isCompact ? 'mt-0' : 'mt-0.5')
      }`}
      style={{ paddingTop: isCompact ? '2px' : undefined, paddingBottom: isCompact ? '2px' : '4px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pinned indicator */}
      {message.pinned && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-lime-accent rounded-full shadow-[0_0_6px_#d9f99d]" />
      )}

      {/* Avatar / time gutter */}
      {showAvatars && !isCompact ? (
        showAuthor ? (
          message.author.avatarUrl ? (
            <img
              src={message.author.avatarUrl}
              alt={message.author.username}
              className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5 border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5 bg-violet-accent/20 border border-violet-accent/20 flex items-center justify-center">
              <span className="text-sm font-black text-violet-accent">
                {(message.author.displayName || message.author.username)[0].toUpperCase()}
              </span>
            </div>
          )
        ) : (
          <span className="w-10 flex-shrink-0 text-[10px] text-discord-textMuted text-right pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showTimestamps ? ts : ''}
          </span>
        )
      ) : (
        <span className="w-10 flex-shrink-0 text-[10px] text-discord-textMuted text-right pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {showTimestamps ? ts : ''}
        </span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Reply quote */}
        {message.replyTo && (
          <ReplyPreview
            message={{
              id: message.replyTo.id,
              content: message.replyTo.content,
              author: {
                displayName: message.replyTo.author.displayName ?? message.replyTo.author.username,
                avatarUrl: message.replyTo.author.avatarUrl,
              },
            }}
            variant="quote"
            onClick={() => {
              document
                .getElementById(`msg-${message.replyTo!.id}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}

        {/* Author header */}
        {showAuthor && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm text-discord-textBright">
              {message.author.displayName ?? message.author.username}
            </span>
            {showTimestamps && (
              <span className="text-xs text-discord-textMuted">{ts}</span>
            )}
          </div>
        )}

        {/* Message text */}
        {editing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKey}
              className="w-full bg-discord-bg border border-discord-accent rounded px-2 py-1 text-sm text-discord-text resize-none focus:outline-none"
              rows={2}
              autoFocus
            />
            <p className="text-xs text-discord-textMuted mt-0.5">
              Enter to save · Escape to cancel
            </p>
          </div>
        ) : (
          message.content && (
            <p
              className="text-discord-text whitespace-pre-wrap break-words leading-relaxed"
              style={{ fontSize }}
            >
              {message.content}
              {message.editedAt && (
                <span className="text-[10px] text-discord-textMuted ml-1">(edited)</span>
              )}
            </p>
          )
        )}

        {/* File attachments */}
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att) => (
              <FileAttachment
                key={att.id}
                attachment={{
                  id: att.id,
                  filename: att.filename,
                  url: att.url,
                  content_type: att.contentType,
                  size: att.size,
                }}
              />
            ))}
          </div>
        )}

        {/* Link embed */}
        {message.linkPreview && (
          <LinkEmbed {...message.linkPreview} />
        )}

        {/* Reaction bar */}
        {user && (
          <ReactionBar
            messageId={message.id}
            reactions={messageReactions}
            currentUserId={user.id}
            onAdd={handleAddReaction}
            onRemove={handleRemoveReaction}
          />
        )}
      </div>

      {/* Hover toolbar */}
      {hovered && !editing && (
        <div className="absolute -top-3 right-2 flex items-center glass-slab light-leak rounded-xl px-2 py-1.5 shadow-lg z-10">
          {/* Quick reactions */}
          {['👍', '❤️', '😂'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddReaction(emoji)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-sm hover:scale-125 transition-all"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Reply */}
          <button
            onClick={() => onReply?.(message)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            aria-label="Reply to message"
          >
            <span className="material-symbols-outlined text-sm">reply</span>
          </button>

          {isOwn && (
            <>
              {/* Edit */}
              <button
                onClick={() => { setEditing(true); setEditContent(message.content); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                aria-label="Edit message"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
              {/* Delete */}
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                aria-label="Delete message"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default MessageItem;
