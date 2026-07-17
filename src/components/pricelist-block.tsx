'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface PriceItem { name: string; price: string; desc?: string }

interface Props {
  linkId: string
  title: string
  items: PriceItem[]
  themeText: string
  themeSubtext: string
}

export function PricelistBlock({ linkId, title, items, themeText, themeSubtext }: Props) {
  const [open, setOpen] = useState(false)

  function handleToggle() {
    if (!open) {
      fetch(`/api/click?id=${linkId}`).catch(() => {})
    }
    setOpen((v) => !v)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        style={open ? undefined : { boxShadow: '0 6px 24px rgba(16,185,129,0.40)' }}
        className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-all duration-150 active:scale-[0.97] hover:opacity-90 hover:scale-[1.015] hover:-translate-y-px bg-gradient-to-br from-emerald-500 to-teal-600 ${open ? 'rounded-b-none' : ''}`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/20">
          <img src="/logos/pricelist.svg" alt="" width={40} height={40} className="h-full w-full object-contain" aria-hidden />
        </div>
        <span className="flex-1 text-left text-sm font-bold leading-tight">{title}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 opacity-80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="overflow-hidden rounded-b-2xl border border-t-0 border-white/10 bg-white/[0.04]">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-baseline justify-between gap-3 px-5 py-3 ${i < items.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${themeText}`}>{item.name}</p>
                {item.desc && <p className={`mt-0.5 text-xs ${themeSubtext} opacity-55`}>{item.desc}</p>}
              </div>
              <p className={`flex-shrink-0 text-sm font-bold ${themeText}`}>{item.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
