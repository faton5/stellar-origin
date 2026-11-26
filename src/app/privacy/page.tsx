import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Privacy / Confidentialité', description: 'How Stellar Origin handles dates, local preferences and sharing.' };
export default function PrivacyPage() { return <InfoPage kind="privacy" />; }
