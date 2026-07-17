import type { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NICHE_SLUGS } from '@/lib/niche-pages'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (getSupabaseAdmin() as any)
    .from('profiles')
    .select('username, updated_at')
    .order('updated_at', { ascending: false })

  const profileUrls: MetadataRoute.Sitemap = (profiles ?? []).map((p: { username: string; updated_at: string }) => ({
    url: `https://tapni.kz/${p.username}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const nicheUrls: MetadataRoute.Sitemap = NICHE_SLUGS.map((slug) => ({
    url: `https://tapni.kz/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  }))

  return [
    {
      url: 'https://tapni.kz',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://tapni.kz/discover',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: 'https://tapni.kz/help',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: 'https://tapni.kz/pay',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: 'https://tapni.kz/auth',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...nicheUrls,
    ...profileUrls,
  ]
}
