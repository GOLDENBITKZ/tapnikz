import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Lightweight POST endpoint for navigator.sendBeacon click tracking.
// Returns 204 always — no redirect, no URL lookup needed.

const rateMap = new Map<string, { count: number; resetAt: number }>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  if (rateMap.size > 1000) {
    for (const [k, v] of rateMap) { if (now > v.resetAt) rateMap.delete(k) }
  }
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 3_600_000 }); return true }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const id = typeof body.id === 'string' ? body.id : null
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 204 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRate(ip)) return new Response(null, { status: 204 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any
    await Promise.all([
      db.rpc('increment_link_click', { p_link_id: id }).then(() => {}, () => {}),
      db.from('click_events').insert([{ link_id: id }]).then(() => {}, () => {}),
    ])
  } catch { /* swallow — beacon must never throw to client */ }
  return new Response(null, { status: 204 })
}
