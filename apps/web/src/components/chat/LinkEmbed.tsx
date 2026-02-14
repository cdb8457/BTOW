interface LinkEmbedProps {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export function LinkEmbed({ url, title, description, image_url, site_name }: LinkEmbedProps) {
  if (!title && !description && !image_url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex gap-3 p-3 rounded-xl border border-violet-accent/20 bg-violet-accent/5 hover:bg-violet-accent/10 hover:border-violet-accent/40 transition-all max-w-md group"
    >
      <div className="w-0.5 self-stretch bg-violet-accent/60 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        {site_name && (
          <p className="text-[10px] text-violet-accent font-bold uppercase tracking-widest mb-1">
            {site_name}
          </p>
        )}
        {title && (
          <p className="text-sm font-semibold text-white group-hover:text-lime-accent transition-colors line-clamp-2 mb-1">
            {title}
          </p>
        )}
        {description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{description}</p>
        )}
      </div>
      {image_url && (
        <img
          src={image_url}
          alt={title ?? ''}
          className="w-20 h-16 object-cover rounded-lg shrink-0"
          loading="lazy"
        />
      )}
    </a>
  );
}
