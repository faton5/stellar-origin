'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Lang } from '@/lib/i18n';

type Kind = 'about' | 'credits' | 'privacy';
const content = {
  about: {
    en: { kicker: 'THE PROJECT', title: 'One day in a vast universe.', intro: 'Stellar Origin turns a birth date into an encounter with real astronomy. It combines a NASA publication with calculated positions and a small amount of procedural art.', sections: [
      ['What you can explore', 'Discover the original NASA Astronomy Picture of the Day, the Moon phase and distance, the planets’ heliocentric positions, and your age measured in planetary years. Revisit anniversaries, compare two dates, and save a local Cosmic Passport.'],
      ['What the diagrams mean', 'The solar system viewer uses real calculated positions at 12:00 UTC. Orbital guides, planet sizes and displayed distances are rescaled so they remain readable. The passport illustration is artwork, not an observation.'],
      ['Independent by design', 'No account, no database, no advertising. Astronomy Engine computes lunar and planetary values locally. A small server route requests the public APOD record by date from NASA. Stellar Origin is not affiliated with NASA.']
    ] },
    fr: { kicker: 'LE PROJET', title: 'Un jour dans un vaste univers.', intro: 'Stellar Origin transforme une date de naissance en rencontre avec l’astronomie réelle. L’expérience associe une publication NASA, des positions calculées et une illustration procédurale.', sections: [
      ['À explorer', 'Découvrez la publication originale Astronomy Picture of the Day, la phase et la distance de la Lune, les positions héliocentriques des planètes et votre âge en années planétaires. Retrouvez vos anniversaires, comparez deux dates et enregistrez un Cosmic Passport local.'],
      ['Comprendre les schémas', 'Le système solaire utilise des positions calculées à 12 h UTC. Les orbites, tailles et distances affichées sont rééchelonnées pour rester lisibles. L’illustration du passeport est artistique, pas une observation.'],
      ['Un projet indépendant', 'Sans compte, base de données ni publicité. Astronomy Engine calcule localement les valeurs lunaires et planétaires. Une petite route serveur demande à la NASA la publication publique par date. Stellar Origin n’est pas affilié à la NASA.']
    ] }
  },
  credits: {
    en: { kicker: 'SOURCES & RIGHTS', title: 'Give the universe its credit.', intro: 'Scientific data and media have different authors and usage terms. Every APOD record displays its original credit and links to its official NASA publication.', sections: [
      ['NASA APOD', 'Astronomy Picture of the Day content comes from the APOD Basic WordPress feed. APOD photographs can have individual copyright owners. They are displayed in context with their credits and are never baked into an exported Cosmic Passport.'],
      ['Astronomical calculations', 'Astronomy Engine supplies heliocentric planet positions, lunar phase, illumination, distance and full-moon search. Planetary mean orbital periods and Earth–Sun distance follow NASA’s Planetary Fact Sheet. Lunar age and orbital birthdays are labeled as estimates.'],
      ['Artwork and software', 'The hero planet, starfield, moon illustration and Cosmic Passport artwork are created procedurally in this project. Interface icons come from Lucide. The 3D scene uses Three.js, React Three Fiber and Drei. See package manifests for the open-source licenses.']
    ] },
    fr: { kicker: 'SOURCES & DROITS', title: 'Rendre à l’univers ses crédits.', intro: 'Données scientifiques et médias ont des auteurs et des droits distincts. Chaque APOD affiche ses crédits d’origine et un lien vers sa publication officielle NASA.', sections: [
      ['NASA APOD', 'Les publications Astronomy Picture of the Day proviennent du flux WordPress APOD Basic. Certaines photographies appartiennent à des auteurs distincts. Elles sont affichées avec leurs crédits et jamais intégrées au Cosmic Passport exporté.'],
      ['Calculs astronomiques', 'Astronomy Engine calcule les positions héliocentriques, la phase, l’éclairement et la distance lunaires ainsi que la prochaine pleine Lune. Les périodes orbitales moyennes et la distance Terre–Soleil viennent de la fiche planétaire NASA. L’âge lunaire et les anniversaires orbitaux sont indiqués comme estimations.'],
      ['Illustration et logiciels', 'La planète d’accueil, les étoiles, le dessin lunaire et le Cosmic Passport sont générés dans le projet. Les icônes viennent de Lucide. La scène 3D utilise Three.js, React Three Fiber et Drei. Les licences libres figurent dans les manifestes du projet.']
    ] }
  },
  privacy: {
    en: { kicker: 'PRIVACY', title: 'Your date belongs to you.', intro: 'Stellar Origin does not create an account, use advertising trackers, or store your birth date in an application database.', sections: [
      ['What happens when you explore', 'Your browser keeps the chosen dates in page memory. To obtain APOD, it sends a date to this site’s route, which fetches the corresponding public NASA record. The application does not explicitly log or save the date. Hosting and NASA may retain ordinary network access logs under their own policies.'],
      ['Local preferences and exports', 'Only your language choice is saved in localStorage. Astronomy calculations and the Cosmic Passport image are produced on your device. The exported image includes your date and APOD title only if you enable that option.'],
      ['Sharing', 'A date is added to a link only when you press the dedicated share button. Anyone with that link can read the date, and the URL may appear in browser history or service logs. No personal information is sent to a social network until you choose to share through your device.']
    ] },
    fr: { kicker: 'CONFIDENTIALITÉ', title: 'Votre date vous appartient.', intro: 'Stellar Origin ne crée aucun compte, n’utilise aucun traceur publicitaire et ne conserve pas votre date de naissance dans une base de données.', sections: [
      ['Pendant l’exploration', 'Votre navigateur garde les dates choisies en mémoire de page. Pour obtenir l’APOD, il envoie une date à une route du site, qui récupère la publication publique correspondante auprès de la NASA. L’application ne journalise ni n’enregistre explicitement cette date. L’hébergeur et la NASA peuvent conserver leurs journaux réseau ordinaires selon leurs propres règles.'],
      ['Préférences et export', 'Seule votre langue est conservée dans localStorage. Les calculs astronomiques et le Cosmic Passport sont réalisés sur votre appareil. L’image exportée n’inclut votre date et le titre APOD que si vous activez cette option.'],
      ['Partage', 'La date n’est ajoutée à un lien que si vous appuyez sur le bouton de partage dédié. Quiconque reçoit ce lien peut la lire, et l’URL peut apparaître dans l’historique ou des journaux réseau. Aucune donnée personnelle n’est envoyée à un réseau social avant votre choix de partage sur l’appareil.']
    ] }
  }
} as const;

export default function InfoPage({ kind }: { kind: Kind }) {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem('stellar-origin-lang');
      const next: Lang = saved === 'fr' || (!saved && navigator.language.toLowerCase().startsWith('fr')) ? 'fr' : 'en';
      setLang(next); document.documentElement.lang = next;
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const c = content[kind][lang];
  const change = () => { const next = lang === 'en' ? 'fr' : 'en'; setLang(next); localStorage.setItem('stellar-origin-lang', next); document.documentElement.lang = next; };
  return <div className="info-page"><header className="info-header"><Link href="/" className="info-brand"><Image src="/icon.svg" alt="" width={36} height={36} /> STELLAR ORIGIN</Link><Link href="/">{lang === 'fr' ? 'Retour à l’expérience' : 'Back to the experience'}</Link><button type="button" onClick={change} aria-label={lang === 'en' ? 'Français' : 'English'}>{lang === 'en' ? 'FR' : 'EN'}</button></header>
    <main className="info-main"><p className="eyebrow">{c.kicker}</p><h1>{c.title}</h1><p className="info-intro">{c.intro}</p><div className="info-sections">{c.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}</div>
      {kind === 'credits' && <div className="info-links"><h2>{lang === 'fr' ? 'Références officielles' : 'Official references'}</h2>
        <a href="https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf" target="_blank" rel="noopener noreferrer">NASA APOD Basic API guide ↗</a>
        <a href="https://science.nasa.gov/apod/apod-about/" target="_blank" rel="noopener noreferrer">NASA APOD rights and authors ↗</a>
        <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/" target="_blank" rel="noopener noreferrer">NASA Planetary Fact Sheet ↗</a>
        <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer">Astronomy Engine ↗</a>
      </div>}
    </main><footer className="info-footer"><span>STELLAR ORIGIN</span><div><a href="/about">{lang === 'fr' ? 'À propos' : 'About'}</a><a href="/credits">{lang === 'fr' ? 'Sources' : 'Sources'}</a><a href="/privacy">{lang === 'fr' ? 'Confidentialité' : 'Privacy'}</a></div></footer>
  </div>;
}
