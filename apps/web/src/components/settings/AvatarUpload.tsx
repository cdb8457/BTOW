import { useRef, useState } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

interface AvatarUploadProps {
  currentUrl: string | null;
  displayName: string;
  onUpload: (url: string) => void;
}

export function AvatarUpload({ currentUrl, displayName, onUpload }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useFileUpload();

  const handleFile = async (file: File) => {
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const uploaded = await upload(file);
      onUpload(uploaded.file_url);
    } catch (err) {
      console.error('[AvatarUpload] upload failed:', err);
      setPreview(null);
    }
  };

  const initials = (displayName || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarSrc = preview ?? currentUrl;

  return (
    <div className="flex items-center gap-6">
      {/* Avatar preview */}
      <div className="relative group">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-lime-accent/50 transition-colors">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-violet-accent/20 flex items-center justify-center">
              <span className="text-2xl font-black text-violet-accent">{initials}</span>
            </div>
          )}

          {/* Upload overlay */}
          <div
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <span className="text-[10px] font-bold text-lime-accent">{progress}%</span>
            ) : (
              <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
            )}
          </div>
        </div>

        {/* Circular progress ring */}
        {uploading && (
          <svg
            className="absolute inset-0 w-20 h-20 -rotate-90 pointer-events-none"
            viewBox="0 0 80 80"
          >
            <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(217,249,157,0.2)" strokeWidth="2" />
            <circle
              cx="40"
              cy="40"
              r="38"
              fill="none"
              stroke="#d9f99d"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 38}`}
              strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
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
        >
          {uploading ? `Uploading ${progress}%` : 'Change Avatar'}
        </button>
        {(preview ?? currentUrl) && (
          <button
            onClick={() => {
              setPreview(null);
              onUpload('');
            }}
            className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">
          Max 25MB · JPG PNG GIF WEBP
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
