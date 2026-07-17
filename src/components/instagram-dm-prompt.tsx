'use client'

import { useState, useEffect } from 'react'

interface Props {
  igHandle: string
  ownerName: string
}

export function InstagramDmPrompt({ igHandle, ownerName }: Props) {
  const [visible, setVisible] = useState(false)
  const key = `tapni-ig-prompt-${igHandle}`

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(key)
      if (dismissed && Date.now() - parseInt(dismissed) < 86_400_000) return
    } catch {}
    const t = setTimeout(() => setVisible(true), 15_000)
    return () => clearTimeout(t)
  }, [key])

  if (!visible) return null

  function dismiss() {
    try { localStorage.setItem(key, Date.now().toString()) } catch {}
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#13131f]/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white">
            💬 Поддержите {ownerName}
          </p>
          <button
            onClick={dismiss}
            className="flex-shrink-0 text-sm leading-none text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-gray-400">
          Напишите в Instagram Direct — это поднимает их контент в ленте у большего числа людей
        </p>
        <a
          href={`https://ig.me/m/${igHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(90deg,#833ab4,#fd1d1d,#fcb045)' }}
        >
          Написать в Instagram Direct →
        </a>
      </div>
    </div>
  )
}
