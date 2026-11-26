import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/apod', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const nasaImage = {
  date: '2024-01-01',
  post_id: 123,
  title: 'A Real APOD',
  permalink: 'https://science.nasa.gov/universe/a-real-apod/',
  media_type: 'image',
  explanation: '<p>NASA explains the sky.</p>',
  credit: 'NASA',
  copyright: '',
  alt: 'Stars in the sky',
  url: 'https://science.nasa.gov/universe/a-real-apod/',
  hdurl: 'https://science.nasa.gov/wp-content/uploads/2024/01/stars.jpg',
  basic_html: '<html><script>unsafe()</script></html>',
};

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/apod', () => {
  it('returns only the validated APOD fields for a published date', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(nasaImage)));

    const response = await POST(request({ date: '2024-01-01' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      apod: {
        date: '2024-01-01',
        title: 'A Real APOD',
        explanationHtml: '<p>NASA explains the sky.</p>',
        articleUrl: nasaImage.permalink,
        imageUrl: nasaImage.hdurl,
      },
    });
    expect(JSON.stringify(body)).not.toContain('basic_html');
    expect(JSON.stringify(body)).not.toContain('unsafe()');
  });

  it('rejects an impossible calendar date before requesting NASA', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({ date: '2024-02-30' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: 'error' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a future date before requesting NASA', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({ date: '2999-01-01' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: 'error' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports dates before the NASA archive without requesting NASA', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({ date: '1995-06-15' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'before_archive', message: 'NASA APOD began on 1995-06-16.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const response = await POST(new Request('http://localhost/api/apod', { method: 'POST', body: '{bad' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: 'error' });
  });

  it('rejects extra request fields', async () => {
    const response = await POST(request({ date: '2024-01-01', ignored: 'extra' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: 'error' });
  });

  it('reports an unpublished date without returning a substitute APOD', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    const response = await POST(request({ date: '2024-01-01' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ status: 'unavailable', message: 'NASA has no published APOD for this date.' });
  });

  it('reports an upstream failure without exposing internal details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret upstream detail')));

    const response = await POST(request({ date: '2024-01-01' }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ status: 'error', message: 'NASA APOD is temporarily unavailable.' });
  });
});
