'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FaqItem { q: string; a: string }

interface Props {
  linkId: string
  title: string
  items: FaqItem[]
  themeText: string
  themeSubtext: string
}

export function FaqBlock({ linkId, title, items, themeText, themeSubtext }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  function handleToggle() {
    if (!open) {
      fetch(`/api/click?id=${linkId}`).catch(() => {})
    }
    setOpen((v) => !v)
    if (open) setActiveIdx(null)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        style={open ? undefined : { boxShadow: '0 6px 24px rgba(99,102,241,0.40)' }}
        className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-white transition-all duration-150 active:scale-[0.97] hover:opacity-90 hover:scale-[1.015] hover:-translate-y-px bg-gradient-to-br from-indigo-500 to-violet-600 ${open ? 'rounded-b-none' : ''}`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/20">
          <img src="/logos/faq.svg" alt="" width={40} height={40} className="h-full w-full object-contain" aria-hidden />
        </div>
        <span className="flex-1 text-left text-sm font-bold leading-tight">{title || 'Часто задаваемые вопросы'}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 opacity-80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="overflow-hidden rounded-b-2xl border border-t-0 border-white/10 bg-white/[0.04]">
          {items.map((item, i) => (
            <div key={i} className={i < items.length - 1 ? 'border-b border-white/[0.06]' : ''}>
              <button
                type="button"
                onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-opacity hover:opacity-80"
              >
                <span className={`text-sm font-medium ${themeText}`}>{item.q}</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 opacity-40 transition-transform duration-200 ${activeIdx === i ? 'rotate-180' : ''}`} />
              </button>
              {activeIdx === i && (
                <div className={`px-5 pb-4 text-sm leading-relaxed ${themeSubtext} opacity-80`}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
