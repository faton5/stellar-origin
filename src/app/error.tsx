'use client';
import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="status-page"><p className="eyebrow">STELLAR ORIGIN</p><h1>A signal was lost.</h1><p>Un problème est survenu. The journey can be restarted.</p><button type="button" className="primary-button" onClick={reset}>Try again / Réessayer</button><Link href="/">Home / Accueil</Link></main>;
}
