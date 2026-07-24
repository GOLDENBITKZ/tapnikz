'use client'

import { useState } from 'react'
import { Link as LinkIcon } from 'lucide-react'

export function LinkLogo({ src, className }: { src: string; className?: string }) {
  const [errored, setErrored] = useState(false)
  if (errored) return <LinkIcon className={className} aria-hidden />
  return (
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      className={className}
      aria-hidden
      onError={() => setErrored(true)}
    />
  )
}
