import * as cheerio from 'cheerio';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BTOWBot/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const getMeta = (names: string[]): string | null => {
      for (const name of names) {
        const val =
          $(`meta[property="${name}"]`).attr('content') ??
          $(`meta[name="${name}"]`).attr('content');
        if (val) return val;
      }
      return null;
    };

    return {
      url,
      title: getMeta(['og:title', 'twitter:title']) ?? ($('title').text().trim() || null),
      description: getMeta(['og:description', 'twitter:description', 'description']),
      image_url: getMeta(['og:image', 'twitter:image']),
      site_name: getMeta(['og:site_name']),
    };
  } catch {
    return null;
  }
}
