'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MilestoneData } from '@/app/api/milestone/route'

interface Props {
  linkId: string
  title: string
  initial: MilestoneData
  themeCard: string
  themeText: string
  themeSubtext: string
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0с'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}ч ${m}мин`
  if (m > 0) return `${m}мин ${s}с`
  return `${s}с`
}

export function MilestoneBlock({ linkId, title, initial, themeCard, themeText, themeSubtext }: Props) {
  const [data, setData] = useState<MilestoneData>(initial)
  const [timeLeft, setTimeLeft] = useState(initial.time_left_seconds)
  const [shared, setShared] = useState(false)

  const pct = data.goal > 0 ? Math.min(100, Math.round((data.current / data.goal) * 100)) : 0

  // Countdown — tick every second. timeLeft intentionally excluded from deps:
  // the functional updater form (t => t - 1) never reads the closure variable,
  // so including it would cancel+restart the interval on every tick.
  useEffect(() => {
    if (data.unlocked || data.expired || timeLeft <= 0) return
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.unlocked, data.expired])

  // Poll API every 20s for live view_count updates
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/milestone?id=${linkId}`)
      if (!res.ok) return
      const d: MilestoneData = await res.json()
      setData(d)
      setTimeLeft(d.time_left_seconds)
    } catch {}
  }, [linkId])

  useEffect(() => {
    if (data.unlocked || data.expired) return
    const interval = setInterval(refresh, 20_000)
    return () => clearInterval(interval)
  }, [data.unlocked, data.expired, refresh])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: title || 'Помоги разблокировать скидку!', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => { setShared(true); setTimeout(() => setShared(false), 2000) }).catch(() => {})
    }
  }

  // ── UNLOCKED ──────────────────────────────────────────────────────────────
  if (data.unlocked) {
    return (
      <div className={`overflow-hidden rounded-2xl border ${themeCard}`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-green-500" />
        <div className="space-y-3 p-5 text-center">
          <p className="text-2xl leading-none">🎉</p>
          <div>
            <p className={`font-extrabold text-base ${themeText}`}>Разблокировано!</p>
            <p className={`mt-0.5 text-xs ${themeSubtext} opacity-60`}>{title}</p>
          </div>
          <p className={`text-xs ${themeSubtext} opacity-50`}>{data.current.toLocaleString()}+ просмотров собрано 🔥</p>
          {data.reward_code && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Промокод</p>
              <p className="mt-0.5 text-xl font-extrabold tracking-widest text-emerald-300">{data.reward_code}</p>
            </div>
          )}
          {data.reward_url && (
            <a
              href={data.reward_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              {data.reward_label || title || 'Использовать скидку'} →
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── EXPIRED ───────────────────────────────────────────────────────────────
  if (data.expired) {
    return (
      <div className={`overflow-hidden rounded-2xl border ${themeCard} opacity-55`}>
        <div className="h-1.5 w-full bg-gray-700" />
        <div className="space-y-1.5 p-4">
          <p className={`font-bold text-sm ${themeText}`}>⏰ Время вышло</p>
          <p className={`text-xs ${themeSubtext} opacity-70`}>{title}</p>
          <p className={`text-xs ${themeSubtext} opacity-40`}>
            Собрано {data.current.toLocaleString()} из {data.goal.toLocaleString()} просмотров
          </p>
        </div>
      </div>
    )
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  return (
    <div className={`overflow-hidden rounded-2xl border ${themeCard}`}>
      {/* Animated gradient top bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400" />

      <div className="space-y-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-extrabold text-sm leading-tight ${themeText}`}>
              🚀 {title || 'Вирусный вызов'}
            </p>
            {data.reward_label && (
              <p className={`mt-0.5 text-xs ${themeSubtext} opacity-60`}>{data.reward_label}</p>
            )}
          </div>
          <span className={`flex-shrink-0 rounded-lg bg-violet-500/15 px-2 py-0.5 text-[11px] font-bold text-violet-300`}>
            {pct}%
          </span>
        </div>

        {/* Counter + progress bar */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-extrabold tabular-nums ${themeText}`}>
                {data.current.toLocaleString()}
              </span>
              <span className={`text-sm ${themeSubtext} opacity-40`}>
                / {data.goal.toLocaleString()}
              </span>
            </div>
            <span className={`text-[11px] ${themeSubtext} opacity-40`}>просмотров</span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        </div>

        {/* Countdown + share button */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 text-xs ${themeSubtext}`}>
            <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-violet-400" />
            Осталось {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleShare}
            className="flex-shrink-0 rounded-lg bg-violet-500/20 px-3 py-1.5 text-[11px] font-bold text-violet-300 transition-colors hover:bg-violet-500/30 active:scale-[0.97]"
          >
            {shared ? '✓ Скопировано!' : 'Переслать 📤'}
          </button>
        </div>

        {/* Motivational hint */}
        <p className={`text-center text-[10px] ${themeSubtext} opacity-35 leading-relaxed`}>
          Поделитесь с друзьями — соберём {data.goal.toLocaleString()} просмотров и разблокируем вместе!
        </p>
      </div>
    </div>
  )
}
