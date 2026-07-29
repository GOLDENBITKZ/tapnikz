'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, ArrowRight, CheckCircle2, MessageCircle, CreditCard, MapPin, Send, Camera, Phone, Sparkles, Loader2 } from 'lucide-react'
import type { PageCopy } from '@/lib/page-copy'

type LinkKey = 'whatsapp' | 'instagram' | 'kaspi' | 'twogis' | 'phone' | 'telegram'

// Ordered by what people actually add, measured against live profiles:
// instagram (20 profiles) and whatsapp (18) lead on adoption, whatsapp (533)
// and twogis (133) lead by a wide margin on clicks, and phone sits third on
// adoption (13) but was missing from this form entirely. Kaspi keeps its place
// despite low adoption so far — it is the headline differentiator for this
// market, and four profiles is too little to read as disinterest.
const DEMO_LINKS: { key: LinkKey; label: string; color: string; icon: React.ReactNode; logo: string }[] = [
  { key: 'whatsapp',  label: 'WhatsApp',  color: 'bg-[#25D366]', icon: <MessageCircle className="h-3 w-3 text-white" />, logo: '/logos/whatsapp.svg' },
  { key: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]', icon: <Camera className="h-3 w-3 text-white" />, logo: '/logos/instagram.svg' },
  { key: 'kaspi',     label: 'Kaspi Pay', color: 'bg-gradient-to-br from-[#FF8C00] to-[#F14635]', icon: <CreditCard className="h-3 w-3 text-white" />, logo: '/logos/kaspi_pay.svg' },
  { key: 'twogis',    label: '2ГИС',      color: 'bg-gradient-to-br from-[#00AA4F] to-[#007a38]', icon: <MapPin className="h-3 w-3 text-white" />, logo: '/logos/twogis.svg' },
  { key: 'phone',     label: 'Телефон',   color: 'bg-gradient-to-br from-slate-600 to-slate-800', icon: <Phone className="h-3 w-3 text-white" />, logo: '/logos/phone.svg' },
  { key: 'telegram',  label: 'Telegram',  color: 'bg-[#2AABEE]', icon: <Send className="h-3 w-3 text-white" />, logo: '/logos/telegram.svg' },
]

// Pre-selected so the phone is already a finished page on arrival — the demo
// has to show the result, not an empty screen waiting for input. Instagram was
// the most-added button on the service yet started switched off.
const DEFAULT_ACTIVE: LinkKey[] = ['whatsapp', 'instagram', 'kaspi', 'twogis']

// Platform icons placed in orbit around phone mockup
const ORBIT_ICONS: { logo: string; label: string; color: string; top: string; left: string; delay: string }[] = [
  { logo: '/logos/whatsapp.svg',  label: 'WhatsApp', color: '#25D366', top: '8%',  left: '-18%', delay: '0.2s' },
  { logo: '/logos/kaspi_pay.svg', label: 'Kaspi',    color: '#F14635', top: '28%', left: '110%', delay: '0.4s' },
  { logo: '/logos/twogis.svg',    label: '2GIS',     color: '#1DB256', top: '58%', left: '-18%', delay: '0.6s' },
  { logo: '/logos/telegram.svg',  label: 'Telegram', color: '#2AABEE', top: '72%', left: '110%', delay: '0.8s' },
]

// Once copy is generated the mockup stops being a toggle demo and starts being
// a preview of the page that signup will actually create — same three buttons,
// same words. Showing anything else here would be advertising a different page.
function generatedButtons(copy: PageCopy) {
  return [
    { key: 'whatsapp', label: copy.wa_button, color: 'bg-[#25D366]', logo: '/logos/whatsapp.svg' },
    { key: 'kaspi', label: copy.kaspi_button, color: 'bg-gradient-to-br from-[#FF8C00] to-[#F14635]', logo: '/logos/kaspi_pay.svg' },
    { key: 'offer', label: copy.offer_button, color: 'bg-gradient-to-br from-violet-600 to-violet-700', logo: '' },
  ]
}

function PhoneMockup({ business, active, copy }: { business: string; active: Set<LinkKey>; copy: PageCopy | null }) {
  const displayName = copy?.title || business.trim() || 'Ваш бизнес'
  const activeButtons = copy
    ? generatedButtons(copy)
    : DEMO_LINKS.filter((l) => active.has(l.key)).map((l) => ({ key: l.key as string, label: l.label, color: l.color, logo: l.logo }))

  return (
    <div className="relative mx-auto h-[500px] w-[240px]">
      {/* Outer glow */}
      <div className="absolute -inset-5 rounded-[48px] bg-violet-700/20 blur-2xl" />
      {/* Orbit connection lines (SVG behind phone) */}
      <svg className="pointer-events-none absolute -inset-[60px] h-[620px] w-[360px]" viewBox="0 0 360 620" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <line x1="60" y1="80"  x2="180" y2="180" stroke="#7C3AED" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35" />
        <line x1="300" y1="190" x2="180" y2="220" stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35" />
        <line x1="60" y1="410" x2="180" y2="380" stroke="#25D366" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35" />
        <line x1="300" y1="500" x2="180" y2="450" stroke="#2AABEE" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35" />
      </svg>
      {/* Orbit icons */}
      {ORBIT_ICONS.map((o) => (
        <div
          key={o.label}
          className="animate-fade-in absolute flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
          style={{
            top: o.top,
            left: o.left,
            backgroundColor: `${o.color}18`,
            border: `1.5px solid ${o.color}35`,
            animationDelay: o.delay,
          }}
        >
          <img src={o.logo} alt={o.label} width={22} height={22} className="h-[22px] w-[22px] object-contain" />
        </div>
      ))}
      {/* Phone shell */}
      <div className="absolute inset-0 rounded-[40px] border-[5px] border-gray-700/80 bg-[#0c0c18] shadow-2xl shadow-black/70" />
      {/* Screen */}
      <div className="absolute inset-[5px] overflow-hidden rounded-[35px] bg-[#0c0c18]">
        {/* Ambient glow */}
        <div className="absolute left-1/2 top-0 h-48 w-44 -translate-x-1/2 rounded-full bg-violet-600/20 blur-2xl" />
        {/* Status bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-2.5">
          <span className="text-[7px] font-semibold text-gray-500">9:41</span>
          <div className="absolute left-1/2 h-4 w-16 -translate-x-1/2 rounded-b-xl bg-gray-800" />
          <div className="flex items-center gap-0.5">
            <div className="h-[5px] w-[3px] rounded-sm bg-gray-500" />
            <div className="h-[6px] w-[3px] rounded-sm bg-gray-500" />
            <div className="h-[7px] w-[3px] rounded-sm bg-gray-400" />
            <div className="ml-1 h-[6px] w-5 rounded-sm border border-gray-600 p-px">
              <div className="h-full w-2/3 rounded-sm bg-gray-400" />
            </div>
          </div>
        </div>
        {/* Scrollable content area */}
        <div className="absolute inset-0 top-6 flex flex-col items-center overflow-hidden px-4 pb-8 pt-4">
          {/* Avatar */}
          <div className="relative mb-2 mt-1">
            <div className="absolute -inset-2 rounded-full bg-violet-500/20 blur-lg" />
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="relative h-14 w-14 rounded-full object-cover ring-2 ring-white/15" width={56} height={56} />
          </div>
          {/* Name — live from input */}
          <p className="mb-0.5 max-w-full truncate px-2 text-center text-[11px] font-extrabold tracking-tight text-white transition-all duration-150">
            {displayName.toUpperCase()}
          </p>
          {/* Bio */}
          <p className="mb-1 px-1 text-center text-[7px] leading-relaxed text-gray-400">
            {copy?.bio || 'Мобильная визитка в Казахстане'}
          </p>
          {/* Address — a placeholder city is only honest while nothing real is shown */}
          {!copy && (
            <p className="mb-1 flex items-center gap-0.5 text-[7px] text-gray-500">
              <svg className="h-2.5 w-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              г. Алматы
            </p>
          )}
          {/* Username */}
          <p className="mb-2 text-[6.5px] text-gray-600 opacity-60">tapni.kz/ваш-ник</p>
          {/* Share */}
          <div className="mb-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-3 py-1">
            <svg className="h-2.5 w-2.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span className="text-[7px] font-medium text-gray-400">Поделиться</span>
          </div>
          {/* Buttons — live from active Set */}
          <div className="flex w-full flex-col gap-1.5">
            {activeButtons.map((b) => (
              <div key={b.key} className={`flex animate-btn-appear items-center gap-2 rounded-xl ${b.color} px-2.5 py-1.5`}>
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md overflow-hidden">
                  {b.logo ? (
                    <img src={b.logo} alt="" width={20} height={20} className="h-full w-full object-contain" />
                  ) : (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                  )}
                </div>
                <span className="flex-1 text-[7.5px] font-bold leading-tight text-white">{b.label}</span>
                <svg className="h-2.5 w-2.5 opacity-40 text-white" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            ))}
            {activeButtons.length === 0 && (
              <p className="py-3 text-center text-[7px] text-gray-600">Выберите кнопки выше</p>
            )}
          </div>
        </div>
        {/* Bottom pill */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
            <svg className="h-2.5 w-2.5 text-violet-400" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span className="text-[6.5px] font-medium text-gray-400">Сделано на <span className="font-bold text-white">tapni.kz</span></span>
          </div>
        </div>
      </div>
      {/* Phone buttons */}
      <div className="absolute -right-[6px] top-24 h-10 w-[4px] rounded-r-sm bg-gray-700" />
      <div className="absolute -left-[6px] top-16 h-7 w-[4px] rounded-l-sm bg-gray-700" />
      <div className="absolute -left-[6px] top-28 h-7 w-[4px] rounded-l-sm bg-gray-700" />
    </div>
  )
}

const GEN_ERRORS: Record<string, string> = {
  rate_limited: 'На сегодня хватит генераций. Попробуйте через час.',
  prompt_too_short: 'Опишите бизнес чуть подробнее.',
  timeout: 'Долго не отвечает. Попробуйте ещё раз.',
  busy: 'Сейчас много запросов. Попробуйте через минуту.',
  unavailable: 'Генератор временно недоступен.',
}

export function LandingHero({ profileCount }: { profileCount?: number }) {
  const [business, setBusiness] = useState('')
  const [phone, setPhone] = useState('')
  const [active, setActive] = useState<Set<LinkKey>>(new Set(DEFAULT_ACTIVE))
  const [copy, setCopy] = useState<PageCopy | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  function toggle(key: LinkKey) {
    setActive((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function generate() {
    if (business.trim().length < 3 || generating) return
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: business.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(GEN_ERRORS[data?.error] ?? 'Не получилось. Попробуйте ещё раз.')
        return
      }
      setCopy(data as PageCopy)
    } catch {
      setGenError('Нет связи. Проверьте интернет.')
    } finally {
      setGenerating(false)
    }
  }

  // Handed to /auth through sessionStorage rather than the query string: six
  // fields of Russian prose percent-encode into well over a browser's comfort,
  // and none of it belongs in a shareable, logged URL.
  function handOff() {
    if (typeof window === 'undefined') return
    try {
      if (copy) {
        window.sessionStorage.setItem('tapni_copy', JSON.stringify({ copy, phone: phone.trim() }))
      } else {
        window.sessionStorage.removeItem('tapni_copy')
      }
    } catch { /* private mode — signup still works, just without the head start */ }
  }

  const ctaName = copy?.title || business.trim()

  return (
    <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-16">
      {/* Left: text + interactive form */}
      <div>
        {/* Eyebrow label */}
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-1.5 text-xs font-semibold text-violet-600 animate-fade-up">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {profileCount && profileCount > 20
            ? `${profileCount.toLocaleString('ru-RU')} предпринимателей уже здесь`
            : 'Для бизнеса и блогеров Казахстана'}
        </p>

        <h1 className="mb-5 animate-fade-up animation-delay-75 text-[2.6rem] font-black leading-[1.0] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem]">
          Мобильная<br />
          визитка с{' '}
          <span className="bg-gradient-to-r from-violet-600 via-violet-500 to-amber-500 bg-clip-text text-transparent">
            WhatsApp,<br className="hidden sm:block" /> 2ГИС и Kaspi
          </span>
        </h1>

        <p className="mb-7 animate-fade-up animation-delay-150 text-base leading-relaxed text-gray-500">
          Одна ссылка <span className="font-semibold text-gray-700">tapni.kz/ваш-ник</span> — клиенты сразу видят все контакты. Создать за 60 секунд, бесплатно.
        </p>

        {/* Interactive demo */}
        <div className="animate-fade-up animation-delay-250 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm shadow-gray-100">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Попробуй прямо сейчас</p>
          <input
            type="text"
            value={business}
            onChange={(e) => { setBusiness(e.target.value); setCopy(null); setGenError('') }}
            placeholder="Например: пеку торты на заказ, Шымкент"
            maxLength={120}
            className="mb-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />

          <button
            type="button"
            onClick={generate}
            disabled={business.trim().length < 3 || generating}
            className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all duration-150 hover:bg-violet-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Собираю страницу…' : copy ? 'Собрать заново' : 'Собрать страницу за меня'}
          </button>
          <p className="mb-3 text-center text-[11px] text-gray-400">
            {copy ? 'Всё можно изменить после регистрации' : 'Напишем тексты и кнопки — бесплатно, без регистрации'}
          </p>

          {genError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-600">{genError}</p>
          )}

          {copy ? (
            <>
              <label className="mb-1 block text-xs text-gray-400">
                Ваш WhatsApp — кнопка сразу заработает
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 700 000 00 00"
                maxLength={20}
                className="mb-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </>
          ) : (
            <>
              <p className="mb-2 text-xs text-gray-400">Или выбери кнопки вручную:</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {DEMO_LINKS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => toggle(l.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.96] ${
                      active.has(l.key)
                        ? 'bg-violet-600 text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    }`}
                  >
                    <CheckCircle2 className={`h-3 w-3 transition-opacity ${active.has(l.key) ? 'opacity-100' : 'opacity-0'}`} />
                    {l.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <Link
            href={`/auth?name=${encodeURIComponent(ctaName)}&tab=register`}
            onClick={handOff}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all duration-200 hover:bg-amber-400 active:scale-[0.98] animate-amber-glow"
          >
            <Zap className="h-4 w-4" />
            {copy ? 'Забрать эту страницу' : 'Создать такую страницу'}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-center text-[11px] text-gray-400">
            Без карты · Без кода · За 60 секунд
          </p>
        </div>
      </div>

      {/* Right: phone mockup with orbit icons */}
      <div className="flex justify-center lg:justify-end">
        <div className="relative">
          <div className="absolute -bottom-10 left-1/2 h-48 w-56 -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
          <div className="scale-[0.78] origin-top -mb-[88px] sm:scale-90 sm:-mb-[42px] lg:scale-100 lg:mb-0">
            <PhoneMockup business={business} active={active} copy={copy} />
          </div>
        </div>
      </div>
    </div>
  )
}
