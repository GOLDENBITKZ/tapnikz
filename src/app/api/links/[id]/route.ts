import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function getAuthProfile(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null
  const { data: prof } = await adminDb.from('profiles').select('id').eq('id', user.id).maybeSingle()
  return prof ? { prof, adminDb } : null
}

// JSON-stored types don't need URL scheme validation
const JSON_URL_TYPES = new Set([
  'text_block', 'product', 'follow_gate', 'milestone', 'instagram_keyword',
  'countdown', 'pricelist', 'image', 'video', 'faq', 'smart_qr',
])

// PATCH /api/links/[id] — update title, url, visible_from, visible_until for a single link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ error: 'invalid id' }, { status: 400 })
    }

    const auth = await getAuthProfile(request)
    if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const { prof, adminDb } = auth

    let body: { title?: string; url?: string; visible_from?: string | null; visible_until?: string | null }
    try { body = await request.json() } catch {
      return Response.json({ error: 'invalid json' }, { status: 400 })
    }

    // Verify link ownership
    const { data: link } = await adminDb
      .from('links').select('id, icon_type')
      .eq('id', id).eq('profile_id', prof.id)
      .maybeSingle()
    if (!link) return Response.json({ error: 'not found' }, { status: 404 })

    const url = body.url ?? ''

    // Server-side URL scheme validation (same as POST)
    if (url && !JSON_URL_TYPES.has(link.icon_type)) {
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

    const { error } = await adminDb.from('links').update({
      title: (body.title ?? '').slice(0, 100),
      url: url.slice(0, 2048),
      visible_from: body.visible_from ?? null,
      visible_until: body.visible_until ?? null,
    }).eq('id', id).eq('profile_id', prof.id)

    if (error) return Response.json({ error: 'Internal error' }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[links/[id] PATCH]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
