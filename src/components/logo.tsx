type LogoSize = 'sm' | 'md' | 'lg'

const cfg = {
  sm: { wrap: 'h-8 w-8 rounded-xl',   icon: 18, text: 'text-sm',  gap: 'gap-2' },
  md: { wrap: 'h-10 w-10 rounded-xl',  icon: 22, text: 'text-base', gap: 'gap-2.5' },
  lg: { wrap: 'h-16 w-16 rounded-2xl', icon: 36, text: 'text-3xl', gap: 'gap-3' },
}

export function TapniLogo({
  size = 'md',
  showText = true,
  className = '',
}: {
  size?: LogoSize
  showText?: boolean
  className?: string
}) {
  const c = cfg[size]
  return (
    <div className={`flex items-center ${c.gap} ${className}`}>
      <div
        className={`flex flex-shrink-0 items-center justify-center ${c.wrap}`}
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(109,40,217,0.35)' }}
      >
        <TapIcon size={c.icon} />
      </div>
      {showText && (
        <span className={`${c.text} font-extrabold tracking-tight text-white leading-none`}>
          tapni<span className="font-light text-violet-400">.kz</span>
        </span>
      )}
    </div>
  )
}

// Index finger pointing downward + tap-ripple arcs below
function TapIcon({ size }: { size: number }) {
  const s = size
  const cx = s / 2

  // Upper finger body (knuckle area) – wider
  const bW  = s * 0.36
  const bH  = s * 0.26
  const bX  = cx - bW / 2
  const bY  = s * 0.05
  const bR  = s * 0.07

  // Lower fingertip – narrower pill
  const tW  = s * 0.26
  const tH  = s * 0.24
  const tX  = cx - tW / 2
  const tY  = bY + bH - s * 0.03   // overlap slightly for seamless join
  const tR  = tW / 2               // fully rounded = pill cap

  // Where fingertip touches surface
  const baseY = tY + tH

  // Ripple arcs below contact point
  const r1y    = baseY + s * 0.10
  const r1x1   = cx - s * 0.19
  const r1x2   = cx + s * 0.19
  const r1ctrl = r1y - s * 0.07

  const r2y    = baseY + s * 0.21
  const r2x1   = cx - s * 0.30
  const r2x2   = cx + s * 0.30
  const r2ctrl = r2y - s * 0.12

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" aria-hidden>
      {/* Knuckle / upper finger – wider */}
      <rect x={bX} y={bY} width={bW} height={bH} rx={bR} fill="white" />
      {/* Fingertip – narrower, rounded bottom */}
      <rect x={tX} y={tY} width={tW} height={tH} rx={tR} fill="white" />
      {/* Ripple arc 1 – bright, close */}
      <path
        d={`M${r1x1} ${r1y} Q${cx} ${r1ctrl} ${r1x2} ${r1y}`}
        stroke="white"
        strokeOpacity="0.65"
        strokeWidth={s * 0.058}
        strokeLinecap="round"
      />
      {/* Ripple arc 2 – wide, faint */}
      <path
        d={`M${r2x1} ${r2y} Q${cx} ${r2ctrl} ${r2x2} ${r2y}`}
        stroke="white"
        strokeOpacity="0.27"
        strokeWidth={s * 0.045}
        strokeLinecap="round"
      />
    </svg>
  )
}
