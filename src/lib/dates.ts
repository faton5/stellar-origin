/** Interpret a calendar date at a fixed 12:00 UTC reference instant. */
export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export const APOD_ARCHIVE_START = '1995-06-16';
const DAY_MS = 86_400_000;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The current date in UTC, matching the astronomy reference convention. */
export function todayIsoDate(now = new Date()): string {
  return toIsoDate(now);
}

export function getBirthDateError(
  value: string,
  now = new Date(),
): 'invalid' | 'future' | null {
  if (!parseIsoDate(value)) return 'invalid';
  return value > todayIsoDate(now) ? 'future' : null;
}

export function isApodArchiveDate(value: string, now = new Date()): boolean {
  return parseIsoDate(value) !== null &&
    value >= APOD_ARCHIVE_START &&
    value <= todayIsoDate(now);
}

/**
 * APOD-eligible birthday anniversaries through the current UTC date.
 * February 29 anniversaries fall on February 28 in nonleap years.
 */
export function getApodBirthdayTimeline(birthIso: string, now = new Date()): string[] {
  const birthDate = parseIsoDate(birthIso);
  if (!birthDate || getBirthDateError(birthIso, now)) {
    throw new RangeError('Birth date must be a real date on or before today');
  }

  const today = todayIsoDate(now);
  const startYear = Math.max(birthDate.getUTCFullYear(), 1995);
  const endYear = Number(today.slice(0, 4));
  const monthDay = birthIso.slice(5);
  const dates: string[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const yearText = String(year).padStart(4, '0');
    const anniversary = monthDay === '02-29' && !parseIsoDate(`${yearText}-02-29`)
      ? `${yearText}-02-28`
      : `${yearText}-${monthDay}`;
    if (anniversary >= APOD_ARCHIVE_START && anniversary <= today) {
      dates.push(anniversary);
    }
  }

  return dates;
}

/** Uniformly choose one date from the inclusive APOD archive interval. */
export function randomArchiveDate(now = new Date(), random = Math.random): string {
  const today = todayIsoDate(now);
  if (today < APOD_ARCHIVE_START) {
    throw new RangeError('APOD archive has not started');
  }
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('Random sample must be in [0, 1)');
  }

  const start = parseIsoDate(APOD_ARCHIVE_START)!;
  const end = parseIsoDate(today)!;
  const dayCount = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  return toIsoDate(new Date(start.getTime() + Math.floor(sample * dayCount) * DAY_MS));
}
