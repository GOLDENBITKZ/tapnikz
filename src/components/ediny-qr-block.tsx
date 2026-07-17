'use client'

import { useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ChevronDown, Download, Copy, Check } from 'lucide-react'

type Props = {
  linkId: string
  url: string
  title: string
  username?: string
  themeText?: string
}

export function EdinyyQrBlock({ linkId, url, title, themeText }: Props) {
  // QR encodes the raw pay.kaspi.kz URL so any bank app can scan and pay directly.
  // The "Открыть в Kaspi" button handles OS-aware intent routing separately.
  const qrValue = url
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  function handleToggle() {
    if (!open) fetch(`/api/click?id=${linkId}`).catch(() => {})
    setOpen(v => !v)
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

  // Saves QR as PNG — mobile users can then open their bank app,
  // tap "Scan QR" → "From gallery" to pay without being on Kaspi
  function handleDownloadQr() {
    const canvas = qrContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement('a')
    a.download = 'ediny-qr-oplata.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  if (!url.startsWith('https://')) return null

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        style={open ? undefined : { boxShadow: '0 6px 24px rgba(26,86,219,0.40)' }}
        className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-all duration-150 active:scale-[0.97] hover:opacity-90 hover:scale-[1.015] hover:-translate-y-px bg-gradient-to-br from-[#1A56DB] to-[#0F3D9E] ${open ? 'rounded-b-none' : ''}`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/20">
          <img src="/logos/ediny_qr.svg" alt="" width={40} height={40} className="h-full w-full object-contain" aria-hidden />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-bold leading-tight truncate">{title || 'Оплата — любой банк'}</div>
          <div className="mt-0.5 text-[10px] font-medium text-white/55 truncate">Kaspi · Halyk · BCC · Freedom · Altyn</div>
        </div>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 opacity-75 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="flex flex-col items-center gap-4 rounded-b-2xl border border-t-0 border-white/10 bg-white/[0.04] px-6 py-6">

          {/* QR code */}
          <div ref={qrContainerRef} className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(26,86,219,0.18)]">
            <QRCodeCanvas
              value={qrValue}
              size={176}
              level="M"
              bgColor="#ffffff"
              fgColor="#111111"
              style={{ display: 'block' }}
            />
          </div>

          <p className={`text-center text-xs opacity-55 ${themeText ?? 'text-white'}`}>
            Сканируйте через приложение вашего банка
          </p>

          {/* Kaspi deep-link — fastest for Kaspi users */}
          <a
            href={url}
            onClick={handleOpenKaspi}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#F14635] py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,140,0,0.30)] transition-opacity active:opacity-80 hover:opacity-90"
          >
            Открыть в Kaspi
          </a>

          {/* Secondary actions for other-bank mobile users */}
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] py-2.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.1] active:opacity-70"
            >
              <Download className="h-3.5 w-3.5 flex-shrink-0" />
              Сохранить QR
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] py-2.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.1] active:opacity-70"
            >
              {copied
                ? <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-400" />
                : <Copy className="h-3.5 w-3.5 flex-shrink-0" />}
              {copied ? 'Скопировано!' : 'Скопировать'}
            </button>
          </div>

          {/* UX hint for non-Kaspi mobile users */}
          <p className={`text-center text-[10px] leading-relaxed opacity-35 ${themeText ?? 'text-white'}`}>
            Другой банк на телефоне? Сохраните QR → откройте приложение банка → «Сканировать» → выберите из галереи
          </p>
        </div>
      )}
    </div>
  )
}
