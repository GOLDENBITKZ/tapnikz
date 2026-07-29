import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { FREE_LINK_LIMIT as FREE_LIMIT } from '@/lib/supabase'
import { isValidIconType, PREMIUM_ONLY_TYPES, EMPTY_URL_OK_TYPES, JSON_URL_TYPES } from '@/lib/link-types'

async function getAuthProfile(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null
  const { data: prof } = await adminDb.from('profiles').select('id, is_premium, subscription_expires_at').eq('id', user.id).maybeSingle()
  if (!prof) return null
  // Treat as free if subscription has expired (cron runs daily so guard here too)
  const effectivePremium = prof.is_premium && (!prof.subscription_expires_at || new Date(prof.subscription_expires_at) > new Date())
  return { prof: { ...prof, is_premium: effectivePremium }, adminDb }
}

// POST /api/links — add a single link (enforces free tier limit)
export async function POST(request: Request) {
  const auth = await getAuthProfile(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { prof, adminDb } = auth

  if (!prof.is_premium) {
    const { count: countBefore } = await adminDb.from('links').select('*', { count: 'exact', head: true }).eq('profile_id', prof.id)
    if ((countBefore ?? 0) >= FREE_LIMIT) return Response.json({ error: 'limit_reached' }, { status: 403 })
  }

  let body: { title?: string; url?: string; icon_type?: string; sort_order?: number }
  try { body = await request.json() } catch { return Response.json({ error: 'invalid json' }, { status: 400 }) }

  const url = body.url ?? ''
  const iconType = body.icon_type ?? 'link'

  if (!isValidIconType(iconType)) {
    return Response.json({ error: 'invalid icon_type' }, { status: 400 })
  }

  if (PREMIUM_ONLY_TYPES.has(iconType) && !prof.is_premium) {
    return Response.json({ error: 'premium_required' }, { status: 403 })
  }

  if (!url && !EMPTY_URL_OK_TYPES.has(iconType)) {
    return Response.json({ error: 'url required' }, { status: 400 })
  }


  // Validate URL scheme at write time (mirrors /api/click validation)
  if (url && !JSON_URL_TYPES.has(iconType)) {
    try {
      const parsed = new URL(url.startsWith('tel:') || url.startsWith('mailto:') ? url : url.startsWith('http') ? url : `https://${url}`)
      if (!['http:', 'https:', 'tel:', 'mailto:'].includes(parsed.protocol)) {
        return Response.json({ error: 'invalid url scheme' }, { status: 400 })
      }
      if (parsed.protocol === 'tel:' && !/^\+?[\d\s\-()]+$/.test(parsed.pathname)) {
        return Response.json({ error: 'invalid tel url' }, { status: 400 })
      }
    } catch {
      return Response.json({ error: 'invalid url' }, { status: 400 })
    }
  }

  const { data, error } = await adminDb.from('links').insert([{
    profile_id: prof.id,
    title: (body.title ?? '').slice(0, 100),
    url: url.slice(0, 2048),
    icon_type: iconType,
    sort_order: body.sort_order ?? 0,
  }]).select('id').maybeSingle()

  if (error) return Response.json({ error: 'Internal error' }, { status: 500 })

  // Re-check count after insert to close the race-condition window for free-tier users.
  // If two concurrent requests both passed the pre-check, the second insert here gets rolled back.
  if (!prof.is_premium && data?.id) {
    const { count: countAfter } = await adminDb.from('links').select('*', { count: 'exact', head: true }).eq('profile_id', prof.id)
    if ((countAfter ?? 0) > FREE_LIMIT) {
      await adminDb.from('links').delete().eq('id', data.id)
      return Response.json({ error: 'limit_reached' }, { status: 403 })
    }
  }

  return Response.json({ ok: true, id: data?.id })
}

// PATCH /api/links — batch reorder: [{id, sort_order}]
export async function PATCH(request: Request) {
  const auth = await getAuthProfile(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { prof, adminDb } = auth

  let items: { id: string; sort_order: number }[]
  try { items = await request.json() } catch { return Response.json({ error: 'invalid json' }, { status: 400 }) }
  if (!Array.isArray(items) || items.length === 0) return Response.json({ error: 'array required' }, { status: 400 })
  if (items.length > 200) return Response.json({ error: 'too many items' }, { status: 400 })
  if (items.some((i) => typeof i.sort_order !== 'number' || !isFinite(i.sort_order) || !Number.isInteger(i.sort_order))) {
    return Response.json({ error: 'sort_order must be an integer' }, { status: 400 })
  }

  // Verify all links belong to this profile (prevents reordering others' links)
  const ids = items.map((i) => i.id)
  const { data: owned } = await adminDb.from('links').select('id').eq('profile_id', prof.id).in('id', ids)
  const ownedIds = new Set((owned ?? []).map((r: { id: string }) => r.id))
  const safeItems = items.filter((i) => ownedIds.has(i.id))

  if (safeItems.length === 0) return Response.json({ ok: true })

  const results = await Promise.all(
    safeItems.map((i) => adminDb.from('links').update({ sort_order: i.sort_order }).eq('id', i.id))
  )

  const failed = results.some((r: { error: unknown }) => r.error)
  if (failed) return Response.json({ error: 'partial update failure' }, { status: 500 })

  return Response.json({ ok: true })
}

// POST /api/links/batch — apply a template (multiple links at once)
// This is handled by /api/links/batch/route.ts separately
