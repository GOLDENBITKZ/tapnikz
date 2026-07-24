'use client'

import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ChevronDown } from 'lucide-react'

type Props = {
  linkId: string
  url: string
  title: string
  themeCard: string
  themeText?: string
}

export function KaspiQrBlock({ linkId, url, title, themeCard, themeText }: Props) {
  const [open, setOpen] = useState(false)

  function handleToggle() {
    if (!open) {
      fetch(`/api/click?id=${linkId}`).catch(() => {})
    }
    setOpen((v) => !v)
  }

  function handleOpenKaspi(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const ua = navigator.userAgent
    if (/Android/i.test(ua)) {
      try {
        const { hostname, pathname } = new URL(url)
        const fallback = encodeURIComponent(url)
        window.location.href = `intent://${hostname}${pathname}#Intent;scheme=https;package=kz.kaspi.mobile;S.browser_fallback_url=${fallback};end`
        return
      } catch { /* fall through */ }
    }
    window.location.href = url
  }

  if (!url.startsWith('https://')) return null

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        style={open ? undefined : { boxShadow: '0 6px 24px rgba(255,140,0,0.45)' }}
        className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-all duration-150 active:scale-[0.97] hover:opacity-90 hover:scale-[1.015] hover:-translate-y-px bg-gradient-to-br from-[#FF8C00] to-[#F14635] ${open ? 'rounded-b-none' : ''}`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/20">
          <img src="/logos/kaspi_pay.svg" alt="" width={40} height={40} className="h-full w-full object-contain" aria-hidden />
        </div>
        <span className="flex-1 text-left text-sm font-bold leading-tight">
          {title || 'Оплата через Kaspi Pay'}
        </span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 opacity-80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`flex flex-col items-center gap-4 rounded-b-2xl border border-t-0 ${themeCard} px-6 py-6`}>
          <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(255,140,0,0.15)]">
            <QRCodeCanvas
              value={url}
              size={176}
              level="M"
              bgColor="#ffffff"
              fgColor="#111111"
              style={{ display: 'block' }}
            />
          </div>

          <p className={`text-center text-xs opacity-60 ${themeText ?? ''}`}>
            Наведите камеру Kaspi.kz для оплаты
          </p>

          <a
            href={url}
            onClick={handleOpenKaspi}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#F14635] py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,140,0,0.30)] transition-opacity active:opacity-80 hover:opacity-90"
          >
            Открыть в Kaspi
          </a>
        </div>
      )}
    </div>
  )
}
