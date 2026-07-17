import Link from 'next/link'
import type { NichePage } from '@/lib/niche-pages'

const TG_BOT = '/go/tg?u=Tapnikzbot'
const WA_SUPPORT = 'https://wa.me/77755696531'

export function NicheLanding({ niche }: { niche: NichePage }) {
  const localBizLD = niche.localBusiness
    ? {
        '@type': 'LocalBusiness',
        name: 'tapni.kz',
        url: `https://tapni.kz/${niche.slug}`,
        description: niche.metaDescription,
        address: {
          '@type': 'PostalAddress',
          addressLocality: niche.localBusiness.city,
          addressCountry: 'KZ',
        },
        geo: niche.localBusiness.lat
          ? { '@type': 'GeoCoordinates', latitude: niche.localBusiness.lat, longitude: niche.localBusiness.lon }
          : undefined,
        areaServed: niche.localBusiness.city,
      }
    : null

  return (
    <main className="min-h-screen bg-[#08080f] text-white">
      {localBizLD && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBizLD) }} />
      )}

      {/* Ambient bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[600px] w-[600px] rounded-full bg-violet-800/10 blur-3xl" />
        <div className="absolute top-32 right-0 h-[300px] w-[300px] rounded-full bg-indigo-700/[0.07] blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.05]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" width={40} height={40} />
            <span className="text-sm font-extrabold text-white tracking-tight">tapni.kz</span>
          </Link>
          <div className="flex items-center gap-1">
            <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#25D366] hover:bg-white/[0.06]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              <span className="hidden sm:inline">Поддержка</span>
            </a>
            <a href={TG_BOT} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2AABEE] hover:bg-white/[0.06]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg>
              <span className="hidden sm:inline">Telegram-бот</span>
            </a>
            <Link href="/auth" className="rounded-xl bg-white/[0.07] border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.12]">Войти</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            {niche.audience}
          </div>
          <h1 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {niche.h1}
          </h1>
          <p className="mb-8 text-base leading-relaxed text-gray-400 sm:text-lg">
            {niche.subtitle}
          </p>

          {/* Demo buttons preview */}
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {niche.buttons.map((b) => (
              <span key={b.label} className="flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.09] px-4 py-2 text-sm font-semibold text-white">
                {b.icon} {b.label}
              </span>
            ))}
          </div>

          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-violet-900/40 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            ⚡ Создать страницу бесплатно
          </Link>
          <p className="mt-3 text-xs text-gray-600">Без карты · Без кода · 60 секунд</p>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-5 py-12 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-xl font-extrabold text-white sm:text-2xl">Как это работает</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', title: 'Регистрация', desc: 'Введите номер телефона и придумайте адрес. Готово за 60 секунд, бесплатно.' },
              { n: '2', title: 'Добавьте кнопки', desc: `Добавьте нужные кнопки: ${niche.buttons.map(b => b.label).join(', ')}.` },
              { n: '3', title: 'Поделитесь ссылкой', desc: 'Вставьте ссылку tapni.kz/ваш-ник в Instagram bio или WhatsApp-статус.' },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/30 text-sm font-black text-violet-300">{s.n}</div>
                <p className="mb-1 text-sm font-bold text-white">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative px-5 py-12 border-t border-white/[0.05]">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-6 text-xl font-extrabold text-white sm:text-2xl">Бесплатно или Premium</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
              <p className="mb-2 text-sm font-bold text-white">Бесплатно</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>✅ 3 кнопки навсегда</li>
                <li>✅ QR-код</li>
                <li>✅ 2 темы</li>
                <li>✅ tapni.kz/ваш-ник</li>
              </ul>
              <p className="mt-3 text-2xl font-black text-white">0 ₸</p>
            </div>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.07] p-5 text-left">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-violet-300"><span>⚡</span> Premium</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>✅ Безлимит кнопок</li>
                <li>✅ Свой логотип</li>
                <li>✅ 6 тем оформления</li>
                <li>✅ Без водяного знака</li>
              </ul>
              <p className="mt-3 text-2xl font-black text-white">1 000 ₸<span className="text-sm font-normal text-gray-500">/мес</span></p>
            </div>
          </div>
          <Link href="/auth" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white hover:from-violet-500 hover:to-indigo-500">
            Создать бесплатно →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] px-5 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-xs font-bold text-gray-500 hover:text-white">tapni.kz</Link>
          <p className="text-[10px] text-gray-700">© 2024–2025 tapni.kz · Казахстан</p>
        </div>
      </footer>
    </main>
  )
}
