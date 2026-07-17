import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { IconType } from '@/lib/supabase'
import { PLACEHOLDER_PREFIX } from '@/lib/templates'

export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error: authErr } = await adminDb.auth.getUser(token)
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await adminDb.from('profiles').select('id, is_premium').eq('id', user.id).maybeSingle()
  if (!prof) return Response.json({ error: 'Profile not found' }, { status: 404 })

  let links: { title: string; url: string; icon_type: IconType }[]
  try { links = await request.json() } catch { return Response.json({ error: 'invalid json' }, { status: 400 }) }
  if (!Array.isArray(links) || links.length === 0) return Response.json({ error: 'array required' }, { status: 400 })

  // Delete existing links first (template replaces blank slate)
  const { count: existing } = await adminDb.from('links').select('*', { count: 'exact', head: true }).eq('profile_id', prof.id)
  if ((existing ?? 0) > 0) return Response.json({ error: 'profile already has links' }, { status: 409 })

  const VALID_ICON_TYPES = new Set([
    'whatsapp','telegram','instagram','tiktok','youtube','kaspi','kaspi_pay','kaspi_shop','kaspi_qr','ediny_qr',
    'twogis','website','phone','email','kolesa','krisha','vk','facebook','link',
    'text_block','product','lead_form','android','ios','menu','paypal',
    'instagram_dm','instagram_reel','follow_gate','milestone','instagram_keyword',
    'countdown','pricelist','image','video','faq',
  ])
  const JSON_URL_TYPES = new Set(['text_block','product','follow_gate','milestone','instagram_keyword','countdown','pricelist','image','video','faq'])
  const SAFE_SCHEMES = /^(https?|tel:|mailto:|\{)/i

  for (const l of links) {
    if (!VALID_ICON_TYPES.has(l.icon_type)) {
      return Response.json({ error: `invalid icon_type: ${l.icon_type}` }, { status: 400 })
    }
    const url = (l.url ?? '').replace(PLACEHOLDER_PREFIX, '')
    if (url && !JSON_URL_TYPES.has(l.icon_type) && !SAFE_SCHEMES.test(url)) {
      return Response.json({ error: 'invalid url scheme' }, { status: 400 })
    }
  }

  // Free users: cap at 3 template links
  const limit = prof.is_premium ? links.length : Math.min(links.length, 3)
  const rows = links.slice(0, limit).map((l, i) => ({
    profile_id: prof.id,
    title: String(l.title ?? '').slice(0, 100),
    // Strip placeholder marker — URL stored as-is (stub), user must edit before clicking
    url: (l.url ?? '').replace(PLACEHOLDER_PREFIX, '').slice(0, 2048),
    icon_type: l.icon_type,
    sort_order: i,
  }))

  const { error } = await adminDb.from('links').insert(rows)
  if (error) return Response.json({ error: 'Internal error' }, { status: 500 })

  return Response.json({ ok: true, count: rows.length })
}
