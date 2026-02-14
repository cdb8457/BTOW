import { useSocketEvent } from './useSocket';
import { useReactionStore } from '../stores/reactionStore';
import { useDMStore } from '../stores/dmStore';

interface ReactionEvent {
  message_id: string;
  user_id: string;
  emoji: string;
}

interface DMTypingEvent {
  dm_channel_id: string;
  user_id: string;
  typing: boolean;
}

/**
 * Registers global DM and reaction socket event listeners.
 * Mount this once inside Dashboard (alongside useServerEvents).
 */
export function useDMSocketEvents() {
  const { addReaction, removeReaction } = useReactionStore();
  const { setTyping } = useDMStore();

  useSocketEvent<ReactionEvent>('reaction:added', ({ message_id, user_id, emoji }) => {
    addReaction(message_id, user_id, emoji);
  });

  useSocketEvent<ReactionEvent>('reaction:removed', ({ message_id, user_id, emoji }) => {
    removeReaction(message_id, user_id, emoji);
  });

  useSocketEvent<DMTypingEvent>('dm:typing:update', ({ dm_channel_id, user_id, typing }) => {
    setTyping(dm_channel_id, user_id, typing);
  });
}
