import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/about', '/credits', '/privacy'].map(path => ({ url: new URL(path, siteUrl()).toString(), changeFrequency: path === '/' ? 'monthly' : 'yearly', priority: path === '/' ? 1 : 0.4 }));
}
