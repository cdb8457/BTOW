import { useEffect } from 'react';
import { getSocket } from './useSocket';

export function useChannelFocus(channelId: string | null) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channelId) return;

    socket.emit('channel:focus', { channelId });

    return () => {
      socket.emit('channel:blur', { channelId });
    };
  }, [channelId]);
}
