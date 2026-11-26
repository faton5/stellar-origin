import type { KeyboardEvent } from 'react';
import type { BodyName, PlanetPosition } from './SolarSystem';
import styles from './SolarSystem.module.css';

export const PLANET_NAMES = [
  'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
] as const;

export const ORBIT_AU: Record<PlanetPosition['name'], number> = {
  Mercury: 0.387, Venus: 0.723, Earth: 1, Mars: 1.524,
  Jupiter: 5.203, Saturn: 9.537, Uranus: 19.191, Neptune: 30.07,
};

export const PLANET_COLORS: Record<PlanetPosition['name'], string> = {
  Mercury: '#b9aca0', Venus: '#e4bc85', Earth: '#6fb6dc', Mars: '#d17b63',
  Jupiter: '#d8ac88', Saturn: '#e8d0a4', Uranus: '#95d5d4', Neptune: '#7b9ee8',
};

export const PLANET_RADII: Record<PlanetPosition['name'], number> = {
  Mercury: 0.15, Venus: 0.23, Earth: 0.26, Mars: 0.2,
  Jupiter: 0.53, Saturn: 0.46, Uranus: 0.35, Neptune: 0.34,
};

export function bodyLabel(name: BodyName, lang: 'en' | 'fr'): string {
  if (lang === 'en') return name;
  const french: Record<BodyName, string> = {
    Sun: 'Soleil', Mercury: 'Mercure', Venus: 'Vénus', Earth: 'Terre',
    Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturne', Uranus: 'Uranus', Neptune: 'Neptune',
  };
  return french[name];
}

/** Visual compression only: the underlying heliocentric vectors remain astronomical AU. */
export function displayRadius(au: number): number {
  return 2.1 + 3.8 * Math.log1p(Math.max(0, au));
}

/** Astronomy Engine HelioVector uses equatorial J2000 coordinates. */
export function displayPosition(planet: PlanetPosition): [number, number, number] {
  const obliquity = 23.4392911 * Math.PI / 180;
  const eclipticY = planet.yAu * Math.cos(obliquity) + planet.zAu * Math.sin(obliquity);
  const eclipticZ = -planet.yAu * Math.sin(obliquity) + planet.zAu * Math.cos(obliquity);
  const distance = Math.hypot(planet.xAu, eclipticY, eclipticZ);
  const scale = distance > 0 ? displayRadius(planet.distanceAu) / distance : 0;
  return [planet.xAu * scale, eclipticZ * scale, -eclipticY * scale];
}

type Props = {
  positions: PlanetPosition[];
  comparisonPositions?: PlanetPosition[];
  selected: BodyName;
  onSelect: (name: BodyName) => void;
  lang: 'en' | 'fr';
};

const SCALE = 25;

export default function SolarSystem2D({ positions, comparisonPositions, selected, onSelect, lang }: Props) {
  const byName = new Map(positions.map((planet) => [planet.name, planet]));
  const comparisonByName = new Map(comparisonPositions?.map((planet) => [planet.name, planet]) ?? []);
  const selectedLabel = lang === 'fr' ? 'Sélectionner' : 'Select';

  function selectOnKey(event: KeyboardEvent<SVGGElement>, name: BodyName) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(name);
    }
  }

  return (
    <svg className={styles.map} viewBox="-430 -430 860 860" role="group" aria-label={lang === 'fr' ? 'Carte interactive du Système solaire, vue du dessus' : 'Interactive overhead map of the Solar System'}>
      <defs>
        <radialGradient id="solarSunGlow"><stop stopColor="#f7d590" stopOpacity=".45" /><stop offset="1" stopColor="#f7d590" stopOpacity="0" /></radialGradient>
        <radialGradient id="solarSun"><stop stopColor="#fff5c8" /><stop offset=".52" stopColor="#f6c971" /><stop offset="1" stopColor="#d98147" /></radialGradient>
      </defs>
      <circle r="65" fill="url(#solarSunGlow)" />
      {PLANET_NAMES.map((name) => (
        <circle key={name} r={displayRadius(ORBIT_AU[name]) * SCALE} fill="none" stroke="#4d6785" strokeOpacity=".48" strokeWidth="1" />
      ))}
      <g className={styles.mapPlanet} role="button" tabIndex={0} aria-label={`${selectedLabel} ${bodyLabel('Sun', lang)}`} aria-pressed={selected === 'Sun'} onClick={() => onSelect('Sun')} onKeyDown={(event) => selectOnKey(event, 'Sun')}>
        <circle r="35" fill="transparent" />
        {selected === 'Sun' && <circle r="28" fill="none" stroke="#f8e8be" strokeWidth="1.3" />}
        <circle r="18" fill="url(#solarSun)" />
      </g>
      <circle r="24" fill="none" stroke="#e7ad63" strokeOpacity=".3" />
      {PLANET_NAMES.map((name) => {
        const planet = byName.get(name);
        if (!planet) return null;
        const [x, , z] = displayPosition(planet);
        const px = x * SCALE;
        const py = z * SCALE;
        const radius = Math.max(5.5, PLANET_RADII[name] * 17);
        const comparison = comparisonByName.get(name);
        const [cx, , cz] = comparison ? displayPosition(comparison) : [0, 0, 0];
        return (
          <g key={name}>
            {comparison && (
              <g aria-hidden="true" opacity=".45">
                <line x1={px} y1={py} x2={cx * SCALE} y2={cz * SCALE} stroke={PLANET_COLORS[name]} strokeDasharray="3 5" />
                <circle cx={cx * SCALE} cy={cz * SCALE} r={radius + 1} fill="none" stroke={PLANET_COLORS[name]} strokeDasharray="2 3" />
              </g>
            )}
            <g
              className={styles.mapPlanet}
              role="button"
              tabIndex={0}
              aria-label={`${selectedLabel} ${bodyLabel(name, lang)}`}
              aria-pressed={selected === name}
              onClick={() => onSelect(name)}
              onKeyDown={(event) => selectOnKey(event, name)}
            >
              <circle cx={px} cy={py} r="19" fill="transparent" />
              {selected === name && <circle cx={px} cy={py} r={radius + 8} fill="none" stroke="#f8e8be" strokeWidth="1.3" />}
              {name === 'Saturn' && <ellipse cx={px} cy={py} rx={radius + 9} ry={radius + 3} transform={`rotate(-24 ${px} ${py})`} fill="none" stroke="#d6bf9c" strokeWidth="3" opacity=".65" />}
              <circle cx={px} cy={py} r={radius} fill={PLANET_COLORS[name]} stroke="#fff8e0" strokeOpacity=".3" strokeWidth="1" />
              <text x={px} y={py - radius - 9} textAnchor="middle" className={styles.mapLabel}>{bodyLabel(name, lang)}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
