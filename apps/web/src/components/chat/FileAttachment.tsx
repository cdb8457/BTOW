import { useState } from 'react';

interface Attachment {
  id: string;
  filename: string;
  url: string;
  content_type: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1_048_576).toFixed(1)}MB`;
}

function getIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'videocam';
  if (contentType.startsWith('audio/')) return 'headphones';
  if (contentType === 'application/pdf') return 'picture_as_pdf';
  if (contentType.includes('zip') || contentType.includes('tar')) return 'folder_zip';
  if (contentType.startsWith('text/')) return 'description';
  return 'attach_file';
}

export function FileAttachment({ attachment }: { attachment: Attachment }) {
  const [lightbox, setLightbox] = useState(false);
  const isImage = attachment.content_type.startsWith('image/');
  const isVideo = attachment.content_type.startsWith('video/');

  if (isImage) {
    return (
      <>
        <div
          className="mt-2 rounded-xl overflow-hidden border border-white/10 hover:border-primary/30 transition-colors cursor-zoom-in w-full max-w-md group"
          onClick={() => setLightbox(true)}
        >
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full max-h-80 object-cover group-hover:brightness-110 transition-all"
            loading="lazy"
          />
          <div className="bg-black/40 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono truncate">
              {attachment.filename}
            </span>
            <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
              {formatSize(attachment.size)}
            </span>
          </div>
        </div>

        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                className="absolute -top-4 -right-4 w-8 h-8 rounded-full glass-slab flex items-center justify-center text-slate-400 hover:text-white"
                onClick={() => setLightbox(false)}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
              <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-between px-2">
                <span className="text-xs text-slate-400 font-mono">{attachment.filename}</span>
                <a
                  href={attachment.url}
                  download={attachment.filename}
                  className="text-[10px] text-lime-accent font-bold uppercase tracking-widest flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download
                </a>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/10 w-full max-w-md">
        <video
          src={attachment.url}
          controls
          className="w-full max-h-72"
          preload="metadata"
        />
        <div className="bg-black/40 px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono truncate">
            {attachment.filename}
          </span>
          <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
            {formatSize(attachment.size)}
          </span>
        </div>
      </div>
    );
  }

  // Generic file download card
  return (
    <a
      href={attachment.url}
      download={attachment.filename}
      className="mt-2 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-accent/10 border border-violet-accent/30 hover:bg-violet-accent/20 hover:border-violet-accent/50 transition-all group max-w-xs"
    >
      <span className="material-symbols-outlined text-sm text-violet-accent shrink-0">
        {getIcon(attachment.content_type)}
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-violet-accent tracking-tight truncate uppercase">
          {attachment.filename}
        </span>
        <span className="text-[10px] text-slate-500">{formatSize(attachment.size)}</span>
      </div>
      <span className="material-symbols-outlined text-xs text-slate-500 group-hover:text-white transition-colors shrink-0 ml-auto">
        download
      </span>
    </a>
  );
}
