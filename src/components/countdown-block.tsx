'use client'

import { useEffect, useState } from 'react'

interface Props {
  target: string
  label: string
  themeCard: string
  themeText: string
  themeSubtext: string
}

function getRemaining(target: string) {
  const ts = new Date(target).getTime()
  if (isNaN(ts)) return null
  const diff = ts - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s }
}

export function CountdownBlock({ target, label, themeCard, themeText, themeSubtext }: Props) {
  const [rem, setRem] = useState(() => getRemaining(target))

  useEffect(() => {
    const t = setInterval(() => setRem(getRemaining(target)), 1000)
    return () => clearInterval(t)
  }, [target])

  return (
    <div className={`overflow-hidden rounded-2xl border ${themeCard} p-4`}>
      <p className={`mb-3 text-center text-[11px] uppercase tracking-wider font-semibold ${themeSubtext} opacity-60`}>
        {label}
      </p>
      {rem ? (
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: rem.d, u: 'дн' },
            { v: rem.h, u: 'ч' },
            { v: rem.m, u: 'мин' },
            { v: rem.s, u: 'сек' },
          ].map(({ v, u }) => (
            <div key={u} className={`flex flex-col items-center rounded-xl border ${themeCard} py-2`}>
              <span className={`text-2xl font-extrabold tabular-nums leading-none ${themeText}`}>
                {String(v).padStart(2, '0')}
              </span>
              <span className={`mt-0.5 text-[10px] ${themeSubtext} opacity-50`}>{u}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-center text-base font-bold ${themeText}`}>🎉 Акция началась!</p>
      )}
    </div>
  )
}
