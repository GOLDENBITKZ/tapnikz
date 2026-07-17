'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  url: string
  title?: string
  className?: string
}

export function ShareButton({ url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
        : <Copy className="h-3.5 w-3.5 flex-shrink-0" />
      }
      {copied ? 'Скопировано!' : 'Поделиться'}
    </button>
  )
}
