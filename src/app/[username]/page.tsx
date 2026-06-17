import { cache } from 'react'
import type { Metadata } from 'next'
import { getSupabase, type Profile, type Link as LinkRow, type Theme, type IconType, type WorkingHours } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  WhatsAppIcon, TelegramIcon, InstagramIcon, TikTokIcon, YouTubeIcon,
  FacebookIcon, VKIcon, KaspiIcon, KaspiPayIcon, KaspiShopIcon,
  TwoGisIcon, KolesaIcon, KrishaIcon,
  GlobeIcon, PhoneIcon, MailIcon, LinkIcon, TextBlockIcon,
  AndroidIcon, AppleIcon, MenuIcon,
} from '@/lib/brand-icons'
import { ProfileAvatar } from '@/components/profile-avatar'
import { ShareButton } from '@/components/share-button'
import { LeadFormButton } from '@/components/lead-form-button'
import Link from 'next/link'
import { MapPin, Zap, ArrowLeft, MessageCircle, CreditCard, Navigation, CheckCircle2, ShoppingCart, ClipboardList, Clock } from 'lucide-react'

type Props = { params: Promise<{ username: string }> }

const getData = cache(async (username: string) => {
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return { profile: null, links: [] as LinkRow[] }

  const { data: links } = await getSupabase()
    .from('links')
    .select('*')
    .eq('profile_id', (profile as Profile).id)
    .order('sort_order')

  return { profile: profile as Profile, links: (links ?? []) as LinkRow[] }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const { profile } = await getData(username)

  if (!profile) return { title: `tapni.kz/${username} — страница не найдена` }

  const desc = profile.bio
    ? `${profile.bio}${profile.address ? ' · ' + profile.address : ''}`
    : `${profile.business_name} — ссылки и контакты · tapni.kz/${username}`

  return {
    title: `${profile.business_name} · tapni.kz`,
    description: desc,
    openGraph: {
      title: profile.business_name,
      description: desc,
      url: `https://tapni.kz/${username}`,
      siteName: 'tapni.kz',
      type: 'profile',
    },
    alternates: { canonical: `https://tapni.kz/${username}` },
  }
}

function themeClasses(theme: Theme) {
  switch (theme) {
    case 'light':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-900',
        subtext: 'text-gray-500',
        address: 'text-gray-500',
        card: 'bg-white border-gray-200 shadow-sm',
        textCard: 'bg-white border-gray-200 text-gray-700',
        footer: 'bg-black/5 text-gray-500 border-black/5 hover:border-violet-400/40',
        glow1: 'bg-violet-200/40',
        glow2: 'bg-indigo-200/30',
      }
    case 'gradient':
      return {
        bg: 'bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900',
        text: 'text-white',
        subtext: 'text-gray-300',
        address: 'text-gray-400',
        card: 'bg-white/5 border-white/10',
        textCard: 'bg-white/5 border-white/10 text-gray-200',
        footer: 'bg-black/40 text-gray-400 border-white/10 hover:border-violet-400/40',
        glow1: 'bg-violet-700/30',
        glow2: 'bg-indigo-700/20',
      }
    case 'blogger':
      return {
        bg: 'bg-gradient-to-br from-rose-950 via-pink-950 to-purple-950',
        text: 'text-white',
        subtext: 'text-pink-200',
        address: 'text-pink-300/70',
        card: 'bg-white/[0.06] border-pink-500/20',
        textCard: 'bg-white/[0.06] border-pink-500/20 text-pink-100',
        footer: 'bg-black/40 text-pink-300/60 border-pink-500/20 hover:border-pink-400/50',
        glow1: 'bg-pink-600/35',
        glow2: 'bg-rose-700/25',
      }
    case 'business':
      return {
        bg: 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950',
        text: 'text-white',
        subtext: 'text-blue-200',
        address: 'text-blue-300/70',
        card: 'bg-white/[0.05] border-blue-500/15',
        textCard: 'bg-white/[0.05] border-blue-500/15 text-blue-100',
        footer: 'bg-black/50 text-blue-300/60 border-blue-500/20 hover:border-blue-400/50',
        glow1: 'bg-blue-700/30',
        glow2: 'bg-cyan-800/20',
      }
    case 'seller':
      return {
        bg: 'bg-gradient-to-br from-gray-950 via-amber-950 to-gray-950',
        text: 'text-white',
        subtext: 'text-amber-200',
        address: 'text-amber-300/70',
        card: 'bg-white/[0.05] border-amber-500/15',
        textCard: 'bg-white/[0.05] border-amber-500/15 text-amber-100',
        footer: 'bg-black/50 text-amber-300/60 border-amber-500/20 hover:border-amber-400/50',
        glow1: 'bg-amber-700/30',
        glow2: 'bg-orange-800/20',
      }
    default:
      return {
        bg: 'bg-[#0c0c18]',
        text: 'text-white',
        subtext: 'text-gray-400',
        address: 'text-gray-500',
        card: 'bg-white/[0.04] border-white/[0.08]',
        textCard: 'bg-white/[0.04] border-white/[0.08] text-gray-300',
        footer: 'bg-black/50 text-gray-400 border-white/10 hover:border-violet-400/40',
        glow1: 'bg-violet-700/25',
        glow2: 'bg-indigo-800/20',
      }
  }
}

type BtnStyle = { cls: string; iconBg: string; shadow?: string }

function getButtonStyle(type: IconType): BtnStyle | null {
  switch (type) {
    // Messengers — greens & blues
    case 'whatsapp':   return { cls: 'bg-[#25D366] hover:bg-[#20bd5a]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(37,211,102,0.45)' }
    case 'telegram':   return { cls: 'bg-[#2AABEE] hover:bg-[#1d9cd9]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(42,171,238,0.45)' }
    // Socials — distinct palettes
    case 'instagram':  return { cls: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90', iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(253,29,29,0.40)' }
    case 'tiktok':     return { cls: 'bg-gradient-to-br from-[#010101] to-[#1a1a2e] border border-[#69C9D0]/30 hover:opacity-90', iconBg: 'bg-[#69C9D0]/20', shadow: '0 4px 20px rgba(105,201,208,0.30)' }
    case 'youtube':    return { cls: 'bg-[#FF0000] hover:bg-[#e50000]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(255,0,0,0.45)' }
    case 'vk':         return { cls: 'bg-[#0077FF] hover:bg-[#006de6]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(0,119,255,0.45)' }
    case 'facebook':   return { cls: 'bg-[#1877F2] hover:bg-[#1468d9]',                                        iconBg: 'bg-white/25', shadow: '0 6px 24px rgba(24,119,242,0.45)' }
    // Kaspi family — same brand hue but visually distinct treatment
    case 'kaspi':      return { cls: 'bg-[#F14635] hover:bg-[#d93b2b]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(241,70,53,0.50)' }
    case 'kaspi_pay':  return { cls: 'bg-gradient-to-br from-[#FF8C00] to-[#F14635] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(255,140,0,0.50)' }
    case 'kaspi_shop': return { cls: 'bg-gradient-to-br from-[#c0392b] to-[#922b21] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(192,57,43,0.50)' }
    // KZ services
    case 'twogis':     return { cls: 'bg-gradient-to-br from-[#00AA4F] to-[#007a38] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(0,170,79,0.45)' }
    case 'kolesa':     return { cls: 'bg-[#FF6600] hover:bg-[#e55c00]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(255,102,0,0.45)' }
    case 'krisha':     return { cls: 'bg-[#0076CC] hover:bg-[#0069b8]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(0,118,204,0.45)' }
    // Generic
    case 'website':    return { cls: 'bg-[#7C3AED] hover:bg-[#6d28d9]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(124,58,237,0.45)' }
    case 'phone':      return { cls: 'bg-[#059669] hover:bg-[#047857]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(5,150,105,0.45)' }
    case 'email':      return { cls: 'bg-[#DB2777] hover:bg-[#be185d]',                                        iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(219,39,119,0.45)' }
    case 'android':  return { cls: 'bg-gradient-to-br from-[#3DDC84] to-[#009b55] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(61,220,132,0.45)' }
    case 'ios':      return { cls: 'bg-gradient-to-br from-[#1C7CF9] to-[#0A5DC7] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(28,124,249,0.45)' }
    case 'menu':     return { cls: 'bg-gradient-to-br from-[#FF8C00] to-[#FF5200] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(255,140,0,0.45)' }
    default: return null
  }
}

function BrandIcon({ type, className }: { type: IconType; className?: string }) {
  switch (type) {
    case 'whatsapp':   return <WhatsAppIcon className={className} />
    case 'telegram':   return <TelegramIcon className={className} />
    case 'instagram':  return <InstagramIcon className={className} />
    case 'tiktok':     return <TikTokIcon className={className} />
    case 'youtube':    return <YouTubeIcon className={className} />
    case 'kaspi':      return <KaspiIcon className={className} />
    case 'kaspi_pay':  return <KaspiPayIcon className={className} />
    case 'kaspi_shop': return <KaspiShopIcon className={className} />
    case 'twogis':     return <TwoGisIcon className={className} />
    case 'kolesa':     return <KolesaIcon className={className} />
    case 'krisha':     return <KrishaIcon className={className} />
    case 'website':    return <GlobeIcon className={className} />
    case 'phone':      return <PhoneIcon className={className} />
    case 'email':      return <MailIcon className={className} />
    case 'vk':         return <VKIcon className={className} />
    case 'facebook':   return <FacebookIcon className={className} />
    case 'text_block': return <TextBlockIcon className={className} />
    case 'product':    return <ShoppingCart className={className} />
    case 'lead_form':  return <ClipboardList className={className} />
    case 'android':    return <AndroidIcon className={className} />
    case 'ios':        return <AppleIcon className={className} />
    case 'menu':       return <MenuIcon className={className} />
    default:           return <LinkIcon className={className} />
  }
}

// ─── Working hours helpers ───────────────────────────────────

function getOpenStatus(workingHours: WorkingHours | null): { isOpen: boolean; label: string } | null {
  if (!workingHours) return null
  // Kazakhstan is UTC+5 year-round (no DST)
  const kzNow = new Date(Date.now() + 5 * 3600_000)
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayKey = dayKeys[kzNow.getUTCDay()]
  const todayStr = workingHours[dayKey]
  if (!todayStr) return { isOpen: false, label: 'Сегодня выходной' }

  // Expect exactly "HH:MM-HH:MM"
  const parts = todayStr.split('-')
  if (parts.length !== 2) return null
  const [openStr, closeStr] = parts
  if (!/^\d{2}:\d{2}$/.test(openStr) || !/^\d{2}:\d{2}$/.test(closeStr)) return null

  const [oh, om] = openStr.split(':').map(Number)
  const [ch, cm] = closeStr.split(':').map(Number)
  const cur = kzNow.getUTCHours() * 60 + kzNow.getUTCMinutes()
  const open = oh * 60 + om
  const close = ch * 60 + cm

  // Handle overnight spans (e.g. 22:00-02:00)
  const isOpen = close < open
    ? cur >= open || cur < close   // overnight: open after openTime OR before closeTime (next day)
    : cur >= open && cur < close   // normal: between open and close

  if (isOpen) return { isOpen: true, label: `Открыто · до ${closeStr}` }
  if (cur < open) return { isOpen: false, label: `Откроется в ${openStr}` }
  return { isOpen: false, label: 'Закрыто' }
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 opacity-40" viewBox="0 0 16 16" fill="none">
      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  // Run data fetch and view count increment in parallel
  const [{ profile, links }] = await Promise.all([
    getData(username),
    adminDb.rpc('increment_profile_view', { p_username: username }).then(() => {}, () => {}),
  ])

  if (!profile) return <NotFoundPage username={username} />

  const t = themeClasses(profile.theme)
  const avatarLetter = profile.business_name.charAt(0).toUpperCase()

  return (
    <main className={`relative min-h-screen ${t.bg} overflow-hidden`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[120px] ${t.glow1}`} />
        <div className={`absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full blur-[80px] ${t.glow2}`} />
      </div>

      <div className="relative mx-auto max-w-md px-5 pb-28 pt-12">
        {/* Avatar */}
        <div className="mb-5 flex flex-col items-center">
          <div className="relative">
            {profile.avatar_url && (
              <div className="absolute -inset-3 rounded-3xl bg-violet-600/20 blur-xl" />
            )}
            <ProfileAvatar
              avatarUrl={profile.avatar_url}
              letter={avatarLetter}
              size={96}
            />
          </div>
        </div>

        {/* Name, bio, address */}
        <div className="mb-6 text-center">
          <h1 className={`mb-1 text-2xl font-extrabold tracking-tight ${t.text}`}>
            {profile.business_name}
          </h1>
          {profile.bio && (
            <p className={`mt-1 text-sm leading-relaxed ${t.subtext}`}>{profile.bio}</p>
          )}
          {profile.address && (
            <p className={`mt-2 flex items-center justify-center gap-1 text-xs ${t.address}`}>
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {profile.address}
            </p>
          )}
          <p className={`mt-1.5 text-xs ${t.subtext} opacity-50`}>tapni.kz/{profile.username}</p>

          {/* Open Now badge */}
          {(() => {
            const status = getOpenStatus(profile.working_hours)
            if (!status) return null
            return (
              <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                status.isOpen
                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-white/[0.06] text-gray-400 ring-1 ring-white/10'
              }`}>
                <Clock className="h-3 w-3" />
                {status.label}
              </div>
            )
          })()}
        </div>

        {/* Share button */}
        <div className="mb-6 flex justify-center">
          <ShareButton
            url={`https://tapni.kz/${profile.username}`}
            title={profile.business_name}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-sm transition-all active:scale-[0.96] ${t.footer}`}
          />
        </div>

        {links.length === 0 ? (
          <div className={`rounded-2xl border ${t.card} py-10 text-center`}>
            <p className={`text-sm ${t.subtext}`}>Кнопки ещё не добавлены</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {links.map((link) => {
              if (link.icon_type === 'text_block') {
                return (
                  <div key={link.id} className={`rounded-2xl border ${t.textCard} px-5 py-4`}>
                    {link.title && (
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest opacity-50">
                        {link.title}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-line">{link.url}</p>
                  </div>
                )
              }

              if (link.icon_type === 'product') {
                let pd: { l?: string; p?: string; price?: string } = {}
                try { pd = JSON.parse(link.url) } catch {}
                const productHref = pd.l ? `/api/click?id=${link.id}` : undefined
                return (
                  <div key={link.id} className={`overflow-hidden rounded-2xl border ${t.card}`}>
                    {pd.p && (
                      <div className="relative h-44 w-full overflow-hidden bg-black/20">
                        <img
                          src={pd.p}
                          alt={link.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className={`font-bold text-sm leading-tight ${t.text}`}>{link.title}</p>
                        {pd.price && (
                          <span className="flex-shrink-0 rounded-lg bg-violet-600/20 px-2.5 py-1 text-xs font-bold text-violet-300">
                            {pd.price}
                          </span>
                        )}
                      </div>
                      {productHref ? (
                        <a
                          href={productHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 active:scale-[0.98]"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Смотреть товар
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              }

              if (link.icon_type === 'lead_form') {
                return (
                  <LeadFormButton
                    key={link.id}
                    linkId={link.id}
                    title={link.title}
                    username={profile.username}
                    themeCard={t.card}
                    themeText={t.text}
                    themeSubtext={t.subtext}
                    themeBg={t.bg}
                  />
                )
              }

              const style = getButtonStyle(link.icon_type)
              const isKaspiPay = link.icon_type === 'kaspi_pay'
              const clickHref = `/api/click?id=${link.id}`
              const logoSrc = `/logos/${link.icon_type}.svg`
              return (
                <a
                  key={link.id}
                  href={clickHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={style?.shadow ? { boxShadow: style.shadow } : undefined}
                  className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-all duration-150 active:scale-[0.98] hover:scale-[1.01] ${
                    style ? style.cls : `bg-white/[0.08] border border-white/10 hover:bg-white/[0.14] ${t.text}`
                  }`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                    <img
                      src={logoSrc}
                      alt=""
                      width={28}
                      height={28}
                      className="h-full w-full object-contain"
                      aria-hidden
                    />
                  </div>
                  <span className="flex-1 text-left text-sm font-bold leading-tight">
                    {link.title}
                  </span>
                  {isKaspiPay && (
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white/80" />
                    </span>
                  )}
                  <ChevronRight />
                </a>
              )
            })}
          </div>
        )}

        {/* Service promo section — only for free users */}
        {!profile.is_premium && (
        <div className={`mt-5 overflow-hidden rounded-2xl border ${t.card}`}>
          <div className={`flex items-center gap-3 border-b px-5 py-4 ${t.card}`}>
            <img
              src="/brand-logo.jpeg"
              alt="tapni.kz"
              className="h-9 w-9 rounded-xl object-cover ring-[1.5px] ring-white/20 flex-shrink-0"
            />
            <div>
              <p className={`text-sm font-extrabold ${t.text}`}>tapni.kz</p>
              <p className={`text-[11px] ${t.subtext} opacity-60`}>Цифровые визитки для бизнеса в Казахстане</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className={`mb-4 text-xs leading-relaxed ${t.subtext}`}>
              Создайте свою страницу с Kaspi Pay, 2ГИС, WhatsApp, Instagram и другими — всё по одной ссылке.
              Бесплатно, за 60 секунд, без кода и дизайнера.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {[
                { Icon: CreditCard, label: 'Kaspi Pay и магазин', color: 'text-red-400' },
                { Icon: Navigation, label: '2ГИС — маршрут', color: 'text-green-400' },
                { Icon: MessageCircle, label: 'WhatsApp / Telegram', color: 'text-emerald-400' },
                { Icon: CheckCircle2, label: 'Готово за 60 секунд', color: 'text-violet-400' },
              ].map(({ Icon, label, color }) => (
                <div key={label} className={`flex items-center gap-2 rounded-xl border ${t.card} px-3 py-2.5`}>
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
                  <span className={`text-[11px] font-medium leading-tight ${t.subtext}`}>{label}</span>
                </div>
              ))}
            </div>
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              Создать страницу бесплатно на tapni.kz
            </Link>
            <p className="mt-2 text-center text-[11px] text-gray-500 opacity-60">
              Без карты · Без кода · 3 кнопки бесплатно
            </p>
          </div>
        </div>
        )}
      </div>

      {/* Viral floating pill — free users: bold CTA, premium users: clean attribution */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-5">
        {profile.is_premium ? (
          <Link
            href="/"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3.5 py-1.5 text-[11px] text-gray-400 backdrop-blur-md transition-colors hover:border-violet-500/40 hover:text-gray-200"
          >
            <Zap className="h-3 w-3 text-violet-400" />
            Сделано на <span className="font-bold text-white">tapni.kz</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/60 backdrop-blur-md transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.97]"
          >
            <Zap className="h-3.5 w-3.5 text-yellow-300" />
            Хочешь такой же сайт?{' '}
            <span className="underline underline-offset-2">tapni.kz</span>
          </Link>
        )}
      </div>
    </main>
  )
}

const FAQ_ITEMS = [
  {
    q: 'Почему страница не открывается?',
    a: 'Этот адрес tapni.kz пока не зарегистрирован или был удалён. Проверьте правильность ссылки — возможно, вы ошиблись в написании.',
  },
  {
    q: 'Как создать свою страницу?',
    a: 'Зарегистрируйтесь за 1 минуту — введите номер телефона и придумайте адрес. Это бесплатно.',
  },
  {
    q: 'Что можно добавить на страницу?',
    a: 'Кнопки WhatsApp, Kaspi Pay, Kaspi магазин, 2ГИС, Instagram, TikTok, YouTube и другие. Всё в одной ссылке для Instagram bio.',
  },
  {
    q: 'Нужна ли оплата?',
    a: 'Базовые функции (3 кнопки) — бесплатно. Premium (безлимит, логотип, без водяного знака) — 1 000 ₸/мес или 10 000 ₸/год.',
  },
  {
    q: 'Как связаться с поддержкой?',
    a: 'Напишите нам в WhatsApp или Telegram — ответим быстро.',
  },
]

function NotFoundPage({ username }: { username: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c0c18] px-5 pb-16 pt-12 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-800/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />
            <span className="text-base font-extrabold text-white">tapni.kz</span>
          </Link>
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight">
            tapni.kz/<span className="text-violet-400">{username}</span>
          </h1>
          <p className="mb-1 text-base font-semibold text-violet-300">Этот адрес ещё свободен!</p>
          <p className="text-sm text-gray-400">Займите его прямо сейчас — это бесплатно</p>
        </div>

        {/* CTA */}
        <Link
          href={`/auth?username=${username}`}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
        >
          <Zap className="h-4 w-4" />
          Создать tapni.kz/{username}
        </Link>

        {/* FAQ */}
        <div className="mb-8 space-y-3">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
            Частые вопросы
          </p>
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-4">
              <p className="mb-1.5 text-sm font-semibold text-white">{item.q}</p>
              <p className="text-xs leading-relaxed text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Support */}
        <div className="flex flex-col gap-2">
          <a
            href="https://wa.me/77755696531"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Поддержка в WhatsApp
          </a>
          <Link href="/" className="flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft className="h-3.5 w-3.5" />
            На главную tapni.kz
          </Link>
        </div>
      </div>
    </main>
  )
}
