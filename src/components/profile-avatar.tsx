'use client'

import { useState } from 'react'

interface ProfileAvatarProps {
  avatarUrl: string | null
  letter: string
  size?: number
  className?: string
}

export function ProfileAvatar({ avatarUrl, letter, size = 96, className = '' }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false)

  const s = size
  const fontSize = Math.round(s * 0.38)

  const containerStyle = { width: s, height: s }
  const baseClass = `relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-xl shadow-black/25 ring-[3px] ring-white/15 ${className}`

  if (!avatarUrl || failed) {
    return (
      <div className={baseClass} style={containerStyle}>
        {/* Layered gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-800" />
        <div className="absolute inset-0 bg-gradient-to-tl from-white/[0.15] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" />
        {/* Corner accent glows */}
        <div className="absolute -top-3 -right-3 h-12 w-12 rounded-full bg-violet-400/30 blur-xl" />
        <div className="absolute -bottom-2 -left-2 h-10 w-10 rounded-full bg-indigo-400/20 blur-lg" />
        <span
          className="relative select-none font-extrabold text-white"
          style={{ fontSize, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
        >
          {letter}
        </span>
      </div>
    )
  }

  return (
    <div className={baseClass} style={containerStyle}>
      {/* White bg ensures transparent PNG logos look clean on dark themes */}
      <img
        src={avatarUrl}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
        loading="eager"
        decoding="async"
      />
    </div>
  )
}
