import { useEffect, useRef, useCallback } from 'react';
import { useMessageStore, type MessagePayload } from '../../stores/messageStore';
import { useSocketEvent } from '../../hooks/useSocket';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  channelId: string;
  onReply: (message: MessagePayload) => void;
}

export default function MessageList({ channelId, onReply }: MessageListProps) {
  // Use Zustand selectors to prevent unnecessary re-renders
  const messagesByChannel = useMessageStore((state) => state.messagesByChannel);
  const hasMore = useMessageStore((state) => state.hasMore);
  const loading = useMessageStore((state) => state.loading);
  const fetchMessages = useMessageStore((state) => state.fetchMessages);
  const addMessage = useMessageStore((state) => state.addMessage);
  const updateMessage = useMessageStore((state) => state.updateMessage);
  const deleteMessage = useMessageStore((state) => state.deleteMessage);

  const messages = messagesByChannel[channelId] ?? [];
  const isLoading = loading[channelId] ?? false;
  const canLoadMore = hasMore[channelId] ?? true;

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  // Initial fetch
  useEffect(() => {
    if (messages.length === 0) {
      fetchMessages(channelId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Auto-scroll on new messages when near bottom
  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Socket events
  useSocketEvent<MessagePayload>('message:new', (msg) => {
    if (msg.channelId === channelId) addMessage(msg);
  }, [channelId]);

  useSocketEvent<MessagePayload>('message:updated', (msg) => {
    if (msg.channelId === channelId) updateMessage(msg);
  }, [channelId]);

  useSocketEvent<{ messageId: string; channelId: string }>('message:deleted', (data) => {
    if (data.channelId === channelId) deleteMessage(data.messageId, channelId);
  }, [channelId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    isNearBottom.current = scrollHeight - scrollTop - clientHeight < 150;

    if (scrollTop < 80 && canLoadMore && !isLoading && messages.length > 0) {
      const oldest = messages[0];
      const prevHeight = scrollHeight;
      fetchMessages(channelId, oldest.id).then(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop =
              containerRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }, [channelId, canLoadMore, isLoading, messages, fetchMessages]);

  // Memoize shouldShowAuthor to prevent recreation on each render
  const shouldShowAuthor = useCallback((msg: MessagePayload, index: number) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (prev.authorId !== msg.authorId) return true;
    return (
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() >
      5 * 60 * 1000
    );
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 flex flex-col custom-scrollbar"
    >
      {isLoading && (
        <div className="text-center py-3 text-sm text-discord-textMuted">Loading…</div>
      )}
      {!canLoadMore && messages.length > 0 && (
        <div className="text-center py-3 text-sm text-discord-textMuted">
          Beginning of channel
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageItem
          key={msg.id}
          message={msg}
          showAuthor={shouldShowAuthor(msg, i)}
          onReply={onReply}
        />
      ))}

      <TypingIndicator channelId={channelId} />
      <div ref={bottomRef} />
    </div>
  );
}
