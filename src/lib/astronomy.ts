import {
  Body,
  GeoMoon,
  HelioVector,
  Illumination,
  KM_PER_AU,
  MoonPhase,
  SearchMoonPhase,
} from 'astronomy-engine';
import { parseIsoDate, todayIsoDate, toIsoDate } from './dates';

const SYNODIC_MONTH_DAYS = 29.530588853;
const DAY_MS = 86_400_000;

/** NASA Planetary Fact Sheet, orbital period and mean Earth-Sun distance. */
export const NASA_PLANETARY_FACT_SHEET_URL = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/';
const EARTH_MEAN_SUN_DISTANCE_KM = 149_600_000;

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

const PHASE_NAMES: readonly MoonPhaseName[] = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];

export interface MoonDetails {
  referenceUtc: string;
  phaseName: MoonPhaseName;
  phaseAngleDegrees: number;
  illuminationFraction: number;
  distanceKm: number;
  ageDaysApprox: number;
  nextFullMoonUtc: string;
}

/** Geocentric lunar values at 12:00 UTC on the requested date. */
export function getMoonDetails(dateIso: string): MoonDetails {
  const date = requireDate(dateIso);
  const phaseAngleDegrees = MoonPhase(date);
  const illuminationFraction = Illumination(Body.Moon, date).phase_fraction;
  const distanceKm = GeoMoon(date).Length() * KM_PER_AU;
  const nextFullMoon = SearchMoonPhase(180, date, 40);
  if (!nextFullMoon) throw new Error('Could not find the next full moon');

  return {
    referenceUtc: date.toISOString(),
    phaseName: PHASE_NAMES[Math.floor((phaseAngleDegrees + 22.5) / 45) % 8],
    phaseAngleDegrees,
    illuminationFraction,
    distanceKm,
    // Elongation is not uniform in time, so this is only a phase-based estimate.
    ageDaysApprox: (phaseAngleDegrees / 360) * SYNODIC_MONTH_DAYS,
    nextFullMoonUtc: nextFullMoon.date.toISOString(),
  };
}

export type PlanetName =
  | 'Mercury' | 'Venus' | 'Earth' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune';

export interface PlanetPosition {
  name: PlanetName;
  xAu: number;
  yAu: number;
  zAu: number;
  distanceAu: number;
}

const PLANET_BODIES: readonly (readonly [PlanetName, Body])[] = [
  ['Mercury', Body.Mercury],
  ['Venus', Body.Venus],
  ['Earth', Body.Earth],
  ['Mars', Body.Mars],
  ['Jupiter', Body.Jupiter],
  ['Saturn', Body.Saturn],
  ['Uranus', Body.Uranus],
  ['Neptune', Body.Neptune],
];

/** Sun-centered J2000 equatorial positions in AU; scene scaling belongs to the UI. */
export function getPlanetPositions(dateIso: string): PlanetPosition[] {
  const date = requireDate(dateIso);
  return PLANET_BODIES.map(([name, body]) => {
    const vector = HelioVector(body, date);
    return {
      name,
      xAu: vector.x,
      yAu: vector.y,
      zAu: vector.z,
      distanceAu: vector.Length(),
    };
  });
}

export interface PlanetAge {
  name: PlanetName;
  periodDays: number;
  ageYears: number;
  orbitsCompleted: number;
  nextBirthdayDateApprox: string;
}

export interface CosmicAge {
  daysSinceBirth: number;
  earthOrbitDistanceKmApprox: number;
  planets: PlanetAge[];
}

/** NASA mean sidereal orbital periods, in Earth days. */
const ORBITAL_PERIOD_DAYS: Readonly<Record<PlanetName, number>> = {
  Mercury: 88.0,
  Venus: 224.7,
  Earth: 365.2,
  Mars: 687.0,
  Jupiter: 4331,
  Saturn: 10747,
  Uranus: 30589,
  Neptune: 59800,
};

/**
 * Pedagogical ages from fixed mean orbital periods, not tracked orbital returns.
 * Earth's traveled distance uses a circular orbit at NASA's mean Sun distance.
 */
export function getCosmicAge(birthIso: string, asOfIso = todayIsoDate()): CosmicAge {
  const birth = requireDate(birthIso);
  const asOf = requireDate(asOfIso);
  if (birth.getTime() > asOf.getTime()) {
    throw new RangeError('Birth date must be on or before the reference date');
  }

  const daysSinceBirth = (asOf.getTime() - birth.getTime()) / DAY_MS;
  const planets = PLANET_BODIES.map(([name]): PlanetAge => {
    const periodDays = ORBITAL_PERIOD_DAYS[name];
    const ageYears = daysSinceBirth / periodDays;
    const orbitsCompleted = Math.floor(ageYears);
    const nextBirthday = new Date(birth.getTime() + (orbitsCompleted + 1) * periodDays * DAY_MS);
    return {
      name,
      periodDays,
      ageYears,
      orbitsCompleted,
      nextBirthdayDateApprox: toIsoDate(nextBirthday),
    };
  });

  return {
    daysSinceBirth,
    earthOrbitDistanceKmApprox:
      (daysSinceBirth / ORBITAL_PERIOD_DAYS.Earth) * 2 * Math.PI * EARTH_MEAN_SUN_DISTANCE_KM,
    planets,
  };
}

function requireDate(value: string): Date {
  const date = parseIsoDate(value);
  if (!date) throw new RangeError(`Invalid ISO calendar date: ${value}`);
  return date;
}
