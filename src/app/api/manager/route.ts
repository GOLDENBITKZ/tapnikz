import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function getManagerProfile(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null
  const { data: prof } = await adminDb
    .from('profiles')
    .select('id, username, is_manager, manager_since, telegram_chat_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!prof?.is_manager) return null
  return { prof, adminDb }
}

export async function GET(request: Request) {
  const auth = await getManagerProfile(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { prof, adminDb } = auth

  const [{ data: clients }, { data: commissions }] = await Promise.all([
    adminDb
      .from('profiles')
      .select('username, business_name, is_premium, is_promo, created_at')
      .eq('referred_by', prof.username)
      .order('created_at', { ascending: false })
      .limit(500),
    adminDb
      .from('sales_commissions')
      .select('id, client_username, plan, sale_amount, commission_amount, status, created_at')
      .eq('manager_username', prof.username)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const clientList = clients ?? []
  const commList = commissions ?? []

  const totalEarned = commList.reduce(
    (sum: number, c: { commission_amount: number | null }) => sum + (c.commission_amount ?? 0),
    0
  )
  const pendingPayout = commList
    .filter((c: { status: string }) => c.status === 'pending')
    .reduce((sum: number, c: { commission_amount: number | null }) => sum + (c.commission_amount ?? 0), 0)

  return Response.json({
    stats: {
      total_clients: clientList.length,
      premium_clients: clientList.filter((c: { is_premium: boolean }) => c.is_premium).length,
      total_earned: totalEarned,
      pending_payout: pendingPayout,
    },
    manager_since: prof.manager_since ?? null,
    telegram_linked: !!prof.telegram_chat_id,
    clients: clientList,
    commissions: commList,
  })
}
