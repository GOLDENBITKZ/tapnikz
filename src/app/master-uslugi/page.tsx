import type { Metadata } from 'next'
import { NicheLanding } from '@/components/niche-landing'
import { NICHE_PAGES } from '@/lib/niche-pages'

const niche = NICHE_PAGES.find((p) => p.slug === 'master-uslugi')!

export const metadata: Metadata = {
  title: niche.metaTitle,
  description: niche.metaDescription,
  keywords: niche.keywords,
  openGraph: {
    title: niche.metaTitle,
    description: niche.metaDescription,
    url: `https://tapni.kz/${niche.slug}`,
    siteName: 'tapni.kz',
    locale: 'ru_KZ',
    type: 'website',
    images: [{ url: 'https://tapni.kz/brand-logo.jpeg' }],
  },
  alternates: { canonical: `https://tapni.kz/${niche.slug}` },
}

export default function Page() {
  return <NicheLanding niche={niche} />
}
