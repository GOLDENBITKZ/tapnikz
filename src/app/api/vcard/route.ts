import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyVcardToken } from '@/lib/vcard-token'

// Rate limit: 5 downloads per IP per hour
const rateMap = new Map<string, { count: number; resetAt: number }>()
function checkRate(ip: string): boolean {
  const now = Date.now()
  if (rateMap.size > 500) {
    for (const [k, v] of rateMap) { if (now > v.resetAt) rateMap.delete(k) }
  }
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 3_600_000 }); return true }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.toLowerCase().trim()
  const token = searchParams.get('t') ?? ''

  if (!username) return Response.json({ error: 'bad_request' }, { status: 400 })

  // Verify time-based signed token (generated on profile page render)
  if (!verifyVcardToken(username, token)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRate(ip)) {
    return new Response('too many requests', { status: 429 })
  }

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (getSupabaseAdmin() as any)
    .from('profiles')
    .select('business_name, phone, address, bio, username')
    .eq('username', username)
    .maybeSingle()

  if (!profile || !profile.phone) return new Response('not found', { status: 404 })

  const esc = (s: string) => s.replace(/\r\n?|\n/g, ' ').replace(/[\\;,]/g, (c) => `\\${c}`)
  // RFC 2426 §2.6: fold lines longer than 75 octets
  const fold = (line: string) => {
    if (line.length <= 75) return line
    let out = ''; let pos = 0
    out += line.slice(0, 75); pos = 75
    while (pos < line.length) { out += '\r\n ' + line.slice(pos, pos + 74); pos += 74 }
    return out
  }

  const name = esc(profile.business_name ?? '')
  const phone = profile.phone.replace(/\D/g, '')
  // Normalize to E.164: 11 digits starting with 7, or prepend 7 for 10-digit numbers
  const intlPhone = phone.length === 11 && phone.startsWith('7')
    ? phone
    : phone.length === 10 ? `7${phone}` : phone

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    fold(`FN:${name}`),
    fold(`N:;${name};;;`),
    fold(`ORG:${name}`),
    `TEL;TYPE=CELL:+${intlPhone}`,
    profile.address ? fold(`ADR;TYPE=WORK:;;${esc(profile.address)};;;Казахстан`) : null,
    profile.bio ? fold(`NOTE:${esc(profile.bio)}`) : null,
    `URL:https://tapni.kz/${profile.username}`,
    'END:VCARD',
  ].filter(Boolean).join('\r\n')

  return new Response(lines, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${username}.vcf"`,
      'Cache-Control': 'no-store, no-cache, private',
      'X-Robots-Tag': 'noindex',
    },
  })
  } catch (err) {
    console.error('[vcard] error', err)
    return new Response('internal error', { status: 500 })
  }
}
