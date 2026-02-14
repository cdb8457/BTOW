import { useTypingStore } from '../../stores/typingStore';
import { useSocketEvent } from '../../hooks/useSocket';
import { useAuthStore } from '../../stores/authStore';

interface TypingIndicatorProps {
  channelId: string;
}

export default function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const { typingByChannel, setUserTyping, clearUserTyping } = useTypingStore();
  const { user } = useAuthStore();

  useSocketEvent<{ channelId: string; userId: string; username: string; typing: boolean }>(
    'typing:update',
    (data) => {
      if (data.channelId !== channelId) return;
      if (data.userId === user?.id) return; // ignore own events
      if (data.typing) {
        setUserTyping(channelId, data.userId, data.username);
      } else {
        clearUserTyping(channelId, data.userId);
      }
    },
    [channelId, user?.id]
  );

  const typingUsers = typingByChannel[channelId] ?? [];

  if (typingUsers.length === 0) return <div className="h-6" />;

  const names = typingUsers.map((u) => u.username);
  const text =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length <= 3
      ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are typing…`
      : `${names.length} people are typing…`;

  return (
    <div className="h-6 flex items-center gap-2 px-2 text-xs text-discord-textMuted">
      <span className="flex gap-0.5 items-end">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-discord-textMuted rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span>{text}</span>
    </div>
  );
}
