import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Credits / Sources', description: 'Scientific sources, media rights, and software credits for Stellar Origin.' };
export default function CreditsPage() { return <InfoPage kind="credits" />; }
