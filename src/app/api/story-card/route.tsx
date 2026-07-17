import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

// IP rate limit: 5 requests per minute per IP
const storyRateMap = new Map<string, { count: number; resetAt: number }>()
function checkStoryRate(ip: string): boolean {
  const now = Date.now()
  if (storyRateMap.size > 500) {
    for (const [k, v] of storyRateMap) { if (now > v.resetAt) storyRateMap.delete(k) }
  }
  const entry = storyRateMap.get(ip)
  if (!entry || now > entry.resetAt) { storyRateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

// Load Roboto Bold with full Cyrillic + Kazakh alphabet support (cached at module load)
let fontData: ArrayBuffer | null = null
function getFont(): ArrayBuffer {
  if (!fontData) {
    const buf = readFileSync(join(process.cwd(), 'public/fonts/RobotoBold.ttf'))
    fontData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  }
  return fontData
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkStoryRate(ip)) {
    return new Response('Too Many Requests', { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace(/[^a-z0-9-]/g, '')

  if (!username) {
    return new Response('username required', { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: profileData } = await db
    .from('profiles')
    .select('username, business_name, bio, avatar_url, address')
    .eq('username', username)
    .maybeSingle()

  if (!profileData) {
    return new Response('Profile not found', { status: 404 })
  }

  const profile = profileData as {
    username: string
    business_name: string
    bio: string | null
    avatar_url: string | null
    address: string | null
  }

  const siteUrl = 'https://tapni.kz'

  // Verify avatar is on our Supabase storage domain only (prevents SSRF)
  let avatarSrc = `${siteUrl}/brand-logo.jpeg`
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : null
  if (
    supabaseHost &&
    profile.avatar_url?.startsWith('https://') &&
    new URL(profile.avatar_url).hostname === supabaseHost
  ) {
    avatarSrc = profile.avatar_url
  }

  const imgResponse = new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          background: 'linear-gradient(160deg, #0c0c18 0%, #130d24 50%, #0c0c18 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Roboto, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 65%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: 400, right: 80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Top label */}
        <div style={{
          position: 'absolute', top: 120,
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(124,58,237,0.22)',
          borderRadius: 100,
          border: '1px solid rgba(124,58,237,0.45)',
          padding: '14px 32px',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#a78bfa', display: 'flex' }} />
          <span style={{ color: '#c4b5fd', fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>tapni.kz</span>
        </div>

        {/* Avatar */}
        <div style={{
          display: 'flex',
          width: 220, height: 220, borderRadius: '50%',
          border: '5px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
          marginBottom: 48,
          boxShadow: '0 0 100px rgba(124,58,237,0.45)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Business name */}
        <div style={{
          color: 'white',
          fontSize: profile.business_name.length > 20 ? 56 : 72,
          fontWeight: 900,
          letterSpacing: -2,
          textAlign: 'center',
          maxWidth: 920,
          lineHeight: 1.1,
          marginBottom: 28,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {profile.business_name}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 34,
            textAlign: 'center',
            maxWidth: 820,
            lineHeight: 1.5,
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {profile.bio.slice(0, 90)}
          </div>
        )}

        {/* Address */}
        {profile.address && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            color: 'rgba(255,255,255,0.38)', fontSize: 30,
            marginBottom: 64,
          }}>
            <span>📍</span>
            <span>{profile.address.slice(0, 50)}</span>
          </div>
        )}

        {/* URL pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 100,
          padding: '22px 56px',
          marginBottom: 88,
        }}>
          <span style={{ color: '#a78bfa', fontSize: 38, fontWeight: 800 }}>tapni.kz/</span>
          <span style={{ color: 'white', fontSize: 38, fontWeight: 900 }}>{profile.username}</span>
        </div>

        {/* CTA button */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18,
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          borderRadius: 100, padding: '28px 72px',
          boxShadow: '0 24px 64px rgba(124,58,237,0.55)',
        }}>
          <span style={{ color: 'white', fontSize: 40, fontWeight: 900 }}>Нажми на ссылку ☝️</span>
        </div>

        {/* Bottom branding */}
        <div style={{
          position: 'absolute', bottom: 110,
          display: 'flex', alignItems: 'center', gap: 14,
          color: 'rgba(255,255,255,0.22)', fontSize: 24,
        }}>
          <span>⚡</span>
          <span>Создано на tapni.kz</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [{ name: 'Roboto', data: getFont(), weight: 700, style: 'normal' }],
    }
  )

  // Force browser to download instead of display in new tab
  const png = await imgResponse.arrayBuffer()
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="tapni-story-${username}.png"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
