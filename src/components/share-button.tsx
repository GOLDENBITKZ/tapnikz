'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  url: string
  title: string
  className?: string
}

export function ShareButton({ url, title, className }: ShareButtonProps) {
  const [state, setState] = useState<'idle' | 'copied'>('idle')

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url, text: `${title} — ${url}` })
        return
      } catch {
        // user cancelled or API not available — fall through
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      // clipboard denied — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={className}
    >
      {state === 'copied' ? (
        <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
      ) : state === 'idle' && typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
        <Share2 className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      {state === 'copied' ? 'Скопировано!' : 'Поделиться'}
    </button>
  )
}
