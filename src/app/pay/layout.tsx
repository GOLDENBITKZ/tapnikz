import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Premium — безлимитные кнопки и аналитика',
  description: 'Подключите Premium tapni.kz — безлимит кнопок, 35+ типов, аналитика 90 дней, темы оформления. 1 000 ₸/мес или 10 000 ₸/год.',
  robots: { index: false, follow: false },
}

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children
}
