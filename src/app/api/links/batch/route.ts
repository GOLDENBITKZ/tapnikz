import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { IconType } from '@/lib/supabase'
import { PLACEHOLDER_PREFIX } from '@/lib/templates'
import { isValidIconType, PREMIUM_ONLY_TYPES, JSON_URL_TYPES } from '@/lib/link-types'

export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error: authErr } = await adminDb.auth.getUser(token)
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await adminDb.from('profiles').select('id, is_premium, subscription_expires_at').eq('id', user.id).maybeSingle()
  if (!prof) return Response.json({ error: 'Profile not found' }, { status: 404 })

  // is_premium stays true until the nightly cron clears it, so check expiry too.
  const isPremium = Boolean(prof.is_premium) &&
    (!prof.subscription_expires_at || new Date(prof.subscription_expires_at) > new Date())

  let links: { title: string; url: string; icon_type: IconType }[]
  try { links = await request.json() } catch { return Response.json({ error: 'invalid json' }, { status: 400 }) }
  if (!Array.isArray(links) || links.length === 0) return Response.json({ error: 'array required' }, { status: 400 })

  // Delete existing links first (template replaces blank slate)
  const { count: existing } = await adminDb.from('links').select('*', { count: 'exact', head: true }).eq('profile_id', prof.id)
  if ((existing ?? 0) > 0) return Response.json({ error: 'profile already has links' }, { status: 409 })

  const SAFE_SCHEMES = /^(https?|tel:|mailto:|\{)/i

  for (const l of links) {
    if (!isValidIconType(l.icon_type)) {
      return Response.json({ error: `invalid icon_type: ${l.icon_type}` }, { status: 400 })
    }
    if (PREMIUM_ONLY_TYPES.has(l.icon_type) && !isPremium) {
      return Response.json({ error: 'premium_required' }, { status: 403 })
    }
    const url = (l.url ?? '').replace(PLACEHOLDER_PREFIX, '')
    if (url && !JSON_URL_TYPES.has(l.icon_type) && !SAFE_SCHEMES.test(url)) {
      return Response.json({ error: 'invalid url scheme' }, { status: 400 })
    }
  }

  // Free users: cap at 3 template links
  const limit = isPremium ? links.length : Math.min(links.length, 3)
  const rows = links.slice(0, limit).map((l, i) => ({
    profile_id: prof.id,
    title: String(l.title ?? '').slice(0, 100),
    // Strip placeholder marker — URL stored as-is (stub), user must edit before clicking
    url: (l.url ?? '').replace(PLACEHOLDER_PREFIX, '').slice(0, 2048),
    icon_type: l.icon_type,
    sort_order: i,
  }))

  try {
    const { error } = await adminDb.from('links').insert(rows)
    if (error) return Response.json({ error: 'Internal error' }, { status: 500 })
    return Response.json({ ok: true, count: rows.length })
  } catch (err) {
    console.error('[links/batch] insert error', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
