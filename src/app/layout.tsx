import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import { RecoveryRedirect } from '@/components/recovery-redirect'
import { ChatWidget } from '@/components/chat-widget'

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
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
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    siteName: 'tapni.kz',
    url: 'https://tapni.kz',
    images: [{ url: '/brand-logo.jpeg', width: 1024, height: 1024, alt: 'tapni.kz — цифровые визитки Казахстана' }],
  },
  twitter: { card: 'summary_large_image' },
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
      className={`${nunito.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://ahsfumqlrpikkeriyngv.supabase.co" />
        <link rel="dns-prefetch" href="https://ahsfumqlrpikkeriyngv.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">
        <RecoveryRedirect />
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
