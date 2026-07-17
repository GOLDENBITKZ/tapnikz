'use client'

import { useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ChevronDown, Download, Copy, Check, ExternalLink } from 'lucide-react'

type SmartQrData = { ios?: string; android?: string; web?: string; label?: string }

type Props = {
  linkId: string
  data: SmartQrData
  title: string
  themeText?: string
}

export function SmartQrBlock({ linkId, data, title, themeText }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  const qrUrl = `https://tapni.kz/qr/l/${linkId}`
  const label = title || data.label || 'Открыть приложение'

  function handleToggle() {
    if (!open) fetch(`/api/click?id=${linkId}`).catch(() => {})
    setOpen(v => !v)
  }

  function handleOpenApp(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const ua = navigator.userAgent
    if (/Android/i.test(ua) && data.android) {
      window.location.href = `https://tapni.kz/qr/l/${linkId}`
      return
    }
    if (/iPhone|iPad|iPod/i.test(ua) && data.ios) {
      window.location.href = data.ios
      return
    }
    if (data.web) window.location.href = data.web
  }

  function handleDownloadQr() {
    const canvas = qrContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `smart-qr-${linkId.slice(0, 8)}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const hasAny = !!(data.ios || data.android || data.web)
  if (!hasAny) return null

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        style={open ? undefined : { boxShadow: '0 6px 24px rgba(124,58,237,0.35)' }}
        className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-all duration-150 active:scale-[0.97] hover:opacity-90 hover:scale-[1.015] hover:-translate-y-px bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] ${open ? 'rounded-b-none' : ''}`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl">
          📲
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-bold leading-tight truncate">{label}</div>
          <div className="mt-0.5 text-[10px] font-medium text-white/55 truncate">
            {[data.ios && 'iOS', data.android && 'Android', data.web && 'Web'].filter(Boolean).join(' · ')}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 opacity-75 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="flex flex-col items-center gap-4 rounded-b-2xl border border-t-0 border-white/10 bg-white/[0.04] px-6 py-6">
          <div ref={qrContainerRef} className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(124,58,237,0.18)]">
            <QRCodeCanvas
              value={qrUrl}
              size={176}
              level="M"
              bgColor="#ffffff"
              fgColor="#111111"
              style={{ display: 'block' }}
            />
          </div>

          <p className={`text-center text-xs opacity-55 ${themeText ?? 'text-white'}`}>
            Сканируйте, чтобы открыть на вашем устройстве
          </p>

          <a
            href={data.web || '#'}
            onClick={handleOpenApp}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(124,58,237,0.30)] transition-opacity active:opacity-80 hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
            {label}
          </a>

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
              {copied ? <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-400" /> : <Copy className="h-3.5 w-3.5 flex-shrink-0" />}
              {copied ? 'Скопировано!' : 'Скопировать'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
