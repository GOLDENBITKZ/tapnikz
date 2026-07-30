'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'

type State =
  | { status: 'loading' }
  | { status: 'verified' }
  | { status: 'pending'; url: string; phone: string; graceUntil: string | null }
  | { status: 'error' }

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

/**
 * Sits at the top of the dashboard until the number is proved.
 *
 * Deliberately not dismissible while the page is unpublished: the owner can
 * spend an afternoon adding buttons to a page nobody can open, and a banner
 * they closed an hour ago will not tell them why.
 */
export function VerifyPhoneBanner({ accessToken }: { accessToken: string | null }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    fetch('/api/verify-link', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d.verified) setState({ status: 'verified' })
        else if (d.url) setState({ status: 'pending', url: d.url, phone: d.phone ?? '', graceUntil: d.graceUntil ?? null })
        else setState({ status: 'error' })
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [accessToken])

  if (state.status !== 'pending') return null

  const grace = state.graceUntil ? daysLeft(state.graceUntil) : null
  const live = grace !== null && grace > 0

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${live ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
      <div className="mb-2 flex items-start gap-2.5">
        {live
          ? <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          : <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />}
        <div className="min-w-0">
          <p className={`text-sm font-bold ${live ? 'text-amber-800' : 'text-red-800'}`}>
            {live
              ? `Подтвердите номер — осталось ${grace} ${grace === 1 ? 'день' : grace < 5 ? 'дня' : 'дней'}`
              : 'Страница не опубликована'}
          </p>
          <p className={`mt-1 text-[13px] leading-relaxed ${live ? 'text-amber-700' : 'text-red-700'}`}>
            {live
              ? `Ваша страница работает, но после этого срока откроется только с подтверждённым номером.`
              : `Пока номер +${state.phone} не подтверждён, tapni.kz/… не открывается у посетителей. Настраивать страницу можно уже сейчас.`}
          </p>
        </div>
      </div>

      <a
        href={state.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#229ED9] active:scale-[0.99]"
      >
        Подтвердить в Telegram
      </a>
      <p className="mt-2 text-center text-[11px] text-gray-500">
        Откроется бот — нажмите «Поделиться номером». Занимает 10 секунд.
      </p>
    </div>
  )
}

export function VerifyPhoneSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
}
