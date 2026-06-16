'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, ArrowRight, CheckCircle2, MessageCircle, CreditCard, MapPin, Send, Camera } from 'lucide-react'

type LinkKey = 'whatsapp' | 'kaspi' | 'twogis' | 'telegram' | 'instagram'

const DEMO_LINKS: { key: LinkKey; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'whatsapp',  label: 'WhatsApp',  color: 'bg-[#25D366]', icon: <MessageCircle className="h-3 w-3 text-white" /> },
  { key: 'kaspi',     label: 'Kaspi Pay', color: 'bg-[#F14635]', icon: <CreditCard className="h-3 w-3 text-white" /> },
  { key: 'twogis',    label: '2ГИС',      color: 'bg-[#1CAC4B]', icon: <MapPin className="h-3 w-3 text-white" /> },
  { key: 'telegram',  label: 'Telegram',  color: 'bg-[#2AABEE]', icon: <Send className="h-3 w-3 text-white" /> },
  { key: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]', icon: <Camera className="h-3 w-3 text-white" /> },
]

function PhoneMockup({ business, active }: { business: string; active: Set<LinkKey> }) {
  const name = business.trim() || 'Ваш бизнес'
  const shown = DEMO_LINKS.filter((l) => active.has(l.key))
  return (
    <div className="relative mx-auto h-[420px] w-[205px]">
      <div className="absolute inset-0 rounded-[36px] border-[5px] border-gray-700 bg-[#0c0c1a] shadow-2xl shadow-violet-900/50" />
      <div className="absolute inset-[5px] overflow-hidden rounded-[31px] bg-[#0c0c1a]">
        <div className="absolute left-1/2 top-0 h-36 w-36 -translate-x-1/2 rounded-full bg-violet-700/25 blur-2xl" />
        <div className="absolute left-1/2 top-0 h-4 w-16 -translate-x-1/2 rounded-b-xl bg-gray-800" />
        <div className="flex h-full flex-col items-center px-4 pb-4 pt-8">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
            <span className="text-lg font-extrabold text-violet-700">{name.charAt(0).toUpperCase()}</span>
          </div>
          <p className="mb-0.5 text-center text-[10px] font-bold text-white leading-tight">{name}</p>
          <p className="mb-3.5 text-[8px] text-gray-500">tapni.kz/ваш-ник</p>
          <div className="flex w-full flex-col gap-1.5">
            {shown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 py-4 text-center">
                <p className="text-[8px] text-gray-500">Выберите кнопки слева</p>
              </div>
            ) : (
              shown.map((l) => (
                <div key={l.key} className={`flex items-center gap-1.5 rounded-lg ${l.color} px-2.5 py-1.5`}>
                  {l.icon}
                  <span className="text-[8px] font-bold text-white">{l.label}</span>
                </div>
              ))
            )}
          </div>
          <p className="mt-auto text-[7px] text-gray-700">⚡ tapni.kz</p>
        </div>
      </div>
      <div className="absolute -right-[6px] top-20 h-9 w-[4px] rounded-r-sm bg-gray-700" />
      <div className="absolute -left-[6px] top-14 h-6 w-[4px] rounded-l-sm bg-gray-700" />
      <div className="absolute -left-[6px] top-[100px] h-6 w-[4px] rounded-l-sm bg-gray-700" />
    </div>
  )
}

export function LandingHero() {
  const [business, setBusiness] = useState('')
  const [active, setActive] = useState<Set<LinkKey>>(new Set(['whatsapp', 'kaspi', 'twogis']))

  function toggle(key: LinkKey) {
    setActive((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
      {/* Left: text + interactive form */}
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          Лучшая альтернатива Taplink для Казахстана
        </div>

        <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          Мобильная визитка с{' '}
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Kaspi, 2ГИС и WhatsApp
          </span>{' '}
          для бизнеса в Казахстане
        </h1>

        <p className="mb-6 text-base leading-relaxed text-gray-400">
          Одна ссылка <strong className="text-gray-200">tapni.kz/ваш-ник</strong> в Instagram bio — клиенты сразу видят
          Kaspi Pay, 2ГИС, WhatsApp, Telegram и другие контакты. Создать за 60 секунд, бесплатно.
        </p>

        {/* Interactive demo */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Попробуй прямо сейчас</p>
          <input
            type="text"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Название вашего бизнеса"
            maxLength={40}
            className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
          />
          <p className="mb-2 text-xs text-gray-500">Выбери кнопки:</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {DEMO_LINKS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggle(l.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.96] ${
                  active.has(l.key)
                    ? 'bg-violet-600 text-white'
                    : 'border border-white/10 bg-white/[0.05] text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <CheckCircle2 className={`h-3 w-3 transition-opacity ${active.has(l.key) ? 'opacity-100' : 'opacity-0'}`} />
                {l.label}
              </button>
            ))}
          </div>
          <Link
            href="/auth"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            Создать страницу бесплатно
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-center text-[11px] text-gray-600">
            Без карты · Без кода · За 60 секунд
          </p>
        </div>
      </div>

      {/* Right: phone mockup — negative margin compensates for layout space kept by CSS scale */}
      <div className="flex justify-center lg:justify-end">
        <div className="relative">
          <div className="absolute -bottom-10 left-1/2 h-48 w-56 -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
          <div className="scale-[0.78] origin-top -mb-[88px] sm:scale-90 sm:-mb-[42px] lg:scale-100 lg:mb-0">
            <PhoneMockup business={business} active={active} />
          </div>
        </div>
      </div>
    </div>
  )
}
