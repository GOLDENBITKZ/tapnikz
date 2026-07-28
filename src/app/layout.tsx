import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import { RecoveryRedirect } from '@/components/recovery-redirect'
import { ChatWidget } from '@/components/chat-widget'
import { Analytics } from '@/components/analytics'

// Manrope over the previous Nunito. Real profiles here include a bank and a
// government portal alongside cafés; Nunito's rounded forms read juvenile at
// display sizes on those. Manrope is semi-geometric with distinctive Cyrillic
// (ж, к, я) and holds up both at 28px tight-tracked and at 13px body — one
// family doing every job, so hierarchy comes from size and weight rather than
// from mixing faces.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://tapni.kz'),
  title: {
    default: 'tapni.kz — Создай страницу с кнопками для Instagram за 1 минуту',
    template: '%s · tapni.kz',
  },
  description:
    'Лучшая альтернатива Taplink для Казахстана. Добавь кнопки WhatsApp, Kaspi, 2ГИС, Telegram, Instagram, YouTube в одну ссылку для bio. Бесплатно, без кода.',
  keywords: [
    'taplink казахстан',
    'ссылка для инстаграм',
    'линк для инстаграм казахстан',
    'мобильная визитка казахстан',
    'kaspi ссылка',
    '2гис ссылка',
    'tapni',
    'конструктор визиток',
    'ссылка bio instagram',
    'как привлечь клиентов instagram казахстан',
    'продажи через instagram',
    'бизнес instagram казахстан',
    'ссылка в bio instagram',
    'как продавать через instagram',
    'bio link казахстан',
    'онлайн визитка казахстан',
    'ссылка в шапке профиля instagram',
    'taplink альтернатива казахстан',
    'linktree казахстан',
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    siteName: 'tapni.kz',
    url: 'https://tapni.kz',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'tapni.kz — цифровые визитки для бизнеса Казахстана' }],
  },
  twitter: { card: 'summary_large_image', images: ['/opengraph-image'] },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://tapni.kz' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
  // No maximumScale — preserves pinch-to-zoom accessibility
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://ahsfumqlrpikkeriyngv.supabase.co" />
        <link rel="dns-prefetch" href="https://ahsfumqlrpikkeriyngv.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">
        <Analytics />
        <RecoveryRedirect />
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
