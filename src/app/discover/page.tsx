import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Каталог предпринимателей — tapni.kz',
  description: 'Смотрите реальные мобильные визитки казахстанских предпринимателей. Кафе, магазины, мастера, блогеры — находите и создавайте свою страницу бесплатно.',
  openGraph: {
    title: 'Каталог предпринимателей на tapni.kz',
    description: 'Мобильные визитки казахстанского бизнеса — Kaspi Pay, 2ГИС, WhatsApp в одной ссылке.',
    url: 'https://tapni.kz/discover',
    siteName: 'tapni.kz',
    locale: 'ru_KZ',
    type: 'website',
  },
  alternates: { canonical: 'https://tapni.kz/discover' },
}

interface Profile {
  username: string
  business_name: string
  bio: string | null
  avatar_url: string | null
  address: string | null
  theme: string
  view_count: number
}

export default async function DiscoverPage() {
  const db = getSupabaseAdmin()

  const { data: profiles } = await db
    .from('profiles')
    .select('username, business_name, bio, avatar_url, address, theme, view_count')
    .not('avatar_url', 'is', null)
    .order('view_count', { ascending: false })
    .limit(48)

  const items = (profiles ?? []) as Profile[]

  return (
    <main className="min-h-screen bg-[#08080f] text-white">
      {/* Ambient */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-violet-800/8 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.05]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" width={40} height={40} />
            <span className="text-sm font-extrabold text-white tracking-tight">tapni.kz</span>
          </Link>
          <Link href="/auth" className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
            Создать свою →
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="relative px-5 py-12 text-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-violet-400">Реальные примеры</p>
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Мобильные визитки на tapni.kz
        </h1>
        <p className="text-sm text-gray-400">
          Предприниматели Казахстана с Kaspi Pay, 2ГИС и WhatsApp в одной ссылке
        </p>
      </section>

      {/* Grid */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-5xl">
          {items.length === 0 ? (
            <div className="py-20 text-center text-gray-600">Профили появятся здесь после регистрации</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((p) => (
                <Link
                  key={p.username}
                  href={`/${p.username}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all hover:border-violet-500/30 hover:bg-white/[0.06]"
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <img
                      src={p.avatar_url!}
                      alt={p.business_name}
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      width={40}
                      height={40}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white group-hover:text-violet-300 transition-colors">{p.business_name}</p>
                      <p className="truncate text-[10px] text-gray-600">tapni.kz/{p.username}</p>
                    </div>
                  </div>
                  {p.bio && (
                    <p className="mb-2 line-clamp-2 text-[10px] leading-relaxed text-gray-500">{p.bio}</p>
                  )}
                  {p.address && (
                    <p className="flex items-center gap-1 text-[10px] text-gray-600">
                      <span>📍</span>
                      <span className="truncate">{p.address}</span>
                    </p>
                  )}
                  <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg className="h-3 w-3 text-violet-400" viewBox="0 0 16 16" fill="none">
                      <path d="M3 13L13 3M13 3H7M13 3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.05] px-5 py-12 text-center">
        <p className="mb-2 text-base font-bold text-white">Хотите такую же страницу?</p>
        <p className="mb-5 text-sm text-gray-500">Создайте мобильную визитку за 60 секунд, бесплатно</p>
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-indigo-500"
        >
          ⚡ Создать бесплатно
        </Link>
      </section>

      <footer className="border-t border-white/[0.05] px-5 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-xs text-gray-600 hover:text-white">← На главную</Link>
          <p className="text-[10px] text-gray-700">tapni.kz · Казахстан · 2026</p>
        </div>
      </footer>
    </main>
  )
}
