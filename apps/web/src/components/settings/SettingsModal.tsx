import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { AvatarUpload } from './AvatarUpload';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSlider } from './SettingsSlider';
import { SettingsRow } from './SettingsRow';
import { PushPermissionPrompt } from '../pwa/PushPermissionPrompt';
import { usePush } from '../../hooks/usePush';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'voice';

const TABS: { id: SettingsTab; icon: string; label: string }[] = [
  { id: 'profile', icon: 'account_circle', label: 'Profile' },
  { id: 'appearance', icon: 'palette', label: 'Appearance' },
  { id: 'notifications', icon: 'notifications', label: 'Alerts' },
  { id: 'voice', icon: 'mic', label: 'Voice' },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { user, updateProfile, updateStatus } = useAuthStore();
  const settings = useSettingsStore();
  const { subscribed, unsubscribe } = usePush();

  // Profile form state — use camelCase to match existing User interface
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId('settings');
  const descriptionId = useId('settings-desc');

  // Initialize focus trap
  useFocusTrap(open, modalRef as React.RefObject<HTMLElement>);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setCustomStatus(user.customStatus ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        customStatus: customStatus || null,
        avatarUrl: avatarUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[Settings] save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const statusColors: Record<string, string> = {
    online: 'bg-lime-accent shadow-[0_0_8px_#d9f99d]',
    idle: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
    dnd: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    offline: 'bg-slate-600',
  };

  const statusLabels: Record<string, string> = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    offline: 'Invisible',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl max-h-[90vh] glass-panel rounded-3xl overflow-hidden flex flex-col md:flex-row"
      >

        {/* Watermark */}
        <span className="absolute top-4 left-6 text-7xl font-black text-white/[0.04] select-none pointer-events-none leading-none font-mono tracking-tighter" aria-hidden="true">
          OS_GLASS
        </span>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full glass-slab flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        {/* Tab nav */}
        <nav 
          className="flex md:flex-col gap-1 p-4 md:w-44 md:border-r border-b md:border-b-0 border-white/[0.05] shrink-0"
          role="tablist"
          aria-label="Settings sections"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                className={`flex md:flex-col items-center gap-2 md:gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    isActive ? 'text-lime-accent' : 'text-white'
                  }`}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-widest font-bold ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="hidden md:block w-10 h-0.5 bg-lime-accent rounded-full shadow-[0_0_8px_#d9f99d] mt-1" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8"
          role="tabpanel"
          id={`${activeTab}-panel`}
          aria-labelledby={`${activeTab}-tab`}
        >

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-6">Identity</p>
                <AvatarUpload
                  currentUrl={avatarUrl || null}
                  displayName={displayName || user?.username || 'U'}
                  onUpload={setAvatarUrl}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor={titleId + '-displayname'} className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                    Display Name
                  </label>
                  <input
                    id={titleId + '-displayname'}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={32}
                    placeholder={user?.username}
                    className="w-full obsidian-control rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:ring-1 focus:ring-violet-accent/50 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor={titleId + '-status'} className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                    Custom Status
                  </label>
                  <input
                    id={titleId + '-status'}
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    maxLength={128}
                    placeholder="What's your status?"
                    className="w-full obsidian-control rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:ring-1 focus:ring-violet-accent/50 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label id={titleId + '-presence-label'} className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                    Presence
                  </label>
                  <div 
                    className="grid grid-cols-2 md:grid-cols-4 gap-2"
                    role="radiogroup"
                    aria-labelledby={titleId + '-presence-label'}
                  >
                    {(['online', 'idle', 'dnd', 'offline'] as const).map((status) => {
                      const isSelected = user?.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => updateStatus(status)}
                          role="radio"
                          aria-checked={isSelected}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl obsidian-control border transition-all ${
                            isSelected
                              ? 'border-lime-accent/40 bg-lime-accent/5'
                              : 'border-white/5 hover:border-white/15'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${statusColors[status]}`}
                            aria-hidden="true"
                          />
                          <span className="text-xs text-white truncate">
                            {statusLabels[status]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                aria-describedby={saved ? `${titleId}-save-status` : undefined}
                className={[
                  'self-start px-8 py-3 rounded-xl font-black text-sm uppercase tracking-wider',
                  'transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
                  saved
                    ? 'bg-lime-accent/20 text-lime-accent border border-lime-accent/40'
                    : 'bg-lime-accent text-black shadow-[0_0_30px_rgba(217,249,157,0.4)]',
                ].join(' ')}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
              </button>
              {saved && (
                <span id={`${titleId}-save-status`} role="status" aria-live="polite" className="sr-only">
                  Settings saved successfully
                </span>
              )}
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Display</p>

              <SettingsRow
                label="Message Style"
                description="Cozy shows avatars and extra spacing. Compact is denser."
              >
                <div className="flex rounded-xl obsidian-control border border-white/10 overflow-hidden">
                  {(['cozy', 'compact'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => settings.setMessageDisplay(mode)}
                      aria-pressed={settings.messageDisplay === mode}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                        settings.messageDisplay === mode
                          ? 'bg-lime-accent/10 text-lime-accent'
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </SettingsRow>

              <SettingsRow
                label="Show Avatars"
                description="Display user avatars next to messages."
              >
                <SettingsToggle
                  value={settings.showAvatars}
                  onChange={settings.setShowAvatars}
                />
              </SettingsRow>

              <SettingsRow label="Show Timestamps">
                <SettingsToggle
                  value={settings.showTimestamps}
                  onChange={settings.setShowTimestamps}
                />
              </SettingsRow>

              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-6 mb-4">
                Font Size
              </p>

              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Font size options">
                {([14, 15, 16, 18] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => settings.setFontSize(size)}
                    aria-pressed={settings.fontSize === size}
                    className={`py-3 rounded-xl obsidian-control border transition-all text-center ${
                      settings.fontSize === size
                        ? 'border-lime-accent/40 bg-lime-accent/5 text-lime-accent'
                        : 'border-white/5 text-slate-400 hover:border-white/15 hover:text-white'
                    }`}
                  >
                    <span style={{ fontSize: size }}>{size}px</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">
                Push Notifications
              </p>

              <div className="mb-6 flex flex-col gap-3">
                <PushPermissionPrompt />
                {subscribed && (
                  <div className="flex items-center justify-between p-4 obsidian-control rounded-xl border border-lime-accent/20">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-lime-accent shadow-[0_0_6px_#d9f99d]" aria-hidden="true" />
                      <span className="text-sm text-white">Push notifications active</span>
                    </div>
                    <button
                      onClick={unsubscribe}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Disable
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">
                Notify Me On
              </p>

              <SettingsRow label="Mentions" description="When someone @mentions you.">
                <SettingsToggle
                  value={settings.notifyOnMention}
                  onChange={settings.setNotifyOnMention}
                />
              </SettingsRow>

              <SettingsRow label="Direct Messages">
                <SettingsToggle
                  value={settings.notifyOnDM}
                  onChange={settings.setNotifyOnDM}
                />
              </SettingsRow>

              <SettingsRow
                label="All Messages"
                description="Notify on every message (high volume)."
              >
                <SettingsToggle
                  value={settings.notifyOnAllMessages}
                  onChange={settings.setNotifyOnAllMessages}
                />
              </SettingsRow>

              <SettingsRow label="Notification Sound">
                <SettingsToggle
                  value={settings.notificationSound}
                  onChange={settings.setNotificationSound}
                />
              </SettingsRow>
            </div>
          )}

          {/* ── VOICE ── */}
          {activeTab === 'voice' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Volume</p>
                <div className="flex flex-col gap-6">
                  <div>
                    <label htmlFor={titleId + '-input-volume'} className="text-xs text-slate-400 block mb-3">Input Volume</label>
                    <SettingsSlider
                      id={titleId + '-input-volume'}
                      value={settings.inputVolume}
                      onChange={settings.setInputVolume}
                    />
                  </div>
                  <div>
                    <label htmlFor={titleId + '-output-volume'} className="text-xs text-slate-400 block mb-3">Output Volume</label>
                    <SettingsSlider
                      id={titleId + '-output-volume'}
                      value={settings.outputVolume}
                      onChange={settings.setOutputVolume}
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">
                  Processing
                </p>
                <SettingsRow
                  label="Noise Suppression"
                  description="Filter background noise from your mic."
                >
                  <SettingsToggle
                    value={settings.noiseSuppression}
                    onChange={settings.setNoiseSuppression}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Echo Cancellation"
                  description="Prevent your speakers from feeding back into your mic."
                >
                  <SettingsToggle
                    value={settings.echoCancellation}
                    onChange={settings.setEchoCancellation}
                  />
                </SettingsRow>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
