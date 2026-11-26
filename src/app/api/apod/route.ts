import { z } from 'zod';
import { fetchApod, type ApodApiResponse } from '@/lib/apod';

const requestSchema = z.object({ date: z.iso.date() }).strict();
const FIRST_APOD_DATE = '1995-06-16';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: 'error', message: 'A valid JSON date is required.' } satisfies ApodApiResponse, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ status: 'error', message: 'A valid YYYY-MM-DD date is required.' } satisfies ApodApiResponse, { status: 400 });
  }

  const { date } = parsed.data;
  if (date > new Date().toISOString().slice(0, 10)) {
    return Response.json({ status: 'error', message: 'Future APOD dates are not available.' } satisfies ApodApiResponse, { status: 400 });
  }
  if (date < FIRST_APOD_DATE) {
    return Response.json({ status: 'before_archive', message: 'NASA APOD began on 1995-06-16.' } satisfies ApodApiResponse);
  }

  const result = await fetchApod(date);
  const status = result.status === 'ok' ? 200 : result.status === 'unavailable' ? 404 : 502;
  return Response.json(result, { status });
}
