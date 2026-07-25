import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'tapni.kz — цифровые визитки для бизнеса Казахстана'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
        }} />

        {/* Logo */}
        <div style={{
          fontSize: '48px', fontWeight: 900, color: '#ffffff',
          letterSpacing: '-1px', marginBottom: '16px', display: 'flex',
        }}>
          tapni<span style={{ color: '#818cf8' }}>.kz</span>
        </div>

        {/* Main headline */}
        <div style={{
          fontSize: '38px', fontWeight: 700, color: '#e2e8f0',
          textAlign: 'center', lineHeight: 1.2,
          maxWidth: '900px', marginBottom: '24px', display: 'flex',
        }}>
          Мобильная визитка для бизнеса Казахстана
        </div>

        {/* Subline */}
        <div style={{
          fontSize: '22px', color: '#94a3b8', textAlign: 'center',
          marginBottom: '40px', display: 'flex',
        }}>
          WhatsApp · Kaspi Pay · 2ГИС · Instagram · Telegram
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Бесплатно', 'Без кода', 'Казахстан'].map((t) => (
            <div key={t} style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '100px',
              padding: '8px 20px',
              fontSize: '16px',
              color: '#c7d2fe',
              display: 'flex',
            }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
