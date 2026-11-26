import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApod } from './apod';

const imagePayload = {
  date: '2024-01-01',
  post_id: 123,
  title: 'The First Sky of 2024',
  permalink: 'https://science.nasa.gov/universe/the-first-sky-of-2024/',
  media_type: 'image',
  explanation: '<p>A <strong>bright</strong> sky. <a href="https://science.nasa.gov/more">Read more</a></p>',
  credit: '<em>NASA</em>',
  copyright: '<span>Example observer</span>',
  alt: 'A bright sky',
  url: 'https://science.nasa.gov/universe/the-first-sky-of-2024/',
  hdurl: 'https://science.nasa.gov/wp-content/uploads/2024/01/sky.jpg',
  basic_html: '<html><body>NASA article content</body></html>',
  basic_html_url: 'https://science.nasa.gov/wp-json/wp/v2/apod-basic/240101/html',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchApod', () => {
  it('uses the exact NASA date route and maps the English image record', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(imagePayload));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchApod('2024-01-01', new Date('2026-11-26T12:00:00Z'));

    expect(result).toEqual({
      status: 'ok',
      apod: {
        date: '2024-01-01',
        title: 'The First Sky of 2024',
        explanationHtml: '<p>A <strong>bright</strong> sky. <a href="https://science.nasa.gov/more" target="_blank" rel="noopener noreferrer">Read more</a></p>',
        creditHtml: '<em>NASA</em>',
        copyrightHtml: '<span>Example observer</span>',
        alt: 'A bright sky',
        mediaType: 'image',
        articleUrl: 'https://science.nasa.gov/universe/the-first-sky-of-2024/',
        imageUrl: 'https://science.nasa.gov/wp-content/uploads/2024/01/sky.jpg',
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://science.nasa.gov/wp-json/wp/v2/apod-basic/240101',
      expect.objectContaining({ cache: 'force-cache', next: { revalidate: 86400 }, signal: expect.any(AbortSignal) }),
    );
    expect(JSON.stringify(result)).not.toContain('basic_html');
  });

  it('rejects a valid NASA record for a different day', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...imagePayload, date: '2024-01-02' })));

    expect(await fetchApod('2024-01-01')).toMatchObject({ status: 'unavailable' });
  });

  it('rejects an incomplete NASA record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...imagePayload, title: undefined })));

    expect(await fetchApod('2024-01-01')).toMatchObject({ status: 'unavailable' });
  });

  it('rejects an unsafe article or image URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ ...imagePayload, permalink: 'https://science.nasa.gov.evil.example/post' }))
      .mockResolvedValueOnce(Response.json({ ...imagePayload, hdurl: 'http://science.nasa.gov/sky.jpg' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchApod('2024-01-01')).toMatchObject({ status: 'unavailable' });
    expect(await fetchApod('2024-01-01')).toMatchObject({ status: 'unavailable' });
  });

  it('rejects a local image destination even when it uses HTTPS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...imagePayload, hdurl: 'https://127.0.0.1/private.jpg' })));

    expect(await fetchApod('2024-01-01')).toMatchObject({ status: 'unavailable' });
  });

  it('removes active HTML and unsafe links from NASA copy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...imagePayload,
      explanation: '<p onclick="steal()">Safe <img src="https://evil.example/x" onerror="steal()"><script>steal()</script><a href="javascript:steal()">bad</a> <a href="https://science.nasa.gov/learn">good</a></p>',
      credit: '<a href="http://evil.example">observer</a>',
    })));

    const result = await fetchApod('2024-01-01');

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.apod.explanationHtml).toContain('Safe');
    expect(result.apod.explanationHtml).toContain('href="https://science.nasa.gov/learn"');
    expect(result.apod.explanationHtml).not.toMatch(/onclick|onerror|<img|<script|javascript:|steal\(\)/);
    expect(result.apod.creditHtml).not.toContain('href=');
  });

  it('extracts an allowlisted iframe for a video APOD', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...imagePayload,
      media_type: 'video',
      hdurl: '',
      basic_html: '<html><iframe src="https://www.youtube-nocookie.com/embed/abc123" allowfullscreen></iframe></html>',
    })));

    const result = await fetchApod('2024-01-01');

    expect(result).toMatchObject({ status: 'ok', apod: { mediaType: 'video', videoUrl: 'https://www.youtube-nocookie.com/embed/abc123' } });
    if (result.status !== 'ok') return;
    expect(result.apod.imageUrl).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('<iframe');
  });

  it('uses the official article as fallback for an unsafe iframe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...imagePayload,
      media_type: 'iframe',
      hdurl: '',
      basic_html: '<iframe src="https://www.youtube.com.evil.example/embed/abc123"></iframe>',
    })));

    const result = await fetchApod('2024-01-01');

    expect(result).toMatchObject({ status: 'ok', apod: { mediaType: 'iframe', articleUrl: imagePayload.permalink } });
    if (result.status !== 'ok') return;
    expect(result.apod.videoUrl).toBeUndefined();
  });

  it('uses a NASA image from basic_html when hdurl is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...imagePayload,
      hdurl: '',
      basic_html: '<img src="https://science.nasa.gov/wp-content/uploads/2024/01/preview.jpg">',
    })));

    expect(await fetchApod('2024-01-01')).toMatchObject({
      status: 'ok',
      apod: { imageUrl: 'https://science.nasa.gov/wp-content/uploads/2024/01/preview.jpg' },
    });
  });

  it('keeps the official article when no safe image is available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...imagePayload,
      hdurl: '',
      basic_html: '<img src="https://evil.example/preview.jpg">',
    })));

    const result = await fetchApod('2024-01-01');

    expect(result).toMatchObject({ status: 'ok', apod: { articleUrl: imagePayload.permalink } });
    if (result.status !== 'ok') return;
    expect(result.apod.imageUrl).toBeUndefined();
  });

  it('reports an unpublished date without inventing an APOD', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    expect(await fetchApod('2024-01-01')).toEqual({
      status: 'unavailable',
      message: 'NASA has no published APOD for this date.',
    });
  });

  it('uses short-lived caching for the current day', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...imagePayload, date: '2026-11-26' }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchApod('2026-11-26', new Date('2026-11-26T23:59:00Z'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://science.nasa.gov/wp-json/wp/v2/apod-basic/261126',
      expect.objectContaining({ cache: 'force-cache', next: { revalidate: 300 } }),
    );
  });

  it('reports a fetch failure without exposing an upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('internal upstream detail')));

    expect(await fetchApod('2024-01-01')).toEqual({
      status: 'error',
      message: 'NASA APOD is temporarily unavailable.',
    });
  });
});
