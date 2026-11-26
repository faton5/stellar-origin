import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

const NASA_APOD_URL = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';

const nasaApodSchema = z.object({
  date: z.iso.date(),
  title: z.string().trim().min(1),
  permalink: z.url(),
  media_type: z.enum(['image', 'video', 'iframe']),
  explanation: z.string(),
  credit: z.string().nullish(),
  copyright: z.string().nullish(),
  alt: z.string().nullish(),
  hdurl: z.string().nullish(),
  basic_html: z.string().nullish(),
});

export type ApodRecord = {
  date: string;
  title: string;
  explanationHtml: string;
  creditHtml: string;
  copyrightHtml: string;
  alt: string;
  mediaType: 'image' | 'video' | 'iframe';
  articleUrl: string;
  imageUrl?: string;
  videoUrl?: string;
};

export type ApodFetchResult =
  | { status: 'ok'; apod: ApodRecord }
  | { status: 'unavailable' | 'error'; message: string };

export type ApodApiResponse = ApodFetchResult | { status: 'before_archive'; message: string };

function safeHttpsUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
      url.port ||
      !host.includes('.') ||
      host.startsWith('[') ||
      /^[\d.]+$/.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.localhost') ||
      host.endsWith('.internal')
    ) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function officialArticleUrl(value: string): string | undefined {
  const safe = safeHttpsUrl(value);
  if (!safe) return undefined;
  const hostname = new URL(safe).hostname;
  return hostname === 'science.nasa.gov' || hostname === 'apod.nasa.gov' ? safe : undefined;
}

function cleanHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ['a', 'p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'blockquote', 'sup', 'sub', 'span'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['https'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: { href: attributes.href, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  });
}

function mediaSources(html: string, tagName: 'img' | 'iframe'): string[] {
  const sources: string[] = [];
  sanitizeHtml(html, {
    allowedTags: [tagName],
    allowedAttributes: { [tagName]: ['src'] },
    transformTags: {
      [tagName]: (_tag, attributes) => {
        if (attributes.src) sources.push(attributes.src);
        return { tagName, attribs: {} };
      },
    },
  });
  return sources;
}

function nasaImageUrl(html: string): string | undefined {
  for (const source of mediaSources(html, 'img')) {
    const safe = safeHttpsUrl(source);
    if (!safe) continue;
    const host = new URL(safe).hostname;
    if (host === 'nasa.gov' || host.endsWith('.nasa.gov')) return safe;
  }
  return undefined;
}

function allowlistedVideoUrl(html: string): string | undefined {
  for (const source of mediaSources(html, 'iframe')) {
    const safe = safeHttpsUrl(source);
    if (!safe) continue;
    const url = new URL(safe);
    const isYoutube = ['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)
      && /^\/embed\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    const isVimeo = url.hostname === 'player.vimeo.com' && /^\/video\/\d+\/?$/.test(url.pathname);
    if (isYoutube || isVimeo) return `${url.origin}${url.pathname}`;
  }
  return undefined;
}

export async function fetchApod(date: string, now = new Date()): Promise<ApodFetchResult> {
  const dateCode = date.slice(2).replaceAll('-', '');
  let response: Response;
  try {
    response = await fetch(`${NASA_APOD_URL}/${dateCode}`, {
      cache: 'force-cache',
      next: { revalidate: date === now.toISOString().slice(0, 10) ? 300 : 86400 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { status: 'error', message: 'NASA APOD is temporarily unavailable.' };
  }

  if (response.status === 404) {
    return { status: 'unavailable', message: 'NASA has no published APOD for this date.' };
  }
  if (!response.ok) {
    return { status: 'error', message: 'NASA APOD is temporarily unavailable.' };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 'unavailable', message: 'NASA returned an invalid APOD for this date.' };
  }
  const parsed = nasaApodSchema.safeParse(payload);
  if (!parsed.success || parsed.data.date !== date) {
    return { status: 'unavailable', message: 'NASA returned an invalid APOD for this date.' };
  }
  const articleUrl = officialArticleUrl(parsed.data.permalink);
  const imageUrl = parsed.data.hdurl
    ? safeHttpsUrl(parsed.data.hdurl)
    : parsed.data.media_type === 'image' && parsed.data.basic_html
      ? nasaImageUrl(parsed.data.basic_html)
      : undefined;
  if (!articleUrl || (parsed.data.hdurl && !imageUrl)) {
    return { status: 'unavailable', message: 'NASA returned an invalid APOD for this date.' };
  }

  return {
    status: 'ok',
    apod: {
      date: parsed.data.date,
      title: parsed.data.title,
      explanationHtml: cleanHtml(parsed.data.explanation),
      creditHtml: cleanHtml(parsed.data.credit ?? ''),
      copyrightHtml: cleanHtml(parsed.data.copyright ?? ''),
      alt: parsed.data.alt ?? '',
      mediaType: parsed.data.media_type,
      articleUrl,
      ...(imageUrl ? { imageUrl } : {}),
      ...(parsed.data.media_type !== 'image' && parsed.data.basic_html
        ? { videoUrl: allowlistedVideoUrl(parsed.data.basic_html) }
        : {}),
    },
  };
}
