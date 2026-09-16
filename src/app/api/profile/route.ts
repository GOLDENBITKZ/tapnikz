import { getSupabaseAdmin } from '@/lib/supabase-admin'

const PROFILE_FIELDS = 'id,username,business_name,bio,phone,address,avatar_url,theme,is_premium,subscription_expires_at,subscription_plan,telegram_chat_id,view_count,working_hours,referred_by,referral_bonus_given,created_at,updated_at'

async function getUserId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: { user }, error } = await db.auth.getUser(token)
  return error || !user ? null : user.id
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request)
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any
    const { data, error } = await db.from('profiles').select(PROFILE_FIELDS).eq('id', userId).maybeSingle()
    if (error) return Response.json({ error: 'Could not load profile' }, { status: 500 })
    if (!data) return Response.json({ error: 'Profile not found' }, { status: 404 })
    return Response.json({ profile: data })
  } catch {
    return Response.json({ error: 'Could not load profile' }, { status: 500 })
  }
}