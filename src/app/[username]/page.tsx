import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// Cache profile pages for 60s on the edge — reduces Supabase roundtrips for popular pages
export const revalidate = 60
import { makeVcardToken } from '@/lib/vcard-token'
import { type Profile, type Link as LinkRow, type Theme, type IconType, type WorkingHours } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  WhatsAppIcon, TelegramIcon, InstagramIcon, TikTokIcon, YouTubeIcon,
  FacebookIcon, VKIcon, KaspiIcon, KaspiPayIcon, KaspiShopIcon,
  TwoGisIcon, KolesaIcon, KrishaIcon,
  GlobeIcon, PhoneIcon, MailIcon, LinkIcon, TextBlockIcon,
  AndroidIcon, AppleIcon, MenuIcon,
  InstagramDmIcon, InstagramReelIcon, FollowGateIcon, InstagramKeywordIcon,
} from '@/lib/brand-icons'
import { ProfileAvatar } from '@/components/profile-avatar'
import { TrackableLink } from '@/components/trackable-link'
import { ShareButton } from '@/components/share-button'
import { LeadFormButton } from '@/components/lead-form-button'
import { FollowGateButton } from '@/components/follow-gate-button'
import { MilestoneBlock } from '@/components/milestone-block'
import { InstagramDmPrompt } from '@/components/instagram-dm-prompt'
import { CountdownBlock } from '@/components/countdown-block'
import { FaqBlock } from '@/components/faq-block'
import { PricelistBlock } from '@/components/pricelist-block'
import { ImageExpandBlock } from '@/components/image-expand-block'
import { KaspiQrBlock } from '@/components/kaspi-qr-block'

import { SmartQrBlock } from '@/components/smart-qr-block'
import { LinkLogo } from '@/components/link-logo'
import Link from 'next/link'
import { MapPin, Zap, ArrowLeft, ShoppingCart, ClipboardList, UserPlus } from 'lucide-react'

function getVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}?rel=0&modestbranding=1`
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.slice('/shorts/'.length)
        if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
      }
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
    }
    if (u.hostname.includes('tiktok.com')) {
      const parts = u.pathname.split('/').filter(Boolean)
      const vi = parts.indexOf('video')
      if (vi !== -1 && parts[vi + 1]) return `https://www.tiktok.com/embed/v2/${parts[vi + 1]}`
    }
  } catch {}
  return null
}

type Props = { params: Promise<{ username: string }> }

const getData = cache(async (username: string) => {
  // Use admin client — public profile reads must not expose raw Supabase REST API to anon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: profile } = await db
    .from('profiles')
    .select('id,username,business_name,bio,phone,address,avatar_url,theme,is_premium,subscription_expires_at,view_count,working_hours')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return { profile: null, links: [] as LinkRow[] }

  const { data: links } = await db
    .from('links')
    .select('id,profile_id,title,url,icon_type,sort_order,click_count,is_featured,visible_from,visible_until')
    .eq('profile_id', (profile as Profile).id)
    .order('sort_order')

  return { profile: profile as Profile, links: (links ?? []) as LinkRow[] }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const { profile, links } = await getData(username)

  if (!profile) return {
    title: `tapni.kz/${username} — страница не найдена`,
    robots: { index: false, follow: false },
  }

  // Build rich description: bio + address + detected service hints
  const serviceHints: string[] = []
  const iconTypes = links.map((l) => l.icon_type)
  if (iconTypes.includes('kaspi_pay') || iconTypes.includes('kaspi_shop')) serviceHints.push('Kaspi')
  if (iconTypes.includes('whatsapp')) serviceHints.push('WhatsApp')
  if (iconTypes.includes('instagram')) serviceHints.push('Instagram')
  if (iconTypes.includes('twogis')) serviceHints.push('2ГИС')

  const cityHint = profile.address ? ` · ${profile.address}` : ''
  const desc = profile.bio
    ? `${profile.bio}${cityHint}`
    : serviceHints.length
      ? `${profile.business_name}${cityHint} — ${serviceHints.join(', ')} и другие контакты на tapni.kz`
      : `${profile.business_name}${cityHint} — все контакты и ссылки на tapni.kz`

  // Keywords: business name + city + service types
  const kwParts = [profile.business_name]
  if (profile.address) kwParts.push(profile.address)
  if (serviceHints.length) kwParts.push(...serviceHints)
  kwParts.push('визитка', 'контакты', 'tapni.kz')

  return {
    title: {
      absolute: profile.address
        ? `${profile.business_name}, ${profile.address} · tapni.kz`
        : `${profile.business_name} · tapni.kz`,
    },
    description: desc,
    keywords: kwParts.join(', '),
    openGraph: {
      title: profile.business_name,
      description: desc,
      url: `https://tapni.kz/${username}`,
      siteName: 'tapni.kz',
      type: 'profile',
      images: profile.avatar_url
        ? [{ url: profile.avatar_url, width: 400, height: 400, alt: profile.business_name }]
        : [{ url: 'https://tapni.kz/brand-logo.jpeg', width: 1024, height: 1024, alt: 'tapni.kz' }],
    },
    twitter: { card: 'summary', site: '@tapnikz' },
    alternates: { canonical: `https://tapni.kz/${username}` },
  }
}

function themeClasses(theme: Theme) {
  switch (theme) {
    case 'light':
      return {
        bg: 'bg-[#FAFAF8] bg-dot-grid',
        text: 'text-gray-900',
        subtext: 'text-gray-500',
        address: 'text-gray-500',
        card: 'bg-white border-gray-200 shadow-sm',
        textCard: 'bg-white border-gray-200 text-gray-700',
        footer: 'bg-black/5 text-gray-500 border-black/5 hover:border-violet-400/40',
        glow1: 'bg-violet-200/40',
        glow2: 'bg-amber-200/25',
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
    case 'paypal':       return { cls: 'bg-gradient-to-br from-[#009cde] to-[#003087] hover:opacity-90',         iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(0,48,135,0.50)' }
    case 'instagram_dm': return { cls: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90', iconBg: 'bg-white/20', shadow: '0 6px 24px rgba(253,29,29,0.40)' }
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
    case 'menu':           return <MenuIcon className={className} />
    case 'instagram_dm':      return <InstagramDmIcon className={className} />
    case 'instagram_reel':    return <InstagramReelIcon className={className} />
    case 'follow_gate':       return <FollowGateIcon className={className} />
    case 'instagram_keyword': return <InstagramKeywordIcon className={className} />
    default:                  return <LinkIcon className={className} />
  }
}

// ─── Working hours helpers ───────────────────────────────────

function getOpenStatus(workingHours: WorkingHours | null): { isOpen: boolean; label: string } | null {
  if (!workingHours) return null
  // Kazakhstan is UTC+5 year-round (no DST)
  const kzNow = new Date(Date.now() + 5 * 3600_000)
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayKey = dayKeys[kzNow.getUTCDay()]
  const dayData = workingHours[dayKey]
  if (!dayData) return { isOpen: false, label: 'Сегодня выходной' }

  // Normalise to array of {name, time}
  type Slot = { name?: string; time: string }
  const slots: Slot[] = typeof dayData === 'string'
    ? [{ time: dayData }]
    : (dayData as Slot[])

  if (!slots.length) return { isOpen: false, label: 'Сегодня выходной' }

  const cur = kzNow.getUTCHours() * 60 + kzNow.getUTCMinutes()

  const parseSlot = (slot: Slot) => {
    const parts = slot.time.split('-')
    if (parts.length !== 2) return null
    const [openStr, closeStr] = parts
    if (!/^\d{2}:\d{2}$/.test(openStr) || !/^\d{2}:\d{2}$/.test(closeStr)) return null
    const [oh, om] = openStr.split(':').map(Number)
    const [ch, cm] = closeStr.split(':').map(Number)
    return { openStr, closeStr, open: oh * 60 + om, close: ch * 60 + cm }
  }

  // Check if currently open in any slot
  for (const slot of slots) {
    const p = parseSlot(slot)
    if (!p) continue
    const isOpen = p.close < p.open
      ? cur >= p.open || cur < p.close
      : cur >= p.open && cur < p.close
    if (isOpen) {
      const nameLabel = slot.name ? ` · ${slot.name}` : ''
      return { isOpen: true, label: `Открыто${nameLabel} · до ${p.closeStr}` }
    }
  }

  // Not open — find next slot opening today
  const upcoming = slots
    .map((slot) => ({ slot, p: parseSlot(slot) }))
    .filter(({ p }) => p && p.open > cur)
    .sort((a, b) => a.p!.open - b.p!.open)
  if (upcoming.length > 0) {
    const { slot, p } = upcoming[0]
    const nameLabel = slot.name ? ` · ${slot.name}` : ''
    return { isOpen: false, label: `Откроется в ${p!.openStr}${nameLabel}` }
  }

  return { isOpen: false, label: 'Закрыто' }
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 opacity-40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-75" viewBox="0 0 16 16" fill="none">
      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { profile, links } = await getData(username)

  if (!profile) notFound()

  // Fire-and-forget: don't block page render waiting for view counter update
  adminDb.rpc('increment_profile_view', { p_username: username }).then(() => {}, () => {})

  const t = themeClasses(profile.theme)
  const avatarLetter = profile.business_name.charAt(0).toUpperCase()

  // Extract instagram_dm handle for the DM engagement prompt
  const igDmLink = links.find((l) => l.icon_type === 'instagram_dm')
  const igPromptHandle = igDmLink?.url.replace(/^https?:\/\/ig\.me\/m\//i, '').replace(/^ig\.me\/m\//i, '') || null

  // JSON-LD structured data for Google/Yandex rich results
  const socialTypes = new Set(['instagram', 'whatsapp', 'telegram', 'tiktok', 'youtube', 'vk', 'website', 'twogis'])
  const sameAs = links
    .filter((l) => socialTypes.has(l.icon_type) && l.url?.startsWith('http'))
    .map((l) => l.url)
  const intlPhone = profile.phone
    ? (profile.phone.length === 11 && profile.phone.startsWith('7') ? `+${profile.phone}` : profile.phone)
    : null
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: profile.business_name,
    url: `https://tapni.kz/${username}`,
    ...(intlPhone && { telephone: intlPhone }),
    ...(profile.address && {
      address: { '@type': 'PostalAddress', streetAddress: profile.address, addressCountry: 'KZ' },
    }),
    ...(profile.bio && { description: profile.bio }),
    ...(profile.avatar_url && { image: profile.avatar_url }),
    ...(sameAs.length && { sameAs }),
  }

  return (
    <main className={`relative min-h-screen ${t.bg} overflow-hidden`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\//g, '\\u002f') }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[120px] ${t.glow1}`} />
        <div className={`absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full blur-[80px] ${t.glow2}`} />
      </div>

      <div className="relative mx-auto max-w-md px-5 pb-28 pt-12">
        {/* Avatar */}
        <div className="mb-5 flex flex-col items-center animate-fade-up">
          <div className="relative">
            {profile.avatar_url
              ? <div className="absolute -inset-4 rounded-full bg-violet-500/25 blur-2xl" />
              : <div className="absolute -inset-3 rounded-3xl bg-violet-600/15 blur-xl" />
            }
            <div className="relative ring-2 ring-white/10 rounded-full">
              <ProfileAvatar
                avatarUrl={profile.avatar_url}
                letter={avatarLetter}
                size={96}
              />
            </div>
          </div>
        </div>

        {/* Name, bio, address */}
        <div className="mb-6 text-center animate-fade-up animation-delay-75">
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
          <p className={`mt-1.5 text-xs ${t.subtext} opacity-40`}>tapni.kz/{profile.username}</p>

          {/* Open Now badge */}
          {(() => {
            const status = getOpenStatus(profile.working_hours)
            if (!status) return null
            return (
              <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                status.isOpen
                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm shadow-emerald-500/20'
                  : 'bg-white/[0.06] text-gray-400 ring-1 ring-white/10'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {status.label}
              </div>
            )
          })()}
        </div>

        {/* Share + vCard buttons */}
        <div className="mb-6 flex justify-center gap-2 animate-fade-up animation-delay-150">
          <ShareButton
            url={`https://tapni.kz/${profile.username}`}
            title={profile.business_name}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-sm transition-all active:scale-[0.96] ${t.footer}`}
          />
          {profile.phone && (
            <a
              href={`/api/vcard?username=${profile.username}&t=${makeVcardToken(profile.username)}`}
              download
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-sm transition-all active:scale-[0.96] ${t.footer}`}
            >
              <UserPlus className="h-3 w-3 opacity-70" />
              Сохранить контакт
            </a>
          )}
        </div>

        {(() => {
          const now = new Date()
          const visibleLinks = links.filter((l) => {
            if (l.visible_from && new Date(l.visible_from) > now) return false
            if (l.visible_until && new Date(l.visible_until) < now) return false
            return true
          })
          return visibleLinks.length === 0 ? (
          <div className={`rounded-2xl border ${t.card} py-10 text-center animate-fade-up animation-delay-250`}>
            <p className={`text-sm ${t.subtext}`}>Кнопки ещё не добавлены</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleLinks.map((link, i) => {
              const staggerStyle = { '--i': i } as React.CSSProperties

              if (link.icon_type === 'text_block') {
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <div className={`rounded-2xl border ${t.textCard} px-5 py-4`}>
                      {link.title && (
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest opacity-50">
                          {link.title}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-line">{link.url}</p>
                    </div>
                  </div>
                )
              }

              if (link.icon_type === 'product') {
                let pd: { l?: string; p?: string; price?: string } = {}
                try { pd = JSON.parse(link.url) } catch {}
                const productHref = pd.l ? `/api/click?id=${link.id}` : undefined
                const safeProductImg = pd.p?.startsWith('https://') ? pd.p : undefined
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <div className={`overflow-hidden rounded-2xl border ${t.card}`}>
                      {safeProductImg && (
                        <div className="relative h-44 w-full overflow-hidden bg-black/20">
                          <img
                            src={safeProductImg}
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
                  </div>
                )
              }

              if (link.icon_type === 'lead_form') {
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <LeadFormButton
                      linkId={link.id}
                      title={link.title}
                      username={profile.username}
                      themeCard={t.card}
                      themeText={t.text}
                      themeSubtext={t.subtext}
                      themeBg={t.bg}
                    />
                  </div>
                )
              }

              if (link.icon_type === 'instagram_reel') {
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <a
                      href={`/api/click?id=${link.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block overflow-hidden rounded-2xl border ${t.card} transition-all duration-150 active:scale-[0.98] hover:-translate-y-px`}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]" />
                      <div className="flex items-center gap-4 px-4 py-3.5">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
                          <img src="/logos/instagram_reel.svg" alt="" className="h-6 w-6 object-contain" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm leading-tight truncate ${t.text}`}>{link.title || 'Смотреть в Reels'}</p>
                          <p className={`text-xs mt-0.5 ${t.subtext} opacity-60`}>Открыть в Instagram</p>
                        </div>
                        <span className="flex-shrink-0 text-xs font-bold text-[#fd1d1d]">▶ Reels</span>
                      </div>
                    </a>
                  </div>
                )
              }

              if (link.icon_type === 'milestone') {
                let md: {
                  goal?: number; hours?: number; started_at?: string
                  baseline?: number; reward_url?: string; reward_code?: string; reward_label?: string
                } = {}
                try { md = JSON.parse(link.url) } catch {}
                const goal = md.goal ?? 500
                const hours = md.hours ?? 24
                const baseline = md.baseline ?? 0
                const startedAt = md.started_at ? new Date(md.started_at).getTime() : Date.now()
                const currentViews = Math.max(0, (profile.view_count ?? 0) - baseline)
                const endTime = startedAt + hours * 3_600_000
                const timeLeftMs = endTime - Date.now()
                const unlocked = currentViews >= goal
                const expired = timeLeftMs <= 0 && !unlocked
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <MilestoneBlock
                      linkId={link.id}
                      title={link.title}
                      initial={{
                        current: currentViews,
                        goal,
                        time_left_seconds: Math.max(0, Math.floor(timeLeftMs / 1000)),
                        unlocked,
                        expired,
                        reward_url: md.reward_url ?? '',
                        reward_code: md.reward_code ?? '',
                        reward_label: md.reward_label ?? '',
                      }}
                      themeCard={t.card}
                      themeText={t.text}
                      themeSubtext={t.subtext}
                    />
                  </div>
                )
              }

              if (link.icon_type === 'follow_gate') {
                let gd: { ig?: string; content?: string; label?: string } = {}
                try { gd = JSON.parse(link.url) } catch {}
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <FollowGateButton
                      linkId={link.id}
                      title={link.title || gd.label || 'Получить материал'}
                      igHandle={gd.ig ?? ''}
                      contentUrl={gd.content ?? ''}
                      themeCard={t.card}
                      themeText={t.text}
                      themeSubtext={t.subtext}
                      themeBg={t.bg}
                    />
                  </div>
                )
              }

              if (link.icon_type === 'instagram_keyword') {
                let kd: { ig?: string; keyword?: string; reward?: string } = {}
                try { kd = JSON.parse(link.url) } catch {}
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <a
                      href={`/api/click?id=${link.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block overflow-hidden rounded-2xl border ${t.card} transition-all active:scale-[0.98] hover:-translate-y-px`}
                    >
                      <div className="h-1 w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]" />
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
                          <span className="text-lg" aria-hidden>💬</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] uppercase tracking-wider ${t.subtext} opacity-50`}>
                            Напишите мне в Instagram Direct:
                          </p>
                          <p className={`text-xl font-extrabold tracking-wider ${t.text}`}>
                            «{kd.keyword || '…'}»
                          </p>
                          {kd.reward && (
                            <p className="mt-0.5 text-xs text-emerald-400">→ {kd.reward}</p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs font-bold text-[#fd1d1d]">DM →</span>
                      </div>
                    </a>
                  </div>
                )
              }

              if (link.icon_type === 'countdown') {
                let cd: { target?: string; label?: string } = {}
                try { cd = JSON.parse(link.url) } catch {}
                if (!cd.target) return null
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <CountdownBlock
                      target={cd.target}
                      label={cd.label || link.title || 'До события'}
                      themeCard={t.card}
                      themeText={t.text}
                      themeSubtext={t.subtext}
                    />
                  </div>
                )
              }

              if (link.icon_type === 'pricelist') {
                let pd: { title?: string; items?: { name: string; price: string; desc?: string }[] } = {}
                try { pd = JSON.parse(link.url) } catch {}
                const items = pd.items ?? []
                if (items.length === 0) return null
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <PricelistBlock
                      linkId={link.id}
                      title={pd.title || link.title || 'Прайс-лист'}
                      items={items}
                      themeText={t.text}
                      themeSubtext={t.subtext}
                    />
                  </div>
                )
              }

              if (link.icon_type === 'image') {
                let img: { src?: string; alt?: string; link?: string; mode?: string } = {}
                try { img = JSON.parse(link.url) } catch {}
                if (!img.src?.startsWith('https://')) return null

                if (img.mode === 'button') {
                  return (
                    <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                      <ImageExpandBlock
                        src={img.src}
                        alt={img.alt || link.title || ''}
                        title={link.title || 'Показать изображение'}
                        linkId={link.id}
                        hasLink={!!img.link}
                        linkHref={img.link ? `/api/click?id=${link.id}` : undefined}
                      />
                    </div>
                  )
                }

                const content = (
                  <img
                    src={img.src}
                    alt={img.alt || link.title || ''}
                    className="w-full rounded-2xl object-cover"
                    loading="lazy"
                  />
                )
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    {img.link ? (
                      <a href={`/api/click?id=${link.id}`} target="_blank" rel="noopener noreferrer"
                        className="block transition-opacity active:opacity-80 hover:opacity-95">
                        {content}
                      </a>
                    ) : content}
                  </div>
                )
              }

              if (link.icon_type === 'video') {
                let vd: { url?: string } = {}
                try { vd = JSON.parse(link.url) } catch {}
                const embedUrl = vd.url ? getVideoEmbedUrl(vd.url) : null
                if (!embedUrl) return null
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <div className="overflow-hidden rounded-2xl" style={{ paddingTop: '56.25%', position: 'relative' }}>
                      <iframe
                        src={embedUrl}
                        title={link.title || 'Видео'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  </div>
                )
              }

              if (link.icon_type === 'faq') {
                let fd: { title?: string; items?: { q: string; a: string }[] } = {}
                try { fd = JSON.parse(link.url) } catch {}
                const items = fd.items ?? []
                if (items.length === 0) return null
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <FaqBlock
                      linkId={link.id}
                      title={fd.title || link.title || ''}
                      items={items}
                      themeText={t.text}
                      themeSubtext={t.subtext}
                    />
                  </div>
                )
              }

              if (link.icon_type === 'kaspi_qr') {
                if (!link.url.startsWith('https://pay.kaspi.kz/')) return null
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <KaspiQrBlock
                      linkId={link.id}
                      url={link.url}
                      title={link.title || 'Оплата через Kaspi Pay'}
                      themeText={t.text}
                    />
                  </div>
                )
              }


              if (link.icon_type === 'smart_qr') {
                let sqData: { ios?: string; android?: string; web?: string; label?: string } = {}
                try { sqData = JSON.parse(link.url) } catch { return null }
                if (!sqData.ios && !sqData.android && !sqData.web) return null
                return (
                  <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                    <SmartQrBlock
                      linkId={link.id}
                      data={sqData}
                      title={link.title || sqData.label || 'Открыть приложение'}
                      themeText={t.text}
                    />
                  </div>
                )
              }

              const style = getButtonStyle(link.icon_type)
              const isKaspiPay = link.icon_type === 'kaspi_pay'
              const logoSrc = `/logos/${link.icon_type}.svg`
              // Instagram.com URLs need server-side HTML for native app deep link
              const needsDeepLink =
                (link.url.includes('instagram.com/') && !link.url.includes('ig.me/')) ||
                /https?:\/\/t\.me\//.test(link.url)
              return (
                <div key={link.id} style={staggerStyle} className={`animate-btn-stagger${link.is_featured ? ' ring-2 ring-yellow-400/50 rounded-2xl' : ''}`}>
                  <TrackableLink
                    id={link.id}
                    url={link.url}
                    iconType={link.icon_type}
                    needsDeepLink={needsDeepLink}
                    style={style?.shadow ? { boxShadow: style.shadow } : undefined}
                    className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-transform duration-75 active:scale-[0.97] hover:scale-[1.015] hover:-translate-y-px ${
                      style ? style.cls : `bg-white/[0.08] border border-white/10 hover:bg-white/[0.14] ${t.text}`
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden">
                      <LinkLogo src={logoSrc} className="h-full w-full object-contain" />
                    </div>
                    <span className="flex-1 text-left text-sm font-bold leading-tight">
                      {link.title}
                    </span>
                    {isKaspiPay && (
                      <span className="flex-shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white/90 leading-none whitespace-nowrap">
                        Все банки ✓
                      </span>
                    )}
                    <ChevronRight />
                  </TrackableLink>
                </div>
              )
            })}
          </div>
        )
        })()}

      </div>

      {/* Instagram DM engagement prompt — appears after 15s if profile has instagram_dm button */}
      {igPromptHandle && (
        <InstagramDmPrompt igHandle={igPromptHandle} ownerName={profile.business_name} />
      )}

      {/* Attribution pill */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-5">
        <Link
          href={`/?utm_source=profile&utm_medium=footer&utm_campaign=${profile.is_premium ? 'premium' : 'free'}&utm_content=${profile.username}`}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3.5 py-1.5 text-[11px] text-gray-400 backdrop-blur-md transition-colors hover:border-violet-500/40 hover:text-gray-200"
        >
          <Zap className="h-3 w-3 text-violet-400" />
          Сделано на <span className="font-bold text-white">tapni.kz</span>
        </Link>
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
