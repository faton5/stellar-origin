import { describe, expect, it } from 'vitest';
import {
  getBirthDateError,
  getApodBirthdayTimeline,
  isApodArchiveDate,
  parseIsoDate,
  randomArchiveDate,
  todayIsoDate,
  toIsoDate,
} from './dates';

describe('parseIsoDate', () => {
  it('treats a valid date-only value as 12:00 UTC', () => {
    expect(parseIsoDate('2024-02-29')?.toISOString()).toBe('2024-02-29T12:00:00.000Z');
  });

  it.each(['2023-02-29', '2024-04-31', '2024-2-9', '2024-02-29T00:00:00Z', ''])
    ('rejects a malformed or nonexistent calendar date: %s', (value) => {
      expect(parseIsoDate(value)).toBeNull();
    });
});

describe('APOD birthday timeline', () => {
  it('starts at the archive and stops before a future anniversary', () => {
    expect(getApodBirthdayTimeline('1992-06-15', new Date('1997-06-14T23:59:00Z')))
      .toEqual(['1996-06-15']);
  });

  it('uses February 28 for leap-day birthdays in nonleap years', () => {
    expect(getApodBirthdayTimeline('2000-02-29', new Date('2004-02-28T18:00:00Z')))
      .toEqual(['2000-02-29', '2001-02-28', '2002-02-28', '2003-02-28']);
  });

  it('includes an anniversary on the current UTC date', () => {
    expect(getApodBirthdayTimeline('1995-06-16', new Date('1995-06-16T00:01:00Z')))
      .toEqual(['1995-06-16']);
  });

  it('rejects a future birth date', () => {
    expect(() => getApodBirthdayTimeline('2025-01-01', new Date('2024-12-31T12:00:00Z')))
      .toThrow(RangeError);
  });
});

describe('randomArchiveDate', () => {
  const now = new Date('1995-06-18T13:00:00Z');

  it('can select both inclusive archive endpoints', () => {
    expect(randomArchiveDate(now, () => 0)).toBe('1995-06-16');
    expect(randomArchiveDate(now, () => 0.5)).toBe('1995-06-17');
    expect(randomArchiveDate(now, () => 0.999999)).toBe('1995-06-18');
  });

  it('rejects an RNG output outside the half-open unit interval', () => {
    expect(() => randomArchiveDate(now, () => 1)).toThrow(RangeError);
  });
});

describe('UTC date boundaries', () => {
  it('uses the UTC calendar day even when the input instant has an offset', () => {
    const instant = new Date('2024-06-01T01:00:00+14:00');
    expect(toIsoDate(instant)).toBe('2024-05-31');
    expect(todayIsoDate(instant)).toBe('2024-05-31');
  });

  it('rejects future birth dates according to the UTC calendar day', () => {
    const now = new Date('2024-01-02T00:30:00Z');
    expect(getBirthDateError('2024-01-03', now)).toBe('future');
    expect(getBirthDateError('2024-01-02', now)).toBeNull();
    expect(getBirthDateError('2024-02-30', now)).toBe('invalid');
  });

  it('accepts the first APOD archive day and excludes earlier and future days', () => {
    const now = new Date('2024-01-02T22:00:00Z');
    expect(isApodArchiveDate('1995-06-15', now)).toBe(false);
    expect(isApodArchiveDate('1995-06-16', now)).toBe(true);
    expect(isApodArchiveDate('2024-01-03', now)).toBe(false);
  });
});
