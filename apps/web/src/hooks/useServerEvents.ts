import { useSocketEvent } from './useSocket';
import { useChannelStore } from '../stores/channelStore';
import { useServerStore } from '../stores/serverStore';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface ChannelPayload {
  serverId: string;
  channelId?: string;
}

interface CategoryPayload {
  serverId: string;
  categoryId?: string;
}

interface KickBanPayload {
  serverId: string;
  userId: string;
}

/**
 * Listens for Socket.IO events that affect the server/channel sidebar and
 * re-fetches data automatically. Mount this once inside Dashboard.
 */
export function useServerEvents() {
  const { fetchChannels, loadedServerId } = useChannelStore();
  const { activeServerId, setActiveServer, servers } = useServerStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const refetch = (serverId: string) => {
    if (serverId === loadedServerId) {
      fetchChannels(serverId);
    }
  };

  // Handle being kicked or banned from the current server
  const handleKickBan = (data: KickBanPayload) => {
    if (!user || data.userId !== user.id) return;
    if (data.serverId !== activeServerId) return;

    // User was kicked/banned from the active server - navigate away
    const remainingServers = servers.filter((s) => s.id !== data.serverId);
    if (remainingServers.length > 0) {
      setActiveServer(remainingServers[0].id);
    } else {
      // No more servers - redirect to login or home
      navigate('/login');
    }
  };

  useSocketEvent<ChannelPayload>('channel:created', (data) => refetch(data.serverId));
  useSocketEvent<ChannelPayload>('channel:updated', (data) => refetch(data.serverId));
  useSocketEvent<ChannelPayload>('channel:deleted', (data) => refetch(data.serverId));
  useSocketEvent<CategoryPayload>('category:created', (data) => refetch(data.serverId));
  useSocketEvent<CategoryPayload>('category:deleted', (data) => refetch(data.serverId));

  // Listen for kicks and bans
  useSocketEvent<KickBanPayload>('server:kicked', handleKickBan);
  useSocketEvent<KickBanPayload>('server:banned', handleKickBan);
}
