import type { MetadataRoute } from 'next'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: profiles } = await getSupabase()
    .from('profiles')
    .select('username, updated_at')
    .order('updated_at', { ascending: false })

  const profileUrls: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `https://tapni.kz/${p.username}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://tapni.kz',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://tapni.kz/auth',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...profileUrls,
  ]
}
