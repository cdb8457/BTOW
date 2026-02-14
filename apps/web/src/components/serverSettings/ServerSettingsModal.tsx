import { useState, useRef, useEffect } from 'react';
import { useServerSettingsStore } from '../../stores/serverSettingsStore';
import { useServerStore } from '../../stores/serverStore';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';

import { OverviewTab } from './tabs/OverviewTab';
import { ChannelsTab } from './tabs/ChannelsTab';
import { RolesTab } from './tabs/RolesTab';
import { MembersTab } from './tabs/MembersTab';

type TabId = 'overview' | 'channels' | 'roles' | 'members';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'channels', label: 'Channels' },
  { id: 'roles', label: 'Roles' },
  { id: 'members', label: 'Members' },
];

export function ServerSettingsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId('server-settings');
  const { activeServerId } = useServerStore();
  const { loadRoles, loadMembers, loadBans } = useServerSettingsStore();

  // Initialize focus trap
  useFocusTrap(isOpen, modalRef as React.RefObject<HTMLElement>);

  // Load data on modal open
  useEffect(() => {
    if (isOpen && activeServerId) {
      loadRoles(activeServerId);
      loadMembers(activeServerId);
      loadBans(activeServerId);
    }
  }, [isOpen, activeServerId, loadRoles, loadMembers, loadBans]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderTabContent = () => {
    if (!activeServerId) {
      return (
        <div className="flex items-center justify-center h-48">
          <span className="text-gray-400">No server selected</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'channels':
        return <ChannelsTab serverId={activeServerId} />;
      case 'roles':
        return <RolesTab serverId={activeServerId} />;
      case 'members':
        return <MembersTab serverId={activeServerId} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={modalRef}
        className="glass-panel rounded-2xl w-full max-w-4xl h-[80vh] max-h-[700px] flex flex-col overflow-hidden shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 id={titleId} className="text-xl font-semibold text-white">
              Server Settings
            </h2>
            <span className="glass-chip">SRV_CFG</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 -mr-2 -mt-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-3 border-b border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-[#8b5cf6]/20 text-[#d9f99d] border border-[#8b5cf6]/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
