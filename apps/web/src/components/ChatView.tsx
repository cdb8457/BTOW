import { useState } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { usePresenceStore } from '../stores/presenceStore';
import { useChannelFocus } from '../hooks/useChannelFocus';
import { type MessagePayload } from '../stores/messageStore';
import MessageList from './chat/MessageList';
import MessageInput, { type ReplyTarget } from './chat/MessageInput';

interface ChatViewProps {
  channelId: string;
  channelName: string;
  channelTopic?: string | null;
}

export default function ChatView({ channelId, channelName, channelTopic }: ChatViewProps) {
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  useSocket();
  useChannelFocus(channelId);

  const { setUserStatus } = usePresenceStore();
  useSocketEvent<{ userId: string; status: string }>('presence:changed', (data) => {
    setUserStatus(data.userId, data.status);
  }, []);

  const handleReply = (msg: MessagePayload) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      author: {
        displayName: msg.author.displayName ?? msg.author.username,
        avatarUrl: msg.author.avatarUrl,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="h-12 flex items-center px-4 border-b border-discord-bgTertiary flex-shrink-0 shadow-sm">
        <span className="text-discord-textMuted mr-2 text-lg">#</span>
        <span className="font-semibold text-discord-textBright">{channelName}</span>
        {channelTopic && (
          <>
            <span className="mx-3 text-discord-bgTertiary">|</span>
            <span className="text-sm text-discord-textMuted truncate">{channelTopic}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <MessageList channelId={channelId} onReply={handleReply} />

      {/* Input with reply state */}
      <MessageInput
        channelId={channelId}
        channelName={channelName}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}
