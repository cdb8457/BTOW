import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { ChannelData, CategoryData } from '../../../stores/channelStore';

interface Props {
  serverId: string;
}

const API = import.meta.env.VITE_API_URL;

type ChannelType = 'text' | 'voice';

export function ChannelsTab({ serverId }: Props) {
  const { accessToken } = useAuthStore();
  
  // Local state for this component
  const [localChannels, setLocalChannels] = useState<ChannelData[]>([]);
  const [localCategories, setLocalCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New channel form state
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('text');
  const [isCreating, setIsCreating] = useState(false);
  
  // Inline rename state
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Fetch channels on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = accessToken;
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        
        const res = await fetch(`${API}/api/servers/${serverId}/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          throw new Error('Failed to load channels');
        }
        
        const data = await res.json();
        setLocalChannels(data.channels || []);
        setLocalCategories(data.categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [serverId, accessToken]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingChannelId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingChannelId]);

  // Group channels by category
  const channelsByCategory = localChannels.reduce((acc, channel) => {
    const catId = channel.categoryId || 'uncategorized';
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(channel);
    return acc;
  }, {} as Record<string, ChannelData[]>);

  // Sort channels within each category by position
  Object.keys(channelsByCategory).forEach(catId => {
    channelsByCategory[catId].sort((a, b) => a.position - b.position);
  });

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    
    setIsCreating(true);
    setError(null);
    
    try {
      const res = await fetch(`${API}/api/servers/${serverId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          type: newChannelType,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to create channel');
      }
      
      const newChannel = await res.json() as ChannelData;
      setLocalChannels(prev => [...prev, newChannel]);
      setNewChannelName('');
      setNewChannelType('text');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartRename = (channel: ChannelData) => {
    setEditingChannelId(channel.id);
    setEditingName(channel.name);
  };

  const handleSaveRename = async (channelId: string) => {
    if (!editingName.trim()) {
      setEditingChannelId(null);
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/servers/${serverId}/channels/${channelId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: editingName.trim(),
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to rename channel');
      }
      
      const updatedChannel = await res.json() as ChannelData;
      setLocalChannels(prev => 
        prev.map(c => c.id === channelId ? updatedChannel : c)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename channel');
    } finally {
      setEditingChannelId(null);
    }
  };

  const handleCancelRename = () => {
    setEditingChannelId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, channelId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(channelId);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      const res = await fetch(`${API}/api/servers/${serverId}/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete channel');
      }
      
      setLocalChannels(prev => prev.filter(c => c.id !== channelId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-lime-accent/30 border-t-lime-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Channels</h2>
        <p className="text-xs text-slate-400">Manage your server channels</p>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Create new channel form */}
      <div className="glass-panel rounded-xl p-4 border border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Create Channel</p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Channel type selector */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {(['text', 'voice'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setNewChannelType(type)}
                aria-pressed={newChannelType === type}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all ${
                  newChannelType === type
                    ? 'bg-lime-accent/10 text-lime-accent'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span aria-hidden="true">
                  {type === 'text' ? (
                    <span className="material-symbols-outlined text-base">tag</span>
                  ) : (
                    <span className="material-symbols-outlined text-base">volume_up</span>
                  )}
                </span>
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>

          {/* Channel name input */}
          <div className="flex-1 flex items-center obsidian-control rounded-lg border border-white/10 focus-within:border-lime-accent/40">
            <span className="pl-3 text-slate-500" aria-hidden="true">
              {newChannelType === 'text' ? (
                <span className="material-symbols-outlined text-base">tag</span>
              ) : (
                <span className="material-symbols-outlined text-base">volume_up</span>
              )}
            </span>
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
              placeholder="channel-name"
              maxLength={100}
              className="flex-1 bg-transparent text-white px-2 py-2 text-sm focus:outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleCreateChannel}
            disabled={isCreating || !newChannelName.trim()}
            className="px-4 py-2 text-sm font-medium text-black bg-lime-accent hover:bg-lime-accent/90 disabled:bg-lime-accent/50 disabled:cursor-not-allowed rounded-lg transition-all"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Channels list */}
      <div className="flex flex-col gap-4">
        {localCategories.map((category) => (
          <div key={category.id} className="flex flex-col gap-1">
            {/* Category header */}
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="material-symbols-outlined text-slate-500 text-sm">
                chevron_right
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                {category.name}
              </span>
            </div>
            
            {/* Channels in category */}
            <div className="flex flex-col gap-1 ml-2">
              {channelsByCategory[category.id]?.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isEditing={editingChannelId === channel.id}
                  editingName={editingName}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onDelete={handleDeleteChannel}
                  onNameChange={setEditingName}
                  onKeyDown={handleKeyDown}
                  inputRef={renameInputRef}
                />
              ))}
            </div>
          </div>
        ))}
        
        {/* Uncategorized channels */}
        {channelsByCategory['uncategorized'] && channelsByCategory['uncategorized'].length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="material-symbols-outlined text-slate-500 text-sm">
                chevron_right
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Text Channels
              </span>
            </div>
            
            <div className="flex flex-col gap-1 ml-2">
              {channelsByCategory['uncategorized'].map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isEditing={editingChannelId === channel.id}
                  editingName={editingName}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onDelete={handleDeleteChannel}
                  onNameChange={setEditingName}
                  onKeyDown={handleKeyDown}
                  inputRef={renameInputRef}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {localChannels.length === 0 && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">
              folder_off
            </span>
            <p className="text-sm text-slate-400">No channels yet</p>
            <p className="text-xs text-slate-500">Create your first channel above</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Channel item component for inline editing and deletion
interface ChannelItemProps {
  channel: ChannelData;
  isEditing: boolean;
  editingName: string;
  onStartRename: (channel: ChannelData) => void;
  onSaveRename: (channelId: string) => void;
  onCancelRename: () => void;
  onDelete: (channelId: string) => void;
  onNameChange: (name: string) => void;
  onKeyDown: (e: React.KeyboardEvent, channelId: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

function ChannelItem({
  channel,
  isEditing,
  editingName,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
  onNameChange,
  onKeyDown,
  inputRef,
}: ChannelItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const isVoice = channel.type === 'voice';
  
  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Channel type icon */}
      <span 
        className={`material-symbols-outlined text-lg shrink-0 ${
          isVoice ? 'text-violet-accent' : 'text-lime-accent'
        }`}
        aria-hidden="true"
      >
        {isVoice ? 'volume_up' : 'tag'}
      </span>
      
      {/* Channel name or edit input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editingName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, channel.id)}
          onBlur={() => onSaveRename(channel.id)}
          className="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-lime-accent"
          maxLength={100}
        />
      ) : (
        <button
          onClick={() => onStartRename(channel)}
          className="flex-1 text-left text-sm text-slate-300 hover:text-white transition-colors truncate"
        >
          {channel.name}
        </button>
      )}
      
      {/* Delete button - visible on hover */}
      {showDelete && !isEditing && (
        <button
          onClick={() => onDelete(channel.id)}
          onBlur={onCancelRename}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
          aria-label={`Delete ${channel.name}`}
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      )}
      
      {/* Channel type badge */}
      <span className="text-[10px] uppercase tracking-wider text-slate-600 shrink-0">
        {channel.type}
      </span>
    </div>
  );
}
