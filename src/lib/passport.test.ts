import { describe, expect, it } from 'vitest';
import { buildPassportSpec, PASSPORT_FORMATS } from './passport';

const data = {
  dateIso: '2001-01-01',
  moonPhase: 'waxing crescent',
  earthYears: 25.1,
  marsYears: 13.3,
  apodTitle: 'Private APOD title',
  lang: 'en' as const
};

describe('Cosmic Passport privacy', () => {
  it.each(Object.keys(PASSPORT_FORMATS) as Array<keyof typeof PASSPORT_FORMATS>)(
    'omits personal date and correlating APOD title from %s when disabled', format => {
      const privateSpec = buildPassportSpec(format, data, false);
      const publicSpec = buildPassportSpec(format, data, true);
      expect(JSON.stringify(privateSpec)).not.toContain(data.dateIso);
      expect(JSON.stringify(privateSpec)).not.toContain(data.apodTitle);
      expect(JSON.stringify(publicSpec)).toContain(data.dateIso);
      expect(JSON.stringify(publicSpec)).toContain(data.apodTitle);
      expect(privateSpec.width).toBeGreaterThan(0);
      expect(privateSpec.height).toBeGreaterThan(0);
    }
  );
});
