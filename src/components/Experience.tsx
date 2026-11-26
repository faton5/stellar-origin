'use client';

/* NASA APOD media is intentionally loaded directly from its origin, without image proxying. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, ExternalLink, Maximize2, Minus, Plus, Share2, X } from 'lucide-react';
import { getCosmicAge, getMoonDetails, getPlanetPositions, type MoonDetails, type PlanetPosition } from '@/lib/astronomy';
import { getApodBirthdayTimeline, getBirthDateError, parseIsoDate, randomArchiveDate, todayIsoDate, toIsoDate } from '@/lib/dates';
import { buildPassportSpec, PASSPORT_FORMATS, passportBlob, type PassportFormat } from '@/lib/passport';
import { copy, type Lang } from '@/lib/i18n';
import SolarSystem from './SolarSystem';

type ApodRecord = {
  date: string; title: string; explanationHtml: string; creditHtml: string; copyrightHtml: string;
  alt: string; mediaType: 'image' | 'video' | 'iframe'; articleUrl: string; imageUrl?: string; videoUrl?: string;
};
type ApodResult = { status: 'ok'; apod: ApodRecord } | { status: 'before_archive' | 'unavailable' | 'error'; message?: string };
type ApodState = { status: 'idle' | 'loading' | 'ok' | 'before_archive' | 'unavailable' | 'error'; apod?: ApodRecord };

const apodCache = new Map<string, ApodResult>();
const apodPending = new Map<string, Promise<ApodResult>>();

async function fetchApod(date: string): Promise<ApodResult> {
  const cached = apodCache.get(date);
  if (cached) return cached;
  const pending = apodPending.get(date);
  if (pending) return pending;
  const request = fetch('/api/apod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  }).then(async response => {
    const body = await response.json() as ApodResult;
    if (!body || !['ok', 'before_archive', 'unavailable', 'error'].includes(body.status)) throw new Error('Invalid APOD response');
    if (body.status !== 'error') apodCache.set(date, body);
    return body;
  }).finally(() => { apodPending.delete(date); });
  apodPending.set(date, request);
  return request;
}

function useApod(date: string, active: boolean): ApodState {
  const [last, setLast] = useState<{ date: string; result: ApodResult } | null>(null);
  useEffect(() => {
    if (!active || !date) return;
    let live = true;
    fetchApod(date).then(result => {
      if (!live) return;
      setLast({ date, result });
    }).catch(() => { if (live) setLast({ date, result: { status: 'error', message: 'Network error' } }); });
    return () => { live = false; };
  }, [date, active]);
  if (!active || !date) return { status: 'idle' };
  const result = apodCache.get(date) ?? (last?.date === date ? last.result : null);
  if (!result) return { status: 'loading' };
  return result.status === 'ok' ? { status: 'ok', apod: result.apod } : { status: result.status };
}

function displayDate(iso: string, lang: Lang, options?: Intl.DateTimeFormatOptions): string {
  const date = parseIsoDate(iso);
  return date ? new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', options ?? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date) : iso;
}

function formatNumber(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

const phaseFr: Record<string, string> = {
  'New Moon': 'Nouvelle Lune', 'Waxing Crescent': 'Premier croissant', 'First Quarter': 'Premier quartier',
  'Waxing Gibbous': 'Gibbeuse croissante', 'Full Moon': 'Pleine Lune', 'Waning Gibbous': 'Gibbeuse décroissante',
  'Last Quarter': 'Dernier quartier', 'Waning Crescent': 'Dernier croissant'
};
function phaseName(name: string, lang: Lang): string { return lang === 'fr' ? (phaseFr[name] ?? name) : name; }

function OriginMark({ small = false }: { small?: boolean }) {
  return <span className={`origin-mark ${small ? 'origin-mark-small' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <ellipse cx="24" cy="24" rx="22" ry="8" transform="rotate(-27 24 24)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M24 18v12M18 24h12" stroke="currentColor" strokeWidth="1.6" /><circle cx="24" cy="24" r="2.2" fill="currentColor" />
    </svg>
  </span>;
}

function Starfield({ motionOff }: { motionOff: boolean }) {
  const stars = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    left: `${(i * 61.37) % 100}%`, top: `${(i * i * 19.23 + i * 7.13) % 100}%`,
    width: i % 13 === 0 ? 2 : 1, opacity: i % 8 === 0 ? 0.9 : 0.36,
    animationDelay: `${(i % 17) * -0.4}s`
  })), []);
  return <div className={`starfield ${motionOff ? 'motion-off' : ''}`} aria-hidden="true">{stars.map((style, i) => <i key={i} style={style} />)}</div>;
}

function SectionHeading({ kicker, title, lead, id }: { kicker: string; title: string; lead: string; id?: string }) {
  return <div className="section-heading"><p className="eyebrow">{kicker}</p><h2 id={id}>{title}</h2><p className="section-lead">{lead}</p></div>;
}

function moonIlluminationPath(angle: number): string {
  const waxing = angle < 180;
  const k = waxing ? Math.cos(angle * Math.PI / 180) : -Math.cos(angle * Math.PI / 180);
  const limb: string[] = [], terminator: string[] = [];
  for (let y = -90; y <= 90; y += 3) {
    const edge = Math.sqrt(Math.max(0, 8100 - y * y));
    limb.push(`${(100 + (waxing ? edge : -edge)).toFixed(1)},${100 + y}`);
  }
  for (let y = 90; y >= -90; y -= 3) {
    const edge = Math.sqrt(Math.max(0, 8100 - y * y));
    terminator.push(`${(100 + k * edge).toFixed(1)},${100 + y}`);
  }
  return `M${limb.join(' L')} L${terminator.join(' L')} Z`;
}

function MoonGraphic({ moon, className = '' }: { moon: MoonDetails; className?: string }) {
  return <svg className={`moon-graphic ${className}`} viewBox="0 0 200 200" role="img" aria-label={`${moon.phaseName}, ${Math.round(moon.illuminationFraction * 100)}% illuminated`}>
    <defs>
      <radialGradient id="moon-shadow"><stop offset="0" stopColor="#303a4b" /><stop offset="1" stopColor="#0c1423" /></radialGradient>
      <radialGradient id="moon-light" cx="35%" cy="30%"><stop offset="0" stopColor="#fff8e8" /><stop offset="0.56" stopColor="#c7d3df" /><stop offset="1" stopColor="#798da8" /></radialGradient>
      <clipPath id="moon-disc"><circle cx="100" cy="100" r="90" /></clipPath>
      <filter id="moon-glow"><feGaussianBlur stdDeviation="6" /></filter>
    </defs>
    <circle cx="100" cy="100" r="92" fill="#8caeff" opacity=".2" filter="url(#moon-glow)" />
    <circle cx="100" cy="100" r="90" fill="url(#moon-shadow)" stroke="#61718a" strokeWidth="1" />
    <g clipPath="url(#moon-disc)"><path d={moonIlluminationPath(moon.phaseAngleDegrees)} fill="url(#moon-light)" />
      <g opacity=".1" fill="#455368"><circle cx="60" cy="61" r="13" /><circle cx="112" cy="118" r="20" /><circle cx="140" cy="54" r="11" /><circle cx="54" cy="132" r="9" /></g>
    </g>
  </svg>;
}

function ApodSection({ state, date, lang, compact = false }: { state: ApodState; date: string; lang: Lang; compact?: boolean }) {
  const t = copy[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const apod = state.apod;
  const media = apod?.mediaType === 'image' && apod.imageUrl
    ? <img src={apod.imageUrl} alt={apod.alt || apod.title} loading={compact ? 'lazy' : 'eager'} />
    : apod?.videoUrl
      ? <iframe title={apod.title} src={apod.videoUrl} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : null;
  return <div className={`apod-section ${compact ? 'apod-compact' : ''}`}>
    {!compact && <div className="apod-heading"><p className="eyebrow">{t.apodEyebrow}</p><h2>{t.apodLead}</h2></div>}
    {state.status === 'loading' && <div className="apod-placeholder" role="status"><span className="apod-loading-orbit" />{t.apodLoading}<small>{displayDate(date, lang)}</small></div>}
    {state.status === 'before_archive' && <div className="apod-placeholder apod-before"><CalendarDays size={30} /><p>{t.apodBefore}</p></div>}
    {state.status === 'unavailable' && <div className="apod-placeholder" role="status"><p>{t.apodUnavailable}</p></div>}
    {state.status === 'error' && <div className="apod-placeholder" role="status"><p>{t.apodError}</p></div>}
    {state.status === 'ok' && apod && <>
      <div className="apod-frame">
        <div className="apod-media">{media ?? <div className="media-missing">{t.mediaMissing}</div>}</div>
        <div className="apod-frame-bottom"><span>APOD · {displayDate(apod.date, lang)}</span>{media && <button type="button" className="icon-button" onClick={() => dialog.current?.showModal()} aria-label={t.viewFullscreen}><Maximize2 size={19} /></button>}</div>
      </div>
      <div className="apod-text"><div><p className="eyebrow">{t.apodEyebrow}</p><h3>{apod.title}</h3><p className="apod-date">{displayDate(apod.date, lang)}</p>
        <a className="text-link" href={apod.articleUrl} target="_blank" rel="noopener noreferrer">{t.apodSource}<ExternalLink size={16} /></a></div>
        {!compact && <div><p className="apod-label">{t.apodOriginal}</p><div className="apod-prose" dangerouslySetInnerHTML={{ __html: apod.explanationHtml }} />
          {(apod.creditHtml || apod.copyrightHtml) && <><p className="apod-label credit-label">{t.apodCredits}</p><div className="apod-credits">
            {apod.creditHtml && <div dangerouslySetInnerHTML={{ __html: apod.creditHtml }} />}
            {apod.copyrightHtml && <div dangerouslySetInnerHTML={{ __html: apod.copyrightHtml }} />}
          </div></>}</div>}
      </div>
      <dialog ref={dialog} className="media-dialog" onClose={() => setZoomed(false)} aria-label={apod.title}>
        <button type="button" className="dialog-close" onClick={() => dialog.current?.close()} aria-label={t.close}><X size={22} /></button>
        {apod.imageUrl && apod.mediaType === 'image' ? <><img src={apod.imageUrl} alt={apod.alt || apod.title} className={zoomed ? 'zoomed' : ''} />
          <button type="button" className="dialog-zoom" onClick={() => setZoomed(!zoomed)}>{zoomed ? <Minus size={16} /> : <Plus size={16} />}{zoomed ? t.zoomOut : t.zoom}</button></>
          : apod.videoUrl && <iframe title={apod.title} src={apod.videoUrl} allowFullScreen />}
      </dialog>
    </>}
  </div>;
}

function MoonSection({ moon, date, lang }: { moon: MoonDetails; date: string; lang: Lang }) {
  const t = copy[lang];
  const hoursUntilFull = Math.max(0, Math.round((Date.parse(moon.nextFullMoonUtc) - parseIsoDate(date)!.getTime()) / 3_600_000));
  const fullMoonCountdown = `${lang === 'fr' ? 'dans' : 'in'} ${Math.floor(hoursUntilFull / 24)} ${lang === 'fr' ? 'j' : 'd'} ${hoursUntilFull % 24} h`;
  return <section className="content-section moon-section" aria-labelledby="moon-title"><div className="content-wrap">
    <SectionHeading kicker={t.moonKicker} title={t.moonTitle} lead={t.moonLead} id="moon-title" />
    <div className="moon-layout"><div className="moon-orbit-visual"><div className="moon-orbit-ring" /><MoonGraphic moon={moon} /><span className="orbit-date">{displayDate(date, lang)}</span></div>
      <div className="moon-data"><p className="moon-phase-name">{phaseName(moon.phaseName, lang)}</p>
        <div className="moon-primary"><strong>{formatNumber(moon.illuminationFraction * 100, lang, 1)}<small>%</small></strong><span>{t.illuminated}</span></div>
        <div className="data-rows"><div><span>{t.moonDistance}</span><strong>{formatNumber(moon.distanceKm, lang)} km</strong></div>
          <div><span>{t.moonAge} <em>{t.approximate}</em></span><strong>{formatNumber(moon.ageDaysApprox, lang, 1)} {lang === 'fr' ? 'jours' : 'days'}</strong></div>
          <div><span>{t.nextFull}</span><strong>{displayDate(moon.nextFullMoonUtc.slice(0, 10), lang)} · {fullMoonCountdown}</strong></div></div>
        <p className="method-note">{t.exactModel} · {t.referenceTime}</p>
      </div></div></div></section>;
}

function AgeSection({ birthDate, lang }: { birthDate: string; lang: Lang }) {
  const t = copy[lang];
  const age = useMemo(() => getCosmicAge(birthDate), [birthDate]);
  const [planet, setPlanet] = useState('Mars');
  const selected = age.planets.find(item => item.name === planet) ?? age.planets[3];
  const earth = age.planets.find(item => item.name === 'Earth')!;
  return <section className="content-section age-section" aria-labelledby="age-title"><div className="content-wrap">
    <SectionHeading kicker={t.ageKicker} title={t.ageTitle} lead={t.ageLead} id="age-title" />
    <div className="age-stats"><div><strong>{formatNumber(age.daysSinceBirth, lang)}</strong><span>{t.daysOnEarth}</span></div>
      <div><strong>{formatNumber(earth.ageYears, lang, 2)}</strong><span>{t.earthOrbits}</span></div>
      <div><strong>{formatNumber(age.earthOrbitDistanceKmApprox / 1_000_000_000, lang, 2)} <small>× 10⁹ km</small></strong><span>{t.traveled} · {t.approximate}</span></div></div>
    <div className="age-explorer"><div className="planet-picker" role="group" aria-label={lang === 'fr' ? 'Choisir une planète' : 'Choose a planet'}>
      {age.planets.map(item => <button type="button" key={item.name} className={item.name === selected.name ? 'selected' : ''} onClick={() => setPlanet(item.name)}>{item.name}</button>)}
    </div><div className="planet-age-detail"><span className="eyebrow">{selected.name.toUpperCase()} · {t.approximate.toUpperCase()}</span>
      <strong>{formatNumber(selected.ageYears, lang, 2)}</strong><span className="planet-years">{t.cosmicYears}</span>
      <div className="data-rows"><div><span>{t.nextBirthday}</span><strong>{displayDate(selected.nextBirthdayDateApprox, lang)}</strong></div>
        <div><span>{lang === 'fr' ? 'Période orbitale moyenne' : 'Mean orbital period'}</span><strong>{formatNumber(selected.periodDays, lang, 1)} {lang === 'fr' ? 'jours' : 'days'}</strong></div></div>
    </div></div><p className="method-note">{t.ageNote}</p></div></section>;
}

function TimeMachine({ date, birthDate, lang, onDate }: { date: string; birthDate: string; lang: Lang; onDate: (date: string) => void }) {
  const t = copy[lang];
  const [draft, setDraft] = useState(date);
  const [error, setError] = useState(false);
  const set = (value: string) => { onDate(value); setDraft(value); setError(false); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (getBirthDateError(draft)) { setError(true); return; } set(draft); };
  return <section className="content-section time-section" aria-labelledby="time-title"><div className="content-wrap">
    <SectionHeading kicker={t.timeKicker} title={t.timeTitle} lead={t.timeLead} id="time-title" />
    <div className="time-layout"><form onSubmit={submit} className="time-form"><label htmlFor="travel-date">{t.selectedDate}</label><div><input id="travel-date" type="date" value={draft} max={todayIsoDate()} onChange={event => setDraft(event.target.value)} required /><button type="submit" aria-label={t.selectedDate}><ChevronRight size={24} /></button></div>{error && <p role="alert">{t.invalidDate}</p>}</form>
      <div className="time-shortcuts"><div className="shortcut-row"><button type="button" onClick={() => set(todayIsoDate())}>{t.today}</button><button type="button" onClick={() => set(birthDate)}>{t.myBirth}</button><button type="button" onClick={() => set(randomArchiveDate())}>{t.random}</button></div>
        <p>{t.historic}</p><div className="shortcut-row historic-row"><button type="button" onClick={() => set('2021-12-25')}>{t.webb} · 2021</button><button type="button" onClick={() => set('2021-02-18')}>{t.perseverance} · 2021</button><button type="button" onClick={() => set('2022-11-16')}>{t.artemis} · 2022</button></div></div>
    </div></div></section>;
}

function BirthdayArchive({ birthDate, lang }: { birthDate: string; lang: Lang }) {
  const t = copy[lang];
  const dates = useMemo(() => getApodBirthdayTimeline(birthDate), [birthDate]);
  const [date, setDate] = useState('');
  const state = useApod(date, Boolean(date));
  return <section className="content-section archive-section" aria-labelledby="archive-title"><div className="content-wrap">
    <SectionHeading kicker={t.archiveKicker} title={t.archiveTitle} lead={t.archiveLead} id="archive-title" />
    <div className="archive-controls"><label htmlFor="archive-year">{t.archiveYear}</label><select id="archive-year" value={date} onChange={event => setDate(event.target.value)}><option value="">—</option>{dates.map(value => <option key={value} value={value}>{value.slice(0, 4)} · {displayDate(value, lang)}</option>)}</select></div>
    {birthDate.endsWith('-02-29') && <p className="method-note">{t.leapNote}</p>}
    {date ? <ApodSection key={date} state={state} date={date} lang={lang} compact /> : <div className="archive-empty">{t.archiveChoose}</div>}
  </div></section>;
}

function PassportSection({ birthDate, moon, birthApod, lang }: { birthDate: string; moon: MoonDetails; birthApod?: ApodRecord; lang: Lang }) {
  const t = copy[lang];
  const age = useMemo(() => getCosmicAge(birthDate), [birthDate]);
  const [format, setFormat] = useState<PassportFormat>('square');
  const [includePersonal, setIncludePersonal] = useState(false);
  const [message, setMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const download = async () => {
    try {
      const spec = buildPassportSpec(format, {
        dateIso: birthDate, moonPhase: phaseName(moon.phaseName, lang),
        earthYears: age.planets.find(item => item.name === 'Earth')!.ageYears,
        marsYears: age.planets.find(item => item.name === 'Mars')!.ageYears,
        apodTitle: birthApod?.title, lang
      }, includePersonal);
      const blob = await passportBlob(spec);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = `stellar-origin-${format}${includePersonal ? `-${birthDate}` : ''}.png`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); setMessage(t.passportReady);
    } catch { setMessage(t.passportError); }
  };
  const share = async () => {
    const url = new URL(window.location.href); url.search = ''; url.hash = ''; url.searchParams.set('date', birthDate);
    try {
      if (navigator.share) await navigator.share({ title: 'Stellar Origin', text: 'Your birth. Your moment. Your universe.', url: url.toString() });
      else { await navigator.clipboard.writeText(url.toString()); setShareMessage(t.shareCopied); }
    } catch { /* User cancelled native share. */ }
  };
  return <section className="content-section passport-section" aria-labelledby="passport-title"><div className="content-wrap">
    <SectionHeading kicker={t.passportKicker} title={t.passportTitle} lead={t.passportLead} id="passport-title" />
    <div className="passport-layout"><div className="passport-preview" aria-hidden="true"><div className="passport-preview-top"><OriginMark small /><span>STELLAR ORIGIN</span></div><p>A LIFE<br /><em>IN ORBIT</em></p><span className="passport-mini-orbit" /><div className="passport-preview-foot"><span>GALAXY / MILKY WAY<br />HOME WORLD / EARTH<br />MOON / {phaseName(moon.phaseName, lang).toUpperCase()}</span><span>YOUR BIRTH. YOUR MOMENT. YOUR UNIVERSE.</span></div></div>
      <div className="passport-options"><label htmlFor="passport-format">{t.passportFormat}</label><select id="passport-format" value={format} onChange={event => setFormat(event.target.value as PassportFormat)}>
        {Object.entries(PASSPORT_FORMATS).map(([name, size]) => <option key={name} value={name}>{name} · {size.width} × {size.height}</option>)}
      </select><label className="check-row"><input type="checkbox" checked={includePersonal} onChange={event => setIncludePersonal(event.target.checked)} /><span>{t.passportPrivacy}</span></label>
      <p className="method-note">{t.passportNote}</p><button type="button" className="primary-button" onClick={download}>{t.passportDownload}<ChevronRight size={18} /></button>
      {message && <p className="feedback" role="status">{message}</p>}
      <div className="share-block"><p className="eyebrow">{t.shareTitle}</p><p>{t.shareBody}</p><button type="button" className="outline-button" onClick={share}><Share2 size={17} />{t.shareButton}</button>{shareMessage && <p className="feedback" role="status">{shareMessage}</p>}</div></div>
    </div></div></section>;
}

function MiniOrbits({ positions }: { positions: PlanetPosition[] }) {
  const radii = [13, 19, 25, 32, 42, 51, 59, 67];
  const colors = ['#a7a4a0', '#d9bc8f', '#8caeff', '#cf7e69', '#d8bd91', '#e2c99d', '#97b9c9', '#789bb8'];
  return <svg className="mini-orbits" viewBox="0 0 160 160" role="img" aria-label="Heliocentric planetary positions, scaled orbit diagram">
    {radii.map(r => <circle key={r} cx="80" cy="80" r={r} fill="none" stroke="#506177" strokeWidth=".6" opacity=".58" />)}
    <circle cx="80" cy="80" r="4" fill="#e8c88c" />
    {positions.map((position, index) => { const angle = Math.atan2(position.yAu, position.xAu); const r = radii[index]; return <circle key={position.name} cx={80 + r * Math.cos(angle)} cy={80 + r * Math.sin(angle)} r={index > 3 ? 2.5 : 2} fill={colors[index]} />; })}
  </svg>;
}

function ComparisonMedia({ apod, lang, fallback }: { apod?: ApodRecord; lang: Lang; fallback: string }) {
  if (!apod) return <div className="comparison-media comparison-media-empty">{fallback}</div>;
  return <div className="comparison-media">
    {apod.imageUrl && apod.mediaType === 'image' ? <img src={apod.imageUrl} alt={apod.alt || apod.title} loading="lazy" />
      : apod.videoUrl ? <iframe src={apod.videoUrl} title={apod.title} allowFullScreen />
        : <span>{copy[lang].mediaMissing}</span>}
  </div>;
}

function CompareSection({ birthDate, birthApod, lang }: { birthDate: string; birthApod?: ApodRecord; lang: Lang }) {
  const t = copy[lang];
  const [draft, setDraft] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState(false);
  const secondApod = useApod(second, Boolean(second));
  const moonA = useMemo(() => getMoonDetails(birthDate), [birthDate]);
  const moonB = useMemo(() => second ? getMoonDetails(second) : null, [second]);
  const posA = useMemo(() => getPlanetPositions(birthDate), [birthDate]);
  const posB = useMemo(() => second ? getPlanetPositions(second) : null, [second]);
  const difference = second ? Math.abs((parseIsoDate(second)!.getTime() - parseIsoDate(birthDate)!.getTime()) / 86_400_000) : 0;
  return <section className="content-section compare-section" aria-labelledby="compare-title"><div className="content-wrap">
    <SectionHeading kicker={t.compareKicker} title={t.compareTitle} lead={t.compareLead} id="compare-title" />
    <form className="compare-form" onSubmit={event => { event.preventDefault(); if (getBirthDateError(draft)) { setError(true); return; } setSecond(draft); setError(false); }}>
      <label htmlFor="compare-date">{t.compareLabel}</label><input id="compare-date" type="date" value={draft} max={todayIsoDate()} onChange={event => setDraft(event.target.value)} required /><button type="submit" className="outline-button">{t.compareButton}<ChevronRight size={18} /></button>
    </form>{error && <p role="alert">{t.invalidDate}</p>}
    {second && moonB && posB ? <><div className="compare-summary"><span>{t.timeApart} <strong>{formatNumber(difference, lang)}</strong></span><span>{t.illuminationDifference} <strong>{formatNumber(Math.abs(moonA.illuminationFraction - moonB.illuminationFraction) * 100, lang, 1)}%</strong></span></div>
      <div className="comparison-grid"><div className="comparison-side"><p className="eyebrow">{displayDate(birthDate, lang)}</p><ComparisonMedia apod={birthApod} lang={lang} fallback={t.apodBefore} /><MoonGraphic moon={moonA} /><strong>{phaseName(moonA.phaseName, lang)} · {formatNumber(moonA.illuminationFraction * 100, lang, 1)}%</strong><MiniOrbits positions={posA} /><span>{t.planetDifference}</span>{birthApod && <a href={birthApod.articleUrl} target="_blank" rel="noopener noreferrer">APOD · {birthApod.title}<ExternalLink size={15} /></a>}</div>
        <div className="comparison-side"><p className="eyebrow">{displayDate(second, lang)}</p><ComparisonMedia apod={secondApod.apod} lang={lang} fallback={secondApod.status === 'before_archive' ? t.apodBefore : secondApod.status === 'loading' ? t.apodLoading : t.apodUnavailable} /><MoonGraphic moon={moonB} /><strong>{phaseName(moonB.phaseName, lang)} · {formatNumber(moonB.illuminationFraction * 100, lang, 1)}%</strong><MiniOrbits positions={posB} /><span>{t.planetDifference}</span>{secondApod.status === 'ok' && <a href={secondApod.apod!.articleUrl} target="_blank" rel="noopener noreferrer">APOD · {secondApod.apod!.title}<ExternalLink size={15} /></a>}</div></div></>
      : <div className="archive-empty">{t.compareEmpty}</div>}
  </div></section>;
}

export default function Experience() {
  const [lang, setLang] = useState<Lang>('en');
  const [birthInput, setBirthInput] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [date, setDate] = useState('');
  const [baseDate, setBaseDate] = useState('');
  const [daysOffset, setDaysOffset] = useState(0);
  const [error, setError] = useState(false);
  const [travelling, setTravelling] = useState(false);
  const [motionOff, setMotionOff] = useState(false);
  const [explored, setExplored] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const t = copy[lang];
  const finishTravel = useCallback(() => { if (timer.current) clearTimeout(timer.current); setTravelling(false); setExplored(true); }, []);

  useEffect(() => {
    const saved = localStorage.getItem('stellar-origin-lang');
    const chosen: Lang = saved === 'en' || saved === 'fr' ? saved : navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const shared = new URLSearchParams(window.location.search).get('date');
    const frame = window.requestAnimationFrame(() => {
      setLang(chosen); document.documentElement.lang = chosen;
      if (shared && !getBirthDateError(shared)) { setBirthInput(shared); setBirthDate(shared); setDate(shared); setBaseDate(shared); setExplored(true); }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (explored) journeyRef.current?.scrollIntoView({ behavior: motionOff || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }, [explored, motionOff]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const changeLang = () => { const next = lang === 'en' ? 'fr' : 'en'; setLang(next); localStorage.setItem('stellar-origin-lang', next); document.documentElement.lang = next; };
  const explore = (event: React.FormEvent) => {
    event.preventDefault();
    if (getBirthDateError(birthInput)) { setError(true); return; }
    setBirthDate(birthInput); setDate(birthInput); setBaseDate(birthInput); setDaysOffset(0); setError(false);
    if (motionOff || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setExplored(true); return; }
    setTravelling(true); timer.current = setTimeout(finishTravel, 1500);
  };
  const navigateDate = (next: string) => { setDate(next); setBaseDate(next); setDaysOffset(0); };
  const offsetDate = (days: number) => { if (!baseDate) return; const d = parseIsoDate(baseDate); if (!d) return; const next = toIsoDate(new Date(d.getTime() + days * 86_400_000)); if (next > todayIsoDate()) return; setDaysOffset(days); setDate(next); };

  const selectedApod = useApod(date, explored);
  const birthApod = useApod(birthDate, explored);
  const moon = useMemo(() => date ? getMoonDetails(date) : null, [date]);
  const birthMoon = useMemo(() => birthDate ? getMoonDetails(birthDate) : null, [birthDate]);
  const planets = useMemo(() => date ? getPlanetPositions(date) : [], [date]);
  const todayPlanets = useMemo(() => getPlanetPositions(todayIsoDate()), []);

  return <><div className={`site-shell ${motionOff ? 'motion-off' : ''}`} id="top"><header className="site-header"><a href="#top" className="brand" aria-label="Stellar Origin home"><OriginMark /><span>STELLAR<br />ORIGIN</span></a>
    <nav aria-label="Main navigation"><a href="#experience">{t.navExperience}</a><a href="/about">{t.navAbout}</a><a href="/credits">{t.navSources}</a></nav>
    <button type="button" className="language-button" onClick={changeLang} aria-label={lang === 'en' ? 'Français' : 'English'}>{lang === 'en' ? 'FR' : 'EN'}<span className="language-line" /></button>
  </header>
  <main><section className="hero" aria-labelledby="hero-title"><Starfield motionOff={motionOff} /><div className="hero-orbit hero-orbit-one" aria-hidden="true" /><div className="hero-orbit hero-orbit-two" aria-hidden="true" /><div className="hero-planet" aria-hidden="true" />
    <div className="hero-content"><p className="eyebrow hero-eyebrow"><span className="tiny-star">✦</span>{t.heroIndex}</p>
      <h1 id="hero-title"><span>{t.heroTitleA}</span><span>{t.heroTitleB}</span></h1><p className="hero-slogan">Your birth. Your moment. Your universe.</p>
      <p className="hero-lead">{t.heroLead}</p><p className="hero-body">{t.heroBody}</p>
      <form onSubmit={explore} className="birth-form"><label htmlFor="birth-date">{t.birthLabel}</label><div className="birth-form-row"><input id="birth-date" type="date" value={birthInput} max={todayIsoDate()} onChange={event => { setBirthInput(event.target.value); setError(false); }} required aria-invalid={error} /><button type="submit" className="primary-button">{t.explore}<ChevronRight size={19} /></button></div>{error && <p className="form-error" role="alert">{t.invalidDate}</p>}<p className="date-hint">{t.dateHint}</p><label className="motion-option"><input type="checkbox" checked={motionOff} onChange={event => setMotionOff(event.target.checked)} />{t.motionOff}</label></form>
    </div><div className="hero-side-label" aria-hidden="true">MILKY WAY &nbsp; / &nbsp; EARTH</div>
  </section>
  <section className={`journey ${explored ? 'journey-active' : ''}`} id="experience" ref={journeyRef} aria-labelledby="journey-title">
    {explored && moon && birthMoon && <><div className="journey-intro content-wrap"><p className="eyebrow">{t.chapter} · {t.referenceTime}</p><h2 id="journey-title">{t.resultIntro}<em>{displayDate(date, lang)}</em></h2><div className="journey-intro-rule" /></div>
      <div className="content-wrap"><ApodSection state={selectedApod} date={date} lang={lang} /></div>
      <MoonSection moon={moon} date={date} lang={lang} />
      <AgeSection birthDate={birthDate} lang={lang} />
      <section className="content-section solar-section" aria-labelledby="solar-title"><div className="content-wrap"><SectionHeading kicker={t.solarKicker} title={t.solarTitle} lead={t.solarLead} id="solar-title" /><SolarSystem positions={planets} dateIso={date} lang={lang} comparisonPositions={todayPlanets} comparisonDateIso={todayIsoDate()} daysOffset={daysOffset} onDaysOffsetChange={offsetDate} /></div></section>
      <TimeMachine key={date} date={date} birthDate={birthDate} lang={lang} onDate={navigateDate} />
      <BirthdayArchive birthDate={birthDate} lang={lang} />
      <PassportSection birthDate={birthDate} moon={birthMoon} birthApod={birthApod.apod} lang={lang} />
      <CompareSection birthDate={birthDate} birthApod={birthApod.apod} lang={lang} />
    </>}
  </section></main>
  <footer className="site-footer"><a className="brand" href="#top"><OriginMark small /><span>STELLAR<br />ORIGIN</span></a><p>{t.footerNote}</p><div><a href="/about">{t.navAbout}</a><a href="/credits">{t.navSources}</a><a href="/privacy">{t.navPrivacy}</a></div><a href="#top" className="back-top">{t.backToTop} ↑</a></footer></div>
  {travelling && <div className="travel-overlay" role="dialog" aria-label={t.travel}><div className="travel-stars" /><OriginMark /><p>{t.travel}</p><strong>{displayDate(birthDate, lang)}</strong><button type="button" onClick={finishTravel}>{t.skip}</button></div>}
  </>;
}
