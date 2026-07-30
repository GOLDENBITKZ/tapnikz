'use client'

import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ChevronDown, Copy, Check, AlertTriangle } from 'lucide-react'
import { COIN_BY_ID, qrPayload, shortenAddress, type WalletEntry } from '@/lib/crypto-wallets'

type Props = {
  linkId: string
  coins: WalletEntry[]
  title: string
  themeCard: string
  themeText?: string
  themeSubtext?: string
}

export function CryptoWalletBlock({ linkId, coins, title, themeCard, themeText, themeSubtext }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  if (coins.length === 0) return null

  function handleToggle() {
    if (!open) fetch(`/api/click?id=${linkId}`).catch(() => {})
    setOpen((v) => !v)
  }

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800)
    } catch { /* clipboard blocked — the address is on screen to select by hand */ }
  }

  const active = coins.find((c) => c.id === selected)
  const activeSpec = active ? COIN_BY_ID.get(active.id) : null

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex w-full items-center gap-3 rounded-2xl border ${themeCard} px-4 py-3.5 text-left transition-transform active:scale-[0.99]`}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-base font-bold text-white">
          ₿
        </span>
        <span className={`flex-1 text-[15px] font-semibold ${themeText ?? ''}`}>{title}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`mt-2 space-y-1.5 rounded-2xl border ${themeCard} p-3`}>
          {coins.map((entry) => {
            const spec = COIN_BY_ID.get(entry.id)
            if (!spec) return null
            const isActive = selected === entry.id
            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelected(isActive ? null : entry.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: spec.color }}
                  >
                    {spec.symbol}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${themeText ?? ''}`}>{spec.ticker}</span>
                    {/* The chain is never hidden behind a tap: USDT on the wrong
                        network is the single most expensive mistake a donor can
                        make here. */}
                    <span className={`block text-[11px] ${themeSubtext ?? 'opacity-60'}`}>{spec.network}</span>
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 opacity-40 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                </button>

                {isActive && activeSpec && active && (
                  <div className="mt-1 space-y-2.5 rounded-xl bg-black/5 p-3 dark:bg-white/5">
                    <div className="flex justify-center">
                      <div className="rounded-xl bg-white p-2.5">
                        <QRCodeCanvas
                          value={qrPayload(active.id, active.address, active.memo)}
                          size={148}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>

                    <p className={`text-center text-[11px] font-medium ${themeSubtext ?? 'opacity-60'}`}>
                      {activeSpec.ticker} · {activeSpec.network}
                    </p>

                    <button
                      type="button"
                      onClick={() => copy(active.address, `${active.id}-addr`)}
                      className={`flex w-full items-center gap-2 rounded-lg border ${themeCard} px-3 py-2.5 text-left`}
                    >
                      <span className={`min-w-0 flex-1 break-all font-mono text-[11px] ${themeText ?? ''}`}>
                        {shortenAddress(active.address)}
                      </span>
                      {copied === `${active.id}-addr`
                        ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                        : <Copy className="h-4 w-4 flex-shrink-0 opacity-50" />}
                    </button>

                    {/* Given its own block in warning colours rather than a line
                        of small print. On TON and the XRP Ledger a transfer to
                        an exchange deposit address without this tag is credited
                        to nobody and is normally unrecoverable — it is part of
                        the address, not a note about it. */}
                    {active.memo && (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
                        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          Обязательно укажите МЕМО
                        </p>
                        <button
                          type="button"
                          onClick={() => copy(active.memo!, `${active.id}-memo`)}
                          className="flex w-full items-center gap-2 rounded-md bg-black/10 px-2.5 py-2 text-left dark:bg-white/10"
                        >
                          <span className={`min-w-0 flex-1 break-all font-mono text-[11px] font-semibold ${themeText ?? ''}`}>
                            {active.memo}
                          </span>
                          {copied === `${active.id}-memo`
                            ? <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />}
                        </button>
                        <p className="mt-1.5 text-[10px] leading-snug text-amber-600/80 dark:text-amber-400/80">
                          Без мемо перевод не дойдёт и вернуть его будет нельзя.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
