import Link from 'next/link';

export default function NotFound() {
  return <main className="status-page"><p className="eyebrow">404 · STELLAR ORIGIN</p><h1>Beyond the charted sky.</h1><p>Cette page est introuvable. This page was not found.</p><Link className="primary-button" href="/">Home / Accueil</Link></main>;
}
