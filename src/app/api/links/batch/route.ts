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

  // Free users: cap at 3 template links
  const limit = prof.is_premium ? links.length : Math.min(links.length, 3)
  const rows = links.slice(0, limit).map((l, i) => ({
    profile_id: prof.id,
    title: l.title,
    // Strip placeholder marker — URL stored as-is (stub), user must edit before clicking
    url: (l.url ?? '').replace(PLACEHOLDER_PREFIX, ''),
    icon_type: l.icon_type,
    sort_order: i,
  }))

  const { error } = await adminDb.from('links').insert(rows)
  if (error) return Response.json({ error: 'Internal error' }, { status: 500 })

  return Response.json({ ok: true, count: rows.length })
}
