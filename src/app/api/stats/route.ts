import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [profilesRes, clicksRes, leadsRes] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('click_events').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    db.from('lead_submissions').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
  ])

  return NextResponse.json(
    {
      total_profiles: profilesRes.count ?? 0,
      total_clicks_week: clicksRes.count ?? 0,
      total_leads_week: leadsRes.count ?? 0,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    }
  )
}
