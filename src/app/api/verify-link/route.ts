import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { makeVerifyToken } from '@/lib/verify-token'

const BOT_USERNAME = 'Tapnikzbot'

/**
 * Issues the deep link that starts phone verification in Telegram.
 *
 * Minted per request rather than stored: the token is a signature over the
 * profile id and an hour window, so there is no state to expire, and a link
 * that leaks stops working on its own. It is only ever handed to the account
 * it belongs to — the caller must present that account's access token.
 */
export async function GET(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await adminDb
    .from('profiles')
    .select('id, phone, phone_verified_at, verify_grace_until')
    .eq('id', user.id)
    .maybeSingle()
  if (!prof) return Response.json({ error: 'not_found' }, { status: 404 })

  if (prof.phone_verified_at) {
    return Response.json({ verified: true })
  }

  const deepLinkToken = makeVerifyToken(prof.id)
  if (!deepLinkToken) {
    console.error('[verify-link] VCARD_SECRET missing')
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  return Response.json({
    verified: false,
    phone: prof.phone,
    graceUntil: prof.verify_grace_until,
    url: `https://t.me/${BOT_USERNAME}?start=${deepLinkToken}`,
  })
}
