import { getSupabaseAdmin } from '@/lib/supabase-admin'

const FREE_LIMIT = 3

export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error: authErr } = await adminDb.auth.getUser(token)
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await adminDb
    .from('profiles')
    .select('id, is_premium')
    .eq('id', user.id)
    .maybeSingle()
  if (!prof) return Response.json({ error: 'Profile not found' }, { status: 404 })

  // FIX #8: enforce free-tier limit server-side
  if (!prof.is_premium) {
    const { count } = await adminDb
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', prof.id)
    if ((count ?? 0) >= FREE_LIMIT) {
      return Response.json({ error: 'limit_reached' }, { status: 403 })
    }
  }

  let body: { title?: string; url?: string; icon_type?: string; sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!body.url) return Response.json({ error: 'url required' }, { status: 400 })

  const { data, error } = await adminDb
    .from('links')
    .insert([{
      profile_id: prof.id,
      title: body.title ?? '',
      url: body.url,
      icon_type: body.icon_type ?? 'link',
      sort_order: body.sort_order ?? 0,
    }])
    .select('id')
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, id: data?.id })
}
