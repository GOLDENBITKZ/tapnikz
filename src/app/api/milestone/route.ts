import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface MilestoneData {
  current: number
  goal: number
  time_left_seconds: number
  unlocked: boolean
  expired: boolean
  reward_url: string
  reward_code: string
  reward_label: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: 'invalid' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any

  try {
  const { data: link } = await db
    .from('links')
    .select('url, profile_id, title')
    .eq('id', id)
    .maybeSingle()

  if (!link) return Response.json({ error: 'not_found' }, { status: 404 })

  const { data: profile } = await db
    .from('profiles')
    .select('view_count')
    .eq('id', link.profile_id)
    .maybeSingle()

  let md: {
    goal?: number; hours?: number; started_at?: string
    baseline?: number; reward_url?: string; reward_code?: string; reward_label?: string
  } = {}
  try { md = JSON.parse(link.url) } catch {}

  const goal = md.goal ?? 500
  const hours = md.hours ?? 24
  const baseline = md.baseline ?? 0
  const startedAt = md.started_at ? new Date(md.started_at).getTime() : Date.now()
  const currentViews = Math.max(0, (profile?.view_count ?? 0) - baseline)
  const endTime = startedAt + hours * 3_600_000
  const timeLeftMs = endTime - Date.now()
  const unlocked = currentViews >= goal
  const expired = timeLeftMs <= 0 && !unlocked

  const result: MilestoneData = {
    current: currentViews,
    goal,
    time_left_seconds: Math.max(0, Math.floor(timeLeftMs / 1000)),
    unlocked,
    expired,
    reward_url: unlocked ? (md.reward_url ?? '') : '',
    reward_code: unlocked ? (md.reward_code ?? '') : '',
    reward_label: md.reward_label ?? (link.title as string) ?? '',
  }

  return Response.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
  } catch (err) {
    console.error('[milestone] error', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
