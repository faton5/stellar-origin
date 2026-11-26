import type { Metadata, Viewport } from 'next';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: 'Stellar Origin — Your birth. Your moment. Your universe.', template: '%s | Stellar Origin' },
  description: 'Explore the real NASA Astronomy Picture of the Day, Moon and planetary positions for your birth date.',
  openGraph: { title: 'Stellar Origin', description: 'Your birth. Your moment. Your universe.', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Stellar Origin' },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { themeColor: '#03050A', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
