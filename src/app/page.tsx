import Link from 'next/link'
import { LandingHero } from '@/components/landing-hero'
import { LandingFaq } from '@/components/landing-faq'
import { DemoQR } from '@/components/demo-qr'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Revalidate landing stats hourly — avoids cold-start DB queries on every request
export const revalidate = 3600

const TG_BOT = '/go/tg?u=Tapnikzbot'
const WA_SUPPORT = 'https://wa.me/77755696531'
const IG_TAPNI = 'https://instagram.com/tapni.kz'
const DEMO_PROFILE = 'https://tapni.kz/tapnikz'

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://tapni.kz/#website',
      url: 'https://tapni.kz',
      name: 'tapni.kz',
      description: 'Персональная мобильная визитка с WhatsApp, 2ГИС и Kaspi для бизнеса и блогеров Казахстана',
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
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Что такое tapni.kz и чем он отличается от Taplink?', acceptedAnswer: { '@type': 'Answer', text: 'tapni.kz — казахстанский сервис мобильных визиток для бизнеса в Казахстане. В отличие от Taplink и Linktree, у нас есть готовые кнопки Kaspi Pay, Kaspi магазин, 2ГИС, Kolesa.kz, Krisha.kz. Оплата Premium — через Kaspi, цены в тенге, поддержка на русском языке.' } },
        { '@type': 'Question', name: 'Как поставить ссылку tapni.kz в Instagram bio?', acceptedAnswer: { '@type': 'Answer', text: 'Создайте страницу на tapni.kz — вы получите адрес вида tapni.kz/ваш-ник. Откройте Instagram → Редактировать профиль → Ссылка в профиле → введите ваш адрес tapni.kz.' } },
        { '@type': 'Question', name: 'Сколько стоит tapni.kz?', acceptedAnswer: { '@type': 'Answer', text: 'Бесплатно — 3 кнопки навсегда. Premium — 1 000 ₸/месяц или 10 000 ₸/год (экономия 2 000 ₸). Оплата через Kaspi Pay.' } },
        { '@type': 'Question', name: 'Как добавить кнопку Kaspi Pay?', acceptedAnswer: { '@type': 'Answer', text: 'В приложении Kaspi.kz откройте «Платежи» → «Мой QR-код», нажмите «Поделиться» и скопируйте ссылку вида pay.kaspi.kz/pay/... В личном кабинете tapni.kz выберите тип «Kaspi Pay» и вставьте ссылку.' } },
        { '@type': 'Question', name: 'Нужны ли технические знания для создания страницы?', acceptedAnswer: { '@type': 'Answer', text: 'Нет. Регистрация занимает 60 секунд — номер телефона, адрес страницы, добавление кнопок. Ни кода, ни дизайнера, ни домена не нужно.' } },
        { '@type': 'Question', name: 'Работает ли tapni.kz с TikTok, YouTube и другими платформами?', acceptedAnswer: { '@type': 'Answer', text: 'Да. Поддерживаются: WhatsApp, Telegram, Instagram, TikTok, YouTube, Facebook, ВКонтакте, Kaspi Pay, Kaspi QR, Kaspi магазин, 2ГИС, Kolesa.kz, Krisha.kz и другие. Всего 35+ типов кнопок.' } },
        { '@type': 'Question', name: 'Можно ли поставить QR-код tapni.kz на визитку или баннер?', acceptedAnswer: { '@type': 'Answer', text: 'Да. В личном кабинете → вкладка «Профиль» → «QR-код для печати». Скачайте PNG высокого разрешения для печати на визитке, ценнике, баннере или витрине.' } },
      ],
    },
  ],
}

const PLATFORMS = [
  { label: 'WhatsApp', color: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Kaspi Pay', color: 'bg-red-100 text-red-600 border-red-200' },
  { label: '2ГИС', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Telegram', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { label: 'Instagram', color: 'bg-pink-100 text-pink-600 border-pink-200' },
  { label: 'TikTok', color: 'bg-gray-100 text-gray-600 border-gray-300' },
  { label: 'YouTube', color: 'bg-red-100 text-red-600 border-red-200' },
  { label: 'Kolesa.kz', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { label: 'Krisha.kz', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { label: 'Kaspi Shop', color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Facebook', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'ВКонтакте', color: 'bg-blue-100 text-blue-700 border-blue-200' },
]

const AUDIENCES = [
  {
    emoji: '📸',
    title: 'Блогеры и инфлюенсеры',
    desc: 'Один адрес в Instagram bio — все ссылки, партнёрки, донаты. Клиент сразу выбирает куда нажать: WhatsApp, Telegram-канал, TikTok.',
    features: ['Instagram Bio ссылка', 'Telegram-канал', 'TikTok & YouTube', 'Тема «Блогер»'],
    color: 'from-rose-50 to-purple-50 border-rose-200',
    tag: 'bg-rose-100 text-rose-600',
  },
  {
    emoji: '💼',
    title: 'Бизнес и магазины',
    desc: 'Kaspi Pay, 2ГИС, WhatsApp, каталог — всё с одной страницы. Клиент звонит, платит или строит маршрут в один тап.',
    features: ['Kaspi Pay кнопка', '2ГИС — маршрут', 'QR-код на визитку', 'Логотип компании'],
    color: 'from-blue-50 to-indigo-50 border-blue-200',
    tag: 'bg-blue-100 text-blue-600',
  },
  {
    emoji: '🛒',
    title: 'Продавцы Kaspi',
    desc: 'Kaspi магазин, товары и оплата — прямо с вашей tapni.kz страницы. Поставьте ссылку в шапке магазина.',
    features: ['Kaspi магазин', 'Kaspi товар (ссылка)', 'WhatsApp для вопросов', 'Тема «Селлер»'],
    color: 'from-amber-50 to-orange-50 border-amber-200',
    tag: 'bg-amber-100 text-amber-700',
  },
]

const LINK_TYPES: { label: string; items: { name: string; color: string }[]; wide?: boolean }[] = [
  {
    label: 'Контакты и мессенджеры',
    items: [
      { name: 'WhatsApp',   color: 'bg-green-100 text-green-700 border-green-200' },
      { name: 'Telegram',   color: 'bg-sky-100 text-sky-700 border-sky-200' },
      { name: 'Телефон',    color: 'bg-gray-100 text-gray-600 border-gray-200' },
      { name: 'Email',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { name: 'Сайт / URL', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    ],
  },
  {
    label: 'Социальные сети',
    items: [
      { name: 'Instagram', color: 'bg-pink-100 text-pink-600 border-pink-200' },
      { name: 'TikTok',    color: 'bg-gray-100 text-gray-600 border-gray-300' },
      { name: 'YouTube',   color: 'bg-red-100 text-red-600 border-red-200' },
      { name: 'Facebook',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { name: 'ВКонтакте', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    ],
  },
  {
    label: 'Казахстанские сервисы',
    items: [
      { name: 'Kaspi Pay',     color: 'bg-red-100 text-red-600 border-red-200' },
      { name: 'Kaspi магазин', color: 'bg-red-100 text-red-700 border-red-200' },
      { name: '2ГИС',          color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { name: 'Kolesa.kz',     color: 'bg-orange-100 text-orange-600 border-orange-200' },
      { name: 'Krisha.kz',     color: 'bg-blue-100 text-blue-600 border-blue-200' },
    ],
  },
  {
    label: 'Контент-блоки',
    items: [
      { name: 'Текст',      color: 'bg-gray-100 text-gray-600 border-gray-200' },
      { name: 'Изображение', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
      { name: 'Видео',      color: 'bg-purple-100 text-purple-600 border-purple-200' },
      { name: 'Прайс-лист', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { name: 'FAQ',        color: 'bg-violet-100 text-violet-600 border-violet-200' },
    ],
  },
  {
    label: 'Маркетинг и продажи',
    wide: true,
    items: [
      { name: 'Форма заявки',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
      { name: 'Карточка товара', color: 'bg-orange-100 text-orange-600 border-orange-200' },
      { name: 'Таймер',         color: 'bg-red-100 text-red-600 border-red-200' },
      { name: 'Follow Gate',    color: 'bg-pink-100 text-pink-600 border-pink-200' },
      { name: 'Instagram DM',   color: 'bg-pink-100 text-pink-600 border-pink-200' },
    ],
  },
]

const FEATURES = [
  { icon: '💳', title: 'Kaspi Pay одной кнопкой', desc: 'Клиент нажимает — мгновенно переходит к оплате через Kaspi. Работает с любым казахстанским банком.' },
  { icon: '📍', title: '2ГИС — маршрут одним тапом', desc: 'Прямая ссылка на вашу точку на карте. Клиент открывает маршрут без поиска вашего адреса.' },
  { icon: '💬', title: 'WhatsApp и Telegram', desc: 'Прямое сообщение без звонка. Один тап — клиент уже пишет вам в предпочтительный мессенджер.' },
  { icon: '🖼', title: 'Логотип и 6 тем', desc: 'Загрузите логотип, выберите тему: Тёмная, Блогер, Бизнес, Селлер, Светлая, Градиент.' },
  { icon: '📱', title: 'QR-код для печати', desc: 'Скачайте QR-код и печатайте на визитке, ценнике, витрине — ведёт прямо на вашу страницу.' },
  { icon: '📊', title: 'Аналитика переходов', desc: 'Видите сколько раз нажимали каждую кнопку. Бар-чарт по всем контактам в реальном времени.' },
  { icon: '🔗', title: '35+ типов кнопок', desc: 'WhatsApp, Telegram, Instagram, TikTok, YouTube, Kaspi Pay, Kaspi QR, 2ГИС, Kolesa, Krisha, VK, Facebook и другие.' },
  { icon: '⚡', title: 'Готово за 60 секунд', desc: 'Без кода, дизайнера и домена. Регистрация по номеру телефона — и страница готова.' },
]

async function getLiveStats() {
  try {
    const db = getSupabaseAdmin()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const [p, c, l] = await Promise.all([
      db.from('profiles').select('*', { count: 'exact', head: true }),
      db.from('click_events').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      db.from('lead_submissions').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ])
    return { profiles: p.count ?? 0, clicks: c.count ?? 0, leads: l.count ?? 0 }
  } catch {
    return null
  }
}

export default async function LandingPage() {
  const liveStats = await getLiveStats()
  return (
    <main className="min-h-screen bg-[#FAFAF8] text-gray-900 selection:bg-violet-200/60">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\//g, '\\u002f') }}
      />

      {/* Ambient bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[700px] w-[700px] rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute top-32 right-0 h-[400px] w-[400px] rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 border-b border-gray-200" role="navigation" aria-label="Основная навигация">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz — мобильные визитки для бизнеса Казахстана" className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-200 shadow-lg" width={44} height={44} />
            <span className="text-sm font-extrabold text-gray-900 tracking-tight">tapni.kz</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#1a9e55] transition-colors hover:bg-gray-100">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              <span className="hidden sm:inline">Поддержка</span>
            </a>
            <a href={TG_BOT} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#0e9bd6] transition-colors hover:bg-gray-100">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg>
              <span className="hidden sm:inline">Telegram-бот</span>
            </a>
            <a href={IG_TAPNI} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-pink-600 transition-colors hover:bg-gray-100">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              <span className="hidden sm:inline">Instagram</span>
            </a>
            <Link href="/pay" className="hidden rounded-xl px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 sm:block">Premium</Link>
            <Link href="/auth" className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700 active:scale-[0.97]">Войти</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (client — interactive demo) ── */}
      <section className="relative px-5 pb-8 pt-8 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <LandingHero profileCount={liveStats?.profiles} />
        </div>
      </section>

      {/* ── Platforms marquee ── */}
      <section className="relative border-y border-gray-200 bg-gray-50 py-5 overflow-hidden" aria-label="Поддерживаемые платформы">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">Поддерживаемые платформы и сервисы</p>
        <div
          className="overflow-hidden"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
        >
          <div className="flex animate-marquee gap-3 will-change-transform">
            {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <span key={i} className={`inline-flex flex-shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${p.color}`}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live social proof ── */}
      {liveStats && liveStats.profiles > 5 && (
        <section className="relative px-5 py-6" aria-label="Статистика сервиса">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-violet-50/40 px-6 py-5">
              <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-amber-600">tapni.kz прямо сейчас</p>
              <div className="grid grid-cols-3 divide-x divide-gray-200">
                <div className="px-4 text-center">
                  <p className="text-2xl font-black tracking-tight text-gray-900">{liveStats.profiles.toLocaleString('ru-RU')}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-500">предпринимателей</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-2xl font-black tracking-tight text-gray-900">{liveStats.clicks.toLocaleString('ru-RU')}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-500">кликов за 7 дней</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-2xl font-black tracking-tight text-gray-900">{liveStats.leads.toLocaleString('ru-RU')}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-500">заявок за 7 дней</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Static proof bar ── */}
      <section className="relative px-5 py-8" aria-label="Преимущества">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { num: '35+', label: 'типов кнопок', sub: 'Kaspi, 2ГИС, WhatsApp...' },
              { num: '60с', label: 'до запуска', sub: 'Без кода и дизайнера' },
              { num: '0 ₸', label: 'чтобы начать', sub: '3 кнопки бесплатно' },
              { num: '1000₸', label: 'Premium/мес', sub: 'или 10 000 ₸/год' },
            ].map((s) => (
              <div key={s.num} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center transition-colors hover:bg-gray-100 hover:border-gray-300">
                <p className="text-3xl font-black tracking-tight text-gray-900">{s.num}</p>
                <p className="mt-0.5 text-xs font-semibold text-violet-600">{s.label}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative border-y border-gray-100 bg-white px-5 py-14 sm:py-20" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-widest text-violet-500">Как это работает</p>
          <h2 id="how-it-works-heading" className="mb-14 text-center text-2xl font-black text-gray-900 sm:text-3xl">
            Три шага до вашей страницы
          </h2>
          <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-0">
            {/* Connecting line — desktop only */}
            <div aria-hidden className="absolute left-[16.7%] right-[16.7%] top-7 hidden h-px border-t-2 border-dashed border-violet-200 sm:block" />
            {[
              { n: '1', title: 'Зарегистрируйся', desc: 'Введи номер телефона, выбери адрес tapni.kz/ник. 60 секунд — и страница готова.', accent: 'text-violet-600 bg-violet-100' },
              { n: '2', title: 'Добавь кнопки', desc: 'WhatsApp, Kaspi Pay, 2ГИС, Instagram, Telegram — выбирай нужное из готового списка.', accent: 'text-amber-700 bg-amber-100' },
              { n: '3', title: 'Поделись ссылкой', desc: 'Скопируй tapni.kz/ник и вставь в bio Instagram, TikTok, визитку или на баннер.', accent: 'text-emerald-700 bg-emerald-100' },
            ].map((s) => (
              <div key={s.n} className="relative flex flex-col items-center text-center sm:px-6">
                <div className={`relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${s.accent}`}>
                  {s.n}
                </div>
                <p className="mb-2 text-base font-bold text-gray-900">{s.title}</p>
                <p className="text-sm leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For whom ── */}
      <section className="relative px-5 pb-14" aria-labelledby="for-whom-heading">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500">Для кого</p>
          <h2 id="for-whom-heading" className="mb-8 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Подходит для любого бизнеса в Казахстане
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className={`rounded-2xl border bg-gradient-to-b ${a.color} p-5`}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{a.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.tag}`}>Готовый шаблон</span>
                  </div>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-gray-600">{a.desc}</p>
                <ul className="space-y-1.5">
                  {a.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Link Types ── */}
      <section className="relative px-5 pb-14" aria-labelledby="link-types-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500">Типы кнопок и блоков</p>
          <h2 id="link-types-heading" className="mb-8 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Все функции персональной страницы
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {LINK_TYPES.map((cat) => (
              <div key={cat.label} className={`rounded-2xl border border-gray-200 bg-gray-50 p-4${cat.wide ? ' sm:col-span-2' : ''}`}>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">{cat.label}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <span key={item.name} className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${item.color}`}>
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative px-5 pb-14" aria-labelledby="features-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500">Возможности</p>
          <h2 id="features-heading" className="mb-8 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Всё что нужно казахстанскому бизнесу
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm" aria-hidden>
                  {f.icon}
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-semibold text-gray-900">{f.title}</p>
                  <p className="text-xs leading-relaxed text-gray-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative px-5 pb-14" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400">Цены</p>
          <h2 id="pricing-heading" className="mb-10 text-center text-2xl font-black text-gray-900 sm:text-3xl">
            Простые и честные цены
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch">
            {/* Free — subtle stepping stone */}
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6">
              <p className="mb-1 text-xs font-semibold text-gray-400">Бесплатно</p>
              <p className="mb-1 text-4xl font-black text-gray-900">0 ₸</p>
              <p className="mb-5 text-xs text-gray-400">навсегда</p>
              <ul className="mb-6 flex-1 space-y-2.5">
                {['3 кнопки навсегда', 'QR-код страницы', 'Тёмная и светлая тема', 'Ссылка tapni.kz/ник'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth?tab=register" className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:border-gray-300">
                Начать бесплатно
              </Link>
            </div>
            {/* Premium — amber featured card */}
            <div className="relative flex flex-col rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-xl shadow-amber-100/60">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-amber-500 px-4 py-1 text-[11px] font-black text-white shadow-sm">⚡ РЕКОМЕНДУЕМ</span>
              </div>
              <p className="mb-1 text-xs font-semibold text-amber-600">Premium</p>
              <div className="mb-1 flex items-end gap-2">
                <p className="text-4xl font-black text-gray-900">1 000 ₸</p>
                <p className="mb-1.5 text-sm text-gray-400">/мес</p>
              </div>
              <p className="mb-5 text-xs font-medium text-amber-600">или 10 000 ₸/год — экономия 2 000 ₸</p>
              <ul className="mb-6 flex-1 space-y-2.5">
                {[
                  'Безлимит кнопок',
                  'Свой логотип и 6 тем',
                  'QR-код для печати',
                  'Аналитика переходов',
                  'Без водяного знака',
                  'Смена адреса страницы',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 active:scale-[0.98]">
                Подключить Premium →
              </Link>
              <p className="mt-2 text-center text-[11px] text-gray-400">Оплата через Kaspi или Halyk Bank</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Telegram bot promo ── */}
      <section className="relative px-5 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-100">
              <svg className="h-7 w-7 text-[#0e9bd6]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-base font-bold text-gray-900">Управляйте через Telegram-бот</p>
              <p className="text-sm text-gray-600">Привяжите аккаунт к Telegram — получайте уведомления об оплате и управляйте страницей прямо из бота.</p>
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
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500">FAQ</p>
          <h2 id="faq-heading" className="mb-8 text-center text-2xl font-extrabold text-gray-900">
            Часто задаваемые вопросы
          </h2>
          <LandingFaq />
          <p className="mt-5 text-center text-sm text-gray-600">
            Не нашли ответ?{' '}
            <a href={TG_BOT} target="_blank" rel="noopener noreferrer" className="text-[#0e9bd6] hover:underline">
              Напишите нам в Telegram
            </a>
          </p>
        </div>
      </section>

      {/* ── Live example ── */}
      <section className="relative px-5 py-14 border-t border-gray-200" aria-labelledby="example-heading">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-violet-600">Живой пример</p>
          <h2 id="example-heading" className="mb-10 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Вот как выглядит готовая страница
          </h2>
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-center sm:gap-14">
            {/* QR side */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl bg-violet-200/50 blur-xl" />
                <DemoQR url={DEMO_PROFILE} />
              </div>
              <p className="text-center text-xs text-gray-500">
                Отсканируйте QR<br />или нажмите кнопку ниже
              </p>
            </div>

            {/* Text side */}
            <div className="flex flex-col items-center gap-4 max-w-sm text-center sm:items-start sm:text-left">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {['WhatsApp', 'Kaspi Pay', '2ГИС', 'Telegram', 'Instagram'].map((b) => (
                  <span key={b} className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{b}</span>
                ))}
              </div>
              <div>
                <p className="mb-1 text-lg font-extrabold text-gray-900">tapni.kz/tapnikz</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Одна ссылка — все контакты. Клиент сразу выбирает куда написать или как добраться.
                </p>
              </div>
              <a
                href={DEMO_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-100 hover:border-violet-400"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Открыть пример страницы
              </a>
              <a
                href={IG_TAPNI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-pink-600 hover:text-pink-700 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Следите за нами в Instagram @tapni.kz
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative px-5 pb-20 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Готово через 60 секунд
          </div>
          <h2 className="mb-3 text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Создайте свою страницу прямо сейчас
          </h2>
          <p className="mb-6 text-sm text-gray-600">Бесплатно · 3 кнопки · Без карты · Без кода</p>
          <Link
            href="/auth?tab=register"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-900/40 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.97]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Создать страницу бесплатно
          </Link>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
            <span>✓ Без кода</span>
            <span>✓ Без дизайнера</span>
            <span>✓ Без домена</span>
          </div>
        </div>
      </section>

      {/* ── Partners tizer ── */}
      <section className="border-t border-violet-100 bg-violet-50 px-5 py-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💼</span>
              <span className="font-semibold text-gray-900">Хотите зарабатывать с tapni.kz?</span>
            </div>
            <p className="text-sm text-gray-500">Рекомендуйте мобильные визитки — получайте 20% с каждой продажи.</p>
          </div>
          <a href="/partners" className="flex-shrink-0 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
            Стать менеджером →
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t border-gray-200 bg-gray-50 px-5 py-8" role="contentinfo">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-10 w-10 rounded-full object-cover ring-[1.5px] ring-gray-200" width={40} height={40} />
              <div>
                <span className="block text-sm font-extrabold text-gray-900 tracking-tight">tapni.kz</span>
                <span className="block text-[10px] text-gray-500">Мобильные визитки · Казахстан</span>
              </div>
            </div>
            <nav aria-label="Нижняя навигация" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
              <Link href="/pay" className="transition-colors hover:text-gray-900">⚡ Premium</Link>
              <a href={IG_TAPNI} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-pink-600">Instagram</a>
              <a href={TG_BOT} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sky-600">Telegram-бот</a>
              <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-green-700">WhatsApp</a>
              <a href={DEMO_PROFILE} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-violet-600">Пример</a>
              <Link href="/auth" className="transition-colors hover:text-gray-900">Войти</Link>
              <Link href="/terms" className="transition-colors hover:text-gray-900">Условия</Link>
              <Link href="/privacy" className="transition-colors hover:text-gray-900">Конфиденциальность</Link>
            </nav>
            <p className="text-xs text-gray-500">© 2026 tapni.kz · Сделано в Казахстане с ♥</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
