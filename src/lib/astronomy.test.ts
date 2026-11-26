import { describe, expect, it } from 'vitest';
import { getCosmicAge, getMoonDetails, getPlanetPositions } from './astronomy';

describe('getMoonDetails', () => {
  it('describes the April 8 2024 new moon at noon UTC and finds the next full moon', () => {
    const moon = getMoonDetails('2024-04-08');
    expect(moon.referenceUtc).toBe('2024-04-08T12:00:00.000Z');
    expect(moon.phaseName).toBe('New Moon');
    expect(moon.illuminationFraction).toBeGreaterThanOrEqual(0);
    expect(moon.illuminationFraction).toBeLessThan(0.05);
    expect(moon.distanceKm).toBeGreaterThan(300_000);
    expect(moon.distanceKm).toBeLessThan(450_000);
    expect(moon.nextFullMoonUtc.startsWith('2024-04-23')).toBe(true);
  });

  it('describes the March 25 2024 full moon', () => {
    const moon = getMoonDetails('2024-03-25');
    expect(moon.phaseName).toBe('Full Moon');
    expect(moon.illuminationFraction).toBeGreaterThan(0.95);
    expect(moon.ageDaysApprox).toBeGreaterThan(13);
    expect(moon.ageDaysApprox).toBeLessThan(16);
  });

  it('rejects an invalid date', () => {
    expect(() => getMoonDetails('2024-02-30')).toThrow(RangeError);
  });
});

describe('getCosmicAge', () => {
  it('uses elapsed UTC calendar days and NASA mean orbital periods', () => {
    const age = getCosmicAge('2000-01-01', '2001-01-01');
    expect(age.daysSinceBirth).toBe(366);
    expect(age.planets.map((planet) => planet.name)).toEqual([
      'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
    ]);
    const mercury = age.planets.find((planet) => planet.name === 'Mercury')!;
    expect(mercury.periodDays).toBe(88);
    expect(mercury.ageYears).toBeCloseTo(366 / 88, 8);
    expect(mercury.orbitsCompleted).toBe(4);
    expect(mercury.nextBirthdayDateApprox).toBe('2001-03-16');
    const earth = age.planets.find((planet) => planet.name === 'Earth')!;
    expect(earth.periodDays).toBe(365.2);
    expect(earth.ageYears).toBeCloseTo(366 / 365.2, 8);
    expect(age.earthOrbitDistanceKmApprox).toBeGreaterThan(930_000_000);
    expect(age.earthOrbitDistanceKmApprox).toBeLessThan(950_000_000);
  });

  it('reports zero elapsed orbits at birth and a future next birthday', () => {
    const age = getCosmicAge('2024-02-29', '2024-02-29');
    expect(age.daysSinceBirth).toBe(0);
    expect(age.earthOrbitDistanceKmApprox).toBe(0);
    expect(age.planets.every((planet) => planet.orbitsCompleted === 0)).toBe(true);
    expect(age.planets.every((planet) => planet.nextBirthdayDateApprox > '2024-02-29'))
      .toBe(true);
  });

  it('rejects future and invalid birth or reference dates', () => {
    expect(() => getCosmicAge('2024-03-01', '2024-02-29')).toThrow(RangeError);
    expect(() => getCosmicAge('2023-02-29', '2024-02-29')).toThrow(RangeError);
    expect(() => getCosmicAge('2024-02-29', '2024-02-30')).toThrow(RangeError);
  });
});

describe('getPlanetPositions', () => {
  it('returns finite Sun-centered AU vectors for all eight planets, including Earth', () => {
    const planets = getPlanetPositions('2024-04-08');
    expect(planets.map((planet) => planet.name)).toEqual([
      'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
    ]);
    for (const planet of planets) {
      expect(Number.isFinite(planet.xAu)).toBe(true);
      expect(Number.isFinite(planet.yAu)).toBe(true);
      expect(Number.isFinite(planet.zAu)).toBe(true);
      expect(Number.isFinite(planet.distanceAu)).toBe(true);
      expect(planet.distanceAu).toBeGreaterThan(0);
    }
    const earth = planets.find((planet) => planet.name === 'Earth')!;
    expect(earth.distanceAu).toBeGreaterThan(0.98);
    expect(earth.distanceAu).toBeLessThan(1.02);
  });

  it('changes positions when the date changes', () => {
    const april = getPlanetPositions('2024-04-08');
    const october = getPlanetPositions('2024-10-08');
    expect(april.find((planet) => planet.name === 'Earth')?.xAu)
      .not.toBe(october.find((planet) => planet.name === 'Earth')?.xAu);
  });

  it('rejects invalid dates', () => {
    expect(() => getPlanetPositions('2024-13-01')).toThrow(RangeError);
  });
});
