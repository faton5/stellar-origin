import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = { title: 'About / À propos', description: 'How Stellar Origin uses real astronomy to explore a birth date.' };
export default function AboutPage() { return <InfoPage kind="about" />; }
