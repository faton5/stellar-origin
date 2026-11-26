'use client';

import { Component, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { PlanetPosition } from '@/lib/astronomy';
import SolarSystem2D, { bodyLabel, PLANET_COLORS, PLANET_NAMES } from './SolarSystem2D';
import styles from './SolarSystem.module.css';

export type { PlanetPosition } from '@/lib/astronomy';

export type BodyName = PlanetPosition['name'] | 'Sun';

export type SolarSystemProps = {
  positions: PlanetPosition[];
  dateIso: string;
  lang: 'en' | 'fr';
  /** Optional reference positions, usually for the current date. */
  comparisonPositions?: PlanetPosition[];
  comparisonDateIso?: string;
  /** Offset from the current date in whole days. Enables the built-in date slider. */
  daysOffset?: number;
  onDaysOffsetChange?: (days: number) => void;
};

const SolarSystemScene = dynamic(() => import('./SolarSystemScene'), {
  ssr: false,
  loading: () => <div className={styles.loading} aria-hidden="true" />,
});

const BODY_INFO: Record<BodyName, { kind: { en: string; fr: string }; fact: { en: string; fr: string } }> = {
  Sun: {
    kind: { en: 'Star', fr: 'Étoile' },
    fact: { en: 'The Sun holds nearly all the Solar System’s mass and powers it with nuclear fusion.', fr: 'Le Soleil concentre presque toute la masse du Système solaire et rayonne grâce à la fusion nucléaire.' },
  },
  Mercury: {
    kind: { en: 'Rocky planet', fr: 'Planète rocheuse' },
    fact: { en: 'The closest planet to the Sun completes an orbit in about 88 Earth days.', fr: 'La planète la plus proche du Soleil accomplit une orbite en environ 88 jours terrestres.' },
  },
  Venus: {
    kind: { en: 'Rocky planet', fr: 'Planète rocheuse' },
    fact: { en: 'A dense carbon dioxide atmosphere makes Venus the hottest planet.', fr: 'Sa dense atmosphère de dioxyde de carbone fait de Vénus la planète la plus chaude.' },
  },
  Earth: {
    kind: { en: 'Rocky planet', fr: 'Planète rocheuse' },
    fact: { en: 'Earth is the only world where life is currently known to exist.', fr: 'La Terre est le seul monde où l’existence de la vie est actuellement confirmée.' },
  },
  Mars: {
    kind: { en: 'Rocky planet', fr: 'Planète rocheuse' },
    fact: { en: 'Mars has a thin atmosphere and evidence of ancient liquid water at its surface.', fr: 'Mars possède une atmosphère ténue et des traces d’eau liquide ancienne à sa surface.' },
  },
  Jupiter: {
    kind: { en: 'Gas giant', fr: 'Géante gazeuse' },
    fact: { en: 'Jupiter is the largest planet; its Great Red Spot is a vast, long-lived storm.', fr: 'Jupiter est la plus grande planète ; sa Grande Tache rouge est une immense tempête durable.' },
  },
  Saturn: {
    kind: { en: 'Gas giant', fr: 'Géante gazeuse' },
    fact: { en: 'Saturn’s bright rings are made chiefly of icy particles with some rocky material.', fr: 'Les anneaux lumineux de Saturne sont surtout constitués de particules de glace et de roche.' },
  },
  Uranus: {
    kind: { en: 'Ice giant', fr: 'Géante de glace' },
    fact: { en: 'Uranus rotates almost on its side, with an axial tilt of about 98 degrees.', fr: 'Uranus tourne presque couchée, avec un axe incliné d’environ 98 degrés.' },
  },
  Neptune: {
    kind: { en: 'Ice giant', fr: 'Géante de glace' },
    fact: { en: 'Neptune is the most distant planet and has exceptionally fast winds.', fr: 'Neptune est la planète la plus éloignée et connaît des vents exceptionnellement rapides.' },
  },
};

class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function formatDate(value: string, lang: 'en' | 'fr') {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

function offsetLabel(days: number, lang: 'en' | 'fr') {
  if (days === 0) return lang === 'fr' ? 'Date choisie' : 'Selected date';
  const sign = days > 0 ? '+' : '−';
  return `${sign}${Math.abs(days)} ${lang === 'fr' ? 'j' : 'd'}`;
}

export default function SolarSystem({
  positions, dateIso, lang, comparisonPositions, comparisonDateIso, daysOffset, onDaysOffsetChange,
}: SolarSystemProps) {
  const [selected, setSelected] = useState<BodyName>('Earth');
  const [view, setView] = useState<'perspective' | 'overhead'>('perspective');
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [active, setActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compare, setCompare] = useState(false);
  const sliderId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const positionByName = useMemo(() => new Map(positions.map((planet) => [planet.name, planet])), [positions]);
  const availableBodies = useMemo<BodyName[]>(() => ['Sun', ...PLANET_NAMES.filter((name) => positionByName.has(name))], [positionByName]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const canvas = document.createElement('canvas');
      let supported = false;
      try { supported = Boolean(canvas.getContext('webgl2')); } catch { supported = false; }
      setWebgl(supported);
      if (!supported) setView('overhead');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let inView = true;
    const update = () => setActive(inView && document.visibilityState === 'visible');
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      update();
    }, { threshold: 0.05 });
    observer?.observe(stage);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === 'undefined') {
      setSceneReady(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSceneReady(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px 0px' });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const onContextLost = useCallback(() => {
    setWebgl(false);
    setView('overhead');
  }, []);

  const compareAvailable = Boolean(comparisonPositions?.length) && (!comparisonDateIso || dateIso.slice(0, 10) !== comparisonDateIso.slice(0, 10));
  const visibleComparison = compare && compareAvailable ? comparisonPositions : undefined;
  const selectedPosition = selected === 'Sun' ? undefined : positionByName.get(selected);
  const fmtAu = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const fallback = <SolarSystem2D positions={positions} comparisonPositions={visibleComparison} selected={selected} onSelect={setSelected} lang={lang} />;

  function onViewerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const index = availableBodies.indexOf(selected);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    setSelected(availableBodies[(index + delta + availableBodies.length) % availableBodies.length]);
  }

  return (
    <section className={styles.shell} aria-label={lang === 'fr' ? 'Explorateur du Système solaire' : 'Solar System explorer'} tabIndex={0} onKeyDown={onViewerKeyDown}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{lang === 'fr' ? 'ATLAS ORBITAL / 01' : 'ORBITAL ATLAS / 01'}</p>
          <p className={styles.title}>{lang === 'fr' ? 'Positions planétaires' : 'Planetary positions'}</p>
          <p className={styles.date}>{formatDate(dateIso, lang)} <span>· 12:00 UTC</span></p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.segment} role="group" aria-label={lang === 'fr' ? 'Angle de vue' : 'View angle'}>
            <button type="button" className={view === 'perspective' ? styles.segmentActive : ''} aria-pressed={view === 'perspective'} disabled={webgl === false} onClick={() => setView('perspective')}>{lang === 'fr' ? 'Perspective' : 'Perspective'}</button>
            <button type="button" className={view === 'overhead' ? styles.segmentActive : ''} aria-pressed={view === 'overhead'} onClick={() => setView('overhead')}>{lang === 'fr' ? 'Du dessus' : 'Overhead'}</button>
          </div>
          {compareAvailable && (
            <button type="button" className={`${styles.compareButton} ${compare ? styles.compareActive : ''}`} aria-pressed={compare} onClick={() => setCompare((value) => !value)}>
              <span className={styles.compareIcon} aria-hidden="true" />
              {lang === 'fr' ? 'Comparer' : 'Compare'}
            </button>
          )}
        </div>
      </div>

      {typeof daysOffset === 'number' && onDaysOffsetChange && (
        <div className={styles.timeline}>
          <label htmlFor={sliderId} className={styles.timelineLabel}>{lang === 'fr' ? 'Voyage dans le temps' : 'Time travel'} <strong>{offsetLabel(daysOffset, lang)}</strong></label>
          <input id={sliderId} type="range" min={-365} max={365} step={1} value={Math.max(-365, Math.min(365, daysOffset))} onChange={(event) => onDaysOffsetChange(Number(event.target.value))} aria-label={lang === 'fr' ? 'Décalage en jours depuis la date choisie' : 'Days from selected date'} aria-valuetext={offsetLabel(daysOffset, lang)} />
          <button type="button" className={styles.resetButton} onClick={() => onDaysOffsetChange(0)} disabled={daysOffset === 0}>{lang === 'fr' ? 'Réinitialiser' : 'Reset'}</button>
        </div>
      )}

      <div className={styles.stage} ref={stageRef}>
        <div className={styles.stageBackdrop} aria-hidden="true" />
        {webgl && sceneReady ? (
          <SceneErrorBoundary fallback={fallback}>
            <SolarSystemScene positions={positions} comparisonPositions={visibleComparison} selected={selected} onSelect={setSelected} lang={lang} view={view} active={active} reducedMotion={reducedMotion} onContextLost={onContextLost} />
          </SceneErrorBoundary>
        ) : fallback}
        {webgl === false && <span className={styles.modeBadge}>{lang === 'fr' ? 'CARTE 2D' : '2D MAP'}</span>}
        <div className={styles.stageHint}>{webgl && sceneReady ? (view === 'overhead' ? (lang === 'fr' ? 'Maj + glisser pour déplacer · défiler pour zoomer' : 'Shift + drag to pan · scroll to zoom') : (lang === 'fr' ? 'Glisser pour tourner · défiler pour zoomer · Maj + glisser pour déplacer' : 'Drag to rotate · scroll to zoom · shift + drag to pan')) : (lang === 'fr' ? 'Sélectionnez un astre sur la carte' : 'Select a body on the map')}</div>
        <div className={styles.info} aria-live="polite">
          <span className={styles.infoIndex}>{String(availableBodies.indexOf(selected)).padStart(2, '0')} / 08</span>
          <h3>{bodyLabel(selected, lang)}</h3>
          <p className={styles.infoKind}>{BODY_INFO[selected].kind[lang]}</p>
          <p className={styles.infoFact}>{BODY_INFO[selected].fact[lang]}</p>
          {selectedPosition && <p className={styles.infoDistance}><strong>{fmtAu.format(selectedPosition.distanceAu)} AU</strong><span>{lang === 'fr' ? 'du Soleil à la date choisie' : 'from the Sun on the chosen date'}</span></p>}
        </div>
      </div>

      <div className={styles.bodyRail} role="group" aria-label={lang === 'fr' ? 'Choisir un astre' : 'Choose a celestial body'}>
        {availableBodies.map((name) => (
          <button key={name} type="button" aria-pressed={selected === name} className={`${styles.bodyButton} ${selected === name ? styles.bodyButtonActive : ''}`} onClick={() => setSelected(name)}>
            <span className={styles.bodyDot} style={{ background: name === 'Sun' ? '#f4c675' : PLANET_COLORS[name] }} aria-hidden="true" />
            {bodyLabel(name, lang)}
          </button>
        ))}
      </div>
      <div className={styles.footer}>
        <p>{lang === 'fr' ? 'Positions astronomiques à 12:00 UTC. Orbites circulaires schématiques, distances et tailles rééchelonnées pour la lisibilité.' : 'Astronomical positions at 12:00 UTC. Circular orbit guides, distances and body sizes rescaled for legibility.'}</p>
        <p>{lang === 'fr' ? 'Flèches ← → : choisir un astre' : '← → keys: select a body'}</p>
        {compare && compareAvailable && <p>{lang === 'fr' ? 'Contours : ' : 'Outlines: '}{comparisonDateIso ? formatDate(comparisonDateIso, lang) : (lang === 'fr' ? 'date de référence' : 'reference date')}</p>}
      </div>
    </section>
  );
}
