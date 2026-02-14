import { useState, useRef, useEffect } from 'react';
import { useServerSettingsStore } from '../../../stores/serverSettingsStore';
import { useServerStore } from '../../../stores/serverStore';
import { useFileUpload } from '../../../hooks/useFileUpload';
import { colors, shadows } from '../../../styles/design-tokens';

export function OverviewTab() {
  const { activeServerId, servers } = useServerStore();
  const server = servers.find((s) => s.id === activeServerId);
  
  const [name, setName] = useState(server?.name ?? '');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress, error: uploadError } = useFileUpload();
  const { updateServer, deleteServer } = useServerSettingsStore();

  // Sync name with server when it loads
  useEffect(() => {
    if (server) {
      setName(server.name);
    }
  }, [server?.name]);

  if (!server || !activeServerId) {
    return (
      <div className="p-6 text-center text-slate-500">
        No server selected
      </div>
    );
  }

  // Determine if there are unsaved changes
  const hasChanges = name !== server.name || pendingIcon !== null;

  const handleFileSelect = async (file: File) => {
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setIconPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const uploaded = await upload(file);
      setPendingIcon(uploaded.file_url);
    } catch (err) {
      console.error('[OverviewTab] icon upload failed:', err);
      setIconPreview(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !activeServerId) return;

    setSaving(true);
    setSaved(false);
    try {
      await updateServer(activeServerId, {
        name: name.trim(),
        iconUrl: pendingIcon === '' ? null : pendingIcon ?? undefined,
      });
      setSaved(true);
      setPendingIcon(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[OverviewTab] save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeServerId || deleteConfirmText !== server.name) return;

    setDeleting(true);
    try {
      await deleteServer(activeServerId);
    } catch (err) {
      console.error('[OverviewTab] delete failed:', err);
      setDeleting(false);
    }
  };

  const handleRemoveIcon = () => {
    setIconPreview(null);
    setPendingIcon('');
  };

  const displayIcon = iconPreview ?? server.iconUrl;
  const initials = (name || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 space-y-8">
      {/* Server Icon Section */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Server Icon</h3>
        <div className="flex items-center gap-6">
          {/* Icon preview */}
          <div className="relative group">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-lime-accent/40 transition-all cursor-pointer"
              style={{ boxShadow: shadows.glassCard }}
              onClick={() => fileRef.current?.click()}
            >
              {displayIcon ? (
                <img src={displayIcon} alt={server.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-violet-accent/20 flex items-center justify-center">
                  <span className="text-3xl font-black text-violet-accent">{initials}</span>
                </div>
              )}

              {/* Upload overlay */}
              <div
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl"
                style={{ borderRadius: 'inherit' }}
              >
                {uploading ? (
                  <span className="text-xs font-bold text-lime-accent">{progress}%</span>
                ) : (
                  <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                )}
              </div>
            </div>

            {/* Circular progress ring */}
            {uploading && (
              <svg
                className="absolute inset-0 w-24 h-24 -rotate-90 pointer-events-none"
                viewBox="0 0 96 96"
              >
                <circle cx="48" cy="48" r="46" fill="none" stroke="rgba(217,249,157,0.2)" strokeWidth="2" />
                <circle
                  cx="48"
                  cy="48"
                  r="46"
                  fill="none"
                  stroke="#d9f99d"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
                  className="transition-all"
                />
              </svg>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-xl obsidian-control border border-white/10 text-sm text-white hover:border-lime-accent/40 hover:text-lime-accent transition-all disabled:opacity-50"
              style={{ width: 'fit-content' }}
            >
              {uploading ? `Uploading ${progress}%` : 'Upload Icon'}
            </button>
            {(displayIcon) && (
              <button
                onClick={handleRemoveIcon}
                className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 transition-colors"
                style={{ width: 'fit-content' }}
              >
                Remove
              </button>
            )}
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              Max 25MB &bull; JPG PNG GIF WEBP
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = '';
            }}
          />
        </div>
        {uploadError && (
          <p className="text-xs text-red-400 mt-2">{uploadError}</p>
        )}
      </section>

      {/* Server Name Section */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Server Name</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Server name"
            className="flex-1 obsidian-control"
            style={{
              background: colors.bgSurface,
              borderColor: colors.borderGlass,
              color: colors.textBright,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || !name.trim()}
            className="px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: saved ? colors.limeAccent : colors.violetAccent,
              color: saved ? '#08080a' : '#fff',
              boxShadow: saved ? shadows.ctaLime : shadows.violet,
            }}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-4">Danger Zone</h3>
        <div
          className="p-5 rounded-xl border"
          style={{
            background: colors.dangerSurface,
            borderColor: colors.dangerBorder,
          }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-white mb-1">Delete Server</p>
              <p className="text-xs text-slate-400">
                Once deleted, this server cannot be recovered. All channels, messages, and data will be permanently lost.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="delete-confirm" className="text-xs text-slate-500">
                Type <span className="font-mono text-slate-300">{server.name}</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type server name..."
                className="obsidian-control text-sm"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderColor: deleteConfirmText === server.name ? colors.danger : colors.borderGlass,
                }}
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={deleteConfirmText !== server.name || deleting}
              className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: colors.danger,
                color: '#fff',
              }}
            >
              {deleting ? 'Deleting...' : 'Delete Server'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
