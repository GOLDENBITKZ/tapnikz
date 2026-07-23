'use client'

import { useState } from 'react'

export function DiscoverAvatar({ src, name }: { src: string; name: string }) {
  const [hasError, setHasError] = useState(false)
  if (hasError) {
    return (
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-violet-700 flex items-center justify-center text-white text-sm font-bold">
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={name}
      className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
      width={40}
      height={40}
      onError={() => setHasError(true)}
    />
  )
}
