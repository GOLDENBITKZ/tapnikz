import Link from 'next/link'
import { LandingHero } from '@/components/landing-hero'
import { LandingFaq } from '@/components/landing-faq'

const TG_BOT = 'https://t.me/Tapnikzbot'
const WA_SUPPORT = 'https://wa.me/77755696531'

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://tapni.kz/#website',
      url: 'https://tapni.kz',
      name: 'tapni.kz',
      description: 'Мобильная визитка с Kaspi Pay, 2ГИС и WhatsApp для бизнеса Казахстана',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://tapni.kz/{search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://tapni.kz/#org',
      name: 'tapni.kz',
      url: 'https://tapni.kz',
      logo: 'https://tapni.kz/brand-logo.jpeg',
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: 'Russian' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'tapni.kz',
      operatingSystem: 'Web',
      applicationCategory: 'BusinessApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KZT',
        description: 'Бесплатный план: 3 кнопки. Premium: от 1000 ₸/месяц.',
      },
      description: 'Сервис мобильных визиток для бизнеса в Казахстане. Одна ссылка с Kaspi Pay, 2ГИС, WhatsApp, Telegram и другими контактами для Instagram bio.',
    },
  ],
}

const PLATFORMS = [
  { label: 'WhatsApp', color: 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/20' },
  { label: 'Kaspi Pay', color: 'bg-[#F14635]/15 text-[#F14635] border-[#F14635]/20' },
  { label: '2ГИС', color: 'bg-[#1CAC4B]/15 text-[#1CAC4B] border-[#1CAC4B]/20' },
  { label: 'Telegram', color: 'bg-[#2AABEE]/15 text-[#2AABEE] border-[#2AABEE]/20' },
  { label: 'Instagram', color: 'bg-pink-500/15 text-pink-400 border-pink-500/20' },
  { label: 'TikTok', color: 'bg-gray-500/15 text-gray-300 border-gray-500/20' },
  { label: 'YouTube', color: 'bg-red-600/15 text-red-400 border-red-500/20' },
  { label: 'Kolesa.kz', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  { label: 'Krisha.kz', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { label: 'Kaspi Shop', color: 'bg-red-800/20 text-red-300 border-red-800/20' },
  { label: 'Facebook', color: 'bg-blue-600/15 text-blue-400 border-blue-600/20' },
  { label: 'ВКонтакте', color: 'bg-blue-700/15 text-blue-300 border-blue-700/20' },
]

const AUDIENCES = [
  {
    emoji: '💄',
    title: 'Блогеры и инфлюенсеры',
    desc: 'Один адрес в Instagram bio — все ссылки, партнёрки, донаты. Клиент сразу выбирает куда нажать: WhatsApp, Telegram-канал, TikTok.',
    features: ['Instagram Bio ссылка', 'Telegram-канал', 'TikTok & YouTube', 'Тема «Блогер»'],
    color: 'from-rose-600/15 to-purple-600/10 border-rose-500/20',
    tag: 'bg-rose-500/20 text-rose-300',
  },
  {
    emoji: '💼',
    title: 'Бизнес и магазины',
    desc: 'Kaspi Pay, 2ГИС, WhatsApp, каталог — всё с одной страницы. Клиент звонит, платит или строит маршрут в один тап.',
    features: ['Kaspi Pay кнопка', '2ГИС — маршрут', 'QR-код на визитку', 'Логотип компании'],
    color: 'from-blue-600/15 to-indigo-600/10 border-blue-500/20',
    tag: 'bg-blue-500/20 text-blue-300',
  },
  {
    emoji: '🛒',
    title: 'Продавцы Kaspi',
    desc: 'Kaspi магазин, товары и оплата — прямо с вашей tapni.kz страницы. Поставьте ссылку в шапке магазина.',
    features: ['Kaspi магазин', 'Kaspi товар (ссылка)', 'WhatsApp для вопросов', 'Тема «Селлер»'],
    color: 'from-amber-600/15 to-orange-600/10 border-amber-500/20',
    tag: 'bg-amber-500/20 text-amber-300',
  },
]

const COMPARISON = [
  { feature: 'Kaspi Pay кнопка',       tapni: true,  taplink: false, linktree: false },
  { feature: '2ГИС карта',             tapni: true,  taplink: false, linktree: false },
  { feature: 'Kolesa.kz / Krisha.kz',  tapni: true,  taplink: false, linktree: false },
  { feature: 'Оплата через Kaspi',      tapni: true,  taplink: false, linktree: false },
  { feature: 'Цены в тенге',           tapni: true,  taplink: false, linktree: false },
  { feature: 'Поддержка на русском',    tapni: true,  taplink: false, linktree: false },
  { feature: 'Бесплатный план',        tapni: true,  taplink: true,  linktree: true  },
  { feature: 'QR-код для печати',      tapni: true,  taplink: true,  linktree: false },
  { feature: 'Telegram уведомления',   tapni: true,  taplink: false, linktree: false },
]

const FEATURES = [
  { icon: '💳', title: 'Kaspi Pay одной кнопкой', desc: 'Клиент нажимает — мгновенно переходит к оплате через Kaspi. Работает с любым казахстанским банком.' },
  { icon: '📍', title: '2ГИС — маршрут одним тапом', desc: 'Прямая ссылка на вашу точку на карте. Клиент открывает маршрут без поиска вашего адреса.' },
  { icon: '💬', title: 'WhatsApp и Telegram', desc: 'Прямое сообщение без звонка. Один тап — клиент уже пишет вам в предпочтительный мессенджер.' },
  { icon: '🖼', title: 'Логотип и 6 тем', desc: 'Загрузите логотип, выберите тему: Тёмная, Блогер, Бизнес, Селлер, Светлая, Градиент.' },
  { icon: '📱', title: 'QR-код для печати', desc: 'Скачайте QR-код и печатайте на визитке, ценнике, витрине — ведёт прямо на вашу страницу.' },
  { icon: '📊', title: 'Аналитика переходов', desc: 'Видите сколько раз нажимали каждую кнопку. Бар-чарт по всем контактам в реальном времени.' },
  { icon: '🔗', title: '18 типов кнопок', desc: 'WhatsApp, Telegram, Instagram, TikTok, YouTube, Kaspi, 2ГИС, Kolesa, Krisha, VK, Facebook и другие.' },
  { icon: '⚡', title: 'Готово за 60 секунд', desc: 'Без кода, дизайнера и домена. Регистрация по номеру телефона — и страница готова.' },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#08080f] text-white selection:bg-violet-500/30">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* Ambient bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[700px] w-[700px] rounded-full bg-violet-800/10 blur-3xl" />
        <div className="absolute top-32 right-0 h-[400px] w-[400px] rounded-full bg-indigo-700/[0.08] blur-3xl" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 border-b border-white/[0.05]" role="navigation" aria-label="Основная навигация">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz — мобильные визитки для бизнеса Казахстана" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/20 shadow-lg" width={44} height={44} />
            <span className="text-sm font-extrabold text-white tracking-tight">tapni.kz</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#25D366] transition-colors hover:bg-white/[0.06]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              <span className="hidden sm:inline">Поддержка</span>
            </a>
            <a href={TG_BOT} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2AABEE] transition-colors hover:bg-white/[0.06]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg>
              <span className="hidden sm:inline">Telegram-бот</span>
            </a>
            <Link href="/pay" className="hidden rounded-xl px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:text-white sm:block">Premium</Link>
            <Link href="/auth" className="rounded-xl bg-white/[0.07] border border-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12] active:scale-[0.97]">Войти</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (client — interactive demo) ── */}
      <section className="relative px-5 pb-8 pt-8 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <LandingHero />
        </div>
      </section>

      {/* ── Platforms strip ── */}
      <section className="relative border-y border-white/[0.05] bg-white/[0.02] px-5 py-5" aria-label="Поддерживаемые платформы">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">Поддерживаемые платформы и сервисы</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PLATFORMS.map((p) => (
              <span key={p.label} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${p.color}`}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <section className="relative px-5 py-8" aria-label="Преимущества">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { num: '18', label: 'типов кнопок', sub: 'Kaspi, 2ГИС, WhatsApp...' },
              { num: '60с', label: 'до запуска', sub: 'Без кода и дизайнера' },
              { num: '0 ₸', label: 'чтобы начать', sub: '3 кнопки бесплатно' },
              { num: '1000₸', label: 'Premium/мес', sub: 'или 10 000 ₸/год' },
            ].map((s) => (
              <div key={s.num} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center">
                <p className="text-2xl font-black text-white">{s.num}</p>
                <p className="text-xs font-semibold text-violet-300">{s.label}</p>
                <p className="mt-0.5 text-[10px] text-gray-600">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative px-5 py-12 sm:py-16" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-violet-400">Как это работает</p>
          <h2 id="how-it-works-heading" className="mb-10 text-center text-2xl font-extrabold text-white sm:text-3xl">
            Три шага до вашей страницы
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { step: '01', title: 'Зарегистрируйся', desc: 'Введи номер телефона, выбери адрес tapni.kz/ник. 60 секунд — и страница готова.', color: 'from-violet-600/20 to-violet-600/5', border: 'border-violet-500/20', num: 'text-violet-400' },
              { step: '02', title: 'Добавь кнопки', desc: 'WhatsApp, Kaspi Pay, 2ГИС, Instagram, Telegram — выбирай нужное из готового списка.', color: 'from-indigo-600/20 to-indigo-600/5', border: 'border-indigo-500/20', num: 'text-indigo-400' },
              { step: '03', title: 'Поставь ссылку', desc: 'Скопируй tapni.kz/ник и вставь в bio Instagram, TikTok, визитку или на баннер.', color: 'from-pink-600/15 to-pink-600/5', border: 'border-pink-500/20', num: 'text-pink-400' },
            ].map((s) => (
              <div key={s.step} className={`rounded-2xl border ${s.border} bg-gradient-to-b ${s.color} p-5`}>
                <div className={`mb-3 text-3xl font-black ${s.num} opacity-80`}>{s.step}</div>
                <p className="mb-1.5 text-sm font-bold text-white">{s.title}</p>
                <p className="text-xs leading-relaxed text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For whom ── */}
      <section className="relative px-5 pb-14" aria-labelledby="for-whom-heading">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-600">Для кого</p>
          <h2 id="for-whom-heading" className="mb-8 text-center text-2xl font-extrabold text-white sm:text-3xl">
            Подходит для любого бизнеса в Казахстане
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className={`rounded-2xl border bg-gradient-to-b ${a.color} p-5`}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{a.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.tag}`}>Готовый шаблон</span>
                  </div>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-gray-400">{a.desc}</p>
                <ul className="space-y-1.5">
                  {a.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/40" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="relative px-5 pb-14" aria-labelledby="comparison-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-600">Сравнение</p>
          <h2 id="comparison-heading" className="mb-8 text-center text-2xl font-extrabold text-white sm:text-3xl">
            Почему tapni.kz лучше Taplink для Казахстана
          </h2>
          {/* overflow-x-auto enables horizontal scroll on narrow phones; min-w-[480px] ensures columns have enough width */}
          <div className="overflow-x-auto overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="min-w-[480px]">
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-bold">
                <span className="text-gray-400">Функция</span>
                <span className="text-center text-violet-300">tapni.kz</span>
                <span className="text-center text-gray-500">Taplink</span>
                <span className="text-center text-gray-500">Linktree</span>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-4 py-3 text-xs ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                >
                  <span className="text-gray-300 pr-2">{row.feature}</span>
                  <span className="text-center text-base">{row.tapni ? '✅' : '❌'}</span>
                  <span className="text-center text-base">{row.taplink ? '✅' : '❌'}</span>
                  <span className="text-center text-base">{row.linktree ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-600">
            * Данные актуальны на 2026 год. Казахстанские сервисы недоступны у зарубежных аналогов.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative px-5 pb-14" aria-labelledby="features-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-600">Возможности</p>
          <h2 id="features-heading" className="mb-8 text-center text-2xl font-extrabold text-white sm:text-3xl">
            Всё что нужно казахстанскому бизнесу
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xl" aria-hidden>
                  {f.icon}
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs leading-relaxed text-gray-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative px-5 pb-14" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-600">Цены</p>
          <h2 id="pricing-heading" className="mb-8 text-center text-2xl font-extrabold text-white sm:text-3xl">
            Простые и честные цены
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Бесплатно</p>
              <p className="mb-4 text-3xl font-black text-white">0 ₸</p>
              <ul className="mb-6 space-y-2">
                {['3 кнопки навсегда', 'QR-код страницы', 'Тёмная и светлая тема', 'Ссылка tapni.kz/ник'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.10]">
                Начать бесплатно
              </Link>
            </div>
            {/* Premium */}
            <div className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/15 to-indigo-600/10 p-6">
              <div className="absolute -top-3 right-5">
                <span className="rounded-full bg-yellow-500 px-3 py-1 text-[11px] font-black text-black">⚡ PREMIUM</span>
              </div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-violet-300">Premium</p>
              <div className="mb-4 flex items-end gap-2">
                <p className="text-3xl font-black text-white">1 000 ₸</p>
                <p className="mb-1 text-sm text-gray-400">/мес</p>
              </div>
              <p className="mb-4 text-[11px] text-yellow-400">или 10 000 ₸/год — экономия 2 000 ₸</p>
              <ul className="mb-6 space-y-2">
                {[
                  'Безлимит кнопок',
                  'Свой логотип',
                  '6 тем оформления',
                  'QR-код для печати',
                  'Аналитика переходов',
                  'Без водяного знака',
                  'Смена адреса страницы',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-200">
                    <span className="text-violet-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition-all hover:from-violet-500 hover:to-indigo-500">
                Подключить Premium →
              </Link>
              <p className="mt-2 text-center text-[11px] text-gray-600">Оплата через Kaspi или Halyk Bank</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Telegram bot promo ── */}
      <section className="relative px-5 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-[#2AABEE]/20 bg-[#2AABEE]/5 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#2AABEE]/20">
              <svg className="h-7 w-7 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-base font-bold text-white">Управляйте через Telegram-бот</p>
              <p className="text-sm text-gray-400">Привяжите аккаунт к Telegram — получайте уведомления об оплате и управляйте страницей прямо из бота.</p>
            </div>
            <a href={TG_BOT} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 rounded-xl bg-[#2AABEE] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#1d9cd9] active:scale-[0.97]">
              Открыть бот →
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative px-5 pb-14" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-600">FAQ</p>
          <h2 id="faq-heading" className="mb-8 text-center text-2xl font-extrabold text-white">
            Часто задаваемые вопросы
          </h2>
          <LandingFaq />
          <p className="mt-5 text-center text-sm text-gray-500">
            Не нашли ответ?{' '}
            <a href={TG_BOT} target="_blank" rel="noopener noreferrer" className="text-[#2AABEE] hover:underline">
              Напишите нам в Telegram
            </a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative px-5 pb-20 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Готово через 60 секунд
          </div>
          <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
            Создайте свою страницу прямо сейчас
          </h2>
          <p className="mb-6 text-sm text-gray-400">Бесплатно · 3 кнопки · Без карты · Без кода</p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-900/40 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.97]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Создать страницу бесплатно
          </Link>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
            <span>✓ Без кода</span>
            <span>✓ Без дизайнера</span>
            <span>✓ Без домена</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t border-white/[0.06] px-5 py-8" role="contentinfo">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-10 w-10 rounded-full object-cover ring-[1.5px] ring-white/20" width={40} height={40} />
              <div>
                <span className="block text-sm font-extrabold text-white tracking-tight">tapni.kz</span>
                <span className="block text-[10px] text-gray-600">Мобильные визитки · Казахстан</span>
              </div>
            </div>
            <nav aria-label="Нижняя навигация" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
              <Link href="/pay" className="transition-colors hover:text-gray-300">⚡ Premium</Link>
              <a href={TG_BOT} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#2AABEE]">Telegram-бот</a>
              <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#25D366]">WhatsApp</a>
              <Link href="/auth" className="transition-colors hover:text-gray-300">Войти</Link>
            </nav>
            <p className="text-xs text-gray-600">© 2026 tapni.kz · Сделано в Казахстане с ♥</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
