import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
