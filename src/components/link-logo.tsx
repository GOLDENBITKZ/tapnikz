'use client'

export function LinkLogo({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      className={className}
      aria-hidden
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
    />
  )
}
