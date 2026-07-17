'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  src: string
  alt: string
  title: string
  linkId: string
  hasLink: boolean
  linkHref?: string
}

export function ImageExpandBlock({ src, alt, title, hasLink, linkHref }: Props) {
  const [open, setOpen] = useState(false)

  const imgEl = (
    <img
      src={src}
      alt={alt}
      className="w-full rounded-2xl object-cover"
      loading="lazy"
    />
  )

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.07] px-3 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] hover:bg-white/[0.12]"
      >
        {/* thumbnail */}
        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
          <img src={src} alt="" className="h-full w-full object-cover" aria-hidden />
        </div>
        {/* title */}
        <span className="flex-1 text-left">{title || 'Показать изображение'}</span>
        {/* chevron */}
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="mt-2">
          {hasLink ? (
            <a
              href={linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-opacity active:opacity-80 hover:opacity-95"
            >
              {imgEl}
            </a>
          ) : imgEl}
        </div>
      )}
    </div>
  )
}
