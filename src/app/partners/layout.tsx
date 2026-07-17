import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Партнёрская программа — зарабатывайте 20% с каждого клиента',
  description: 'Станьте менеджером tapni.kz и зарабатывайте 20% с каждого привлечённого Premium-клиента. Без лимита клиентов, выплаты на Kaspi.',
  alternates: { canonical: 'https://tapni.kz/partners' },
  openGraph: {
    title: 'Партнёрская программа tapni.kz — 20% комиссия',
    description: 'Привлекайте бизнесы в tapni.kz и получайте 20% с каждой оплаты. Выплаты на Kaspi без минимальной суммы.',
    url: 'https://tapni.kz/partners',
    type: 'website',
  },
}

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children
}
