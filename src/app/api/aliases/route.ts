import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { classifyAlias, isReservedWord, type AliasCategory } from '@/lib/unicode-utils'
import { normalizeTargetUrl } from '@/lib/normalize-url'

export type ReserveAliasError =
  | 'unauthorized' | 'premium_required' | 'invalid_input' | 'invalid_url'
  | 'reserved_route' | 'non_ascii_letter' | 'too_long' | 'too_many_bytes'
  | 'already_taken_alias' | 'already_taken_username'

export type ReserveAliasResult =
  | { ok: true; alias: { id: string; aliasRaw: string; category: AliasCategory; urls: [string, string] } }
  | { ok: false; error: ReserveAliasError }

export type AliasListItem = {
  id: string
  aliasRaw: string
  category: AliasCategory
  targetUrl: string | null
  urls: [string, string]
  createdAt: string
  updatedAt: string
}

// A username must match ^[a-z0-9][a-z0-9._-]{2,31}$ (the live CHECK). Only an
// alias that could satisfy that pattern can possibly collide with one, so
// emoji aliases skip the profiles query entirely.
const COULD_BE_USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/

// Same Bearer-token auth + effective-premium pattern as src/app/api/links/route.ts's
// getAuthProfile — the nightly cron flips is_premium off up to 24h after expiry,
// so the raw column can't be trusted; effectivePremium re-derives it from
// subscription_expires_at the same way, here and there.
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
  const effectivePremium = prof.is_premium && (!prof.subscription_expires_at || new Date(prof.subscription_expires_at) > new Date())
  return { prof: { ...prof, is_premium: effectivePremium }, adminDb }
}

// GET /api/aliases — list the caller's own aliases (for the dashboard's
// "reserve new" vs "edit existing" UI — a Premium user may own several,
// there is no per-user cap).
export async function GET(request: Request) {
  const auth = await getAuthProfile(request)
  if (!auth) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const { prof, adminDb } = auth

  const { data, error } = await adminDb
    .from('aliases')
    .select('id, alias_raw, category, target_url, created_at, updated_at')
    .eq('user_id', prof.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })

  const aliases: AliasListItem[] = (data ?? []).map((a: { id: string; alias_raw: string; category: AliasCategory; target_url: string; created_at: string; updated_at: string }) => ({
    id: a.id,
    aliasRaw: a.alias_raw,
    category: a.category,
    targetUrl: a.target_url,
    urls: [`https://tapni.kz/${a.alias_raw}`, `https://tapni.kz/tapni.kz/${a.alias_raw}`],
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }))

  return Response.json({ ok: true, aliases })
}

// POST /api/aliases — reserve an alias. Requires active Premium.
export async function POST(request: Request) {
  const auth = await getAuthProfile(request)
  if (!auth) return Response.json({ ok: false, error: 'unauthorized' } satisfies ReserveAliasResult, { status: 401 })
  const { prof, adminDb } = auth

  if (!prof.is_premium) {
    return Response.json({ ok: false, error: 'premium_required' } satisfies ReserveAliasResult, { status: 403 })
  }

  let body: { alias_raw?: string; target_url?: string }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'invalid_input' } satisfies ReserveAliasResult, { status: 400 }) }

  const aliasRaw = body.alias_raw ?? ''
  const targetUrlRaw = (body.target_url ?? '').trim()

  // target_url is optional. Left empty, the alias points at the owner's own
  // profile page — resolved at redirect time from the current username, so a
  // later rename carries the alias along instead of breaking it.
  //
  // When given, it is normalised the same way the dashboard's link form does:
  // "instagram.com/shop" becomes "https://instagram.com/shop", because that is
  // what people type. Anything that cannot be a safe http(s) destination
  // (javascript:, data:, a bare word) comes back null and is reported as
  // invalid_url — a specific message, not a blanket failure.
  let targetUrl: string | null = null
  if (targetUrlRaw) {
    targetUrl = normalizeTargetUrl(targetUrlRaw)
    if (!targetUrl) {
      return Response.json({ ok: false, error: 'invalid_url' } satisfies ReserveAliasResult, { status: 400 })
    }
  }

  // Tier comes from classifyAlias and never from the request body — otherwise
  // a caller could claim the cheap 'custom' tier while reserving a VIP single
  // emoji.
  const cls = classifyAlias(aliasRaw)
  if (!cls.ok) {
    const error: ReserveAliasError =
      cls.reason === 'non_ascii_letter' ? 'non_ascii_letter'
      : cls.reason === 'too_long' ? 'too_long'
      : cls.reason === 'too_many_bytes' ? 'too_many_bytes'
      : 'invalid_input'
    return Response.json({ ok: false, error } satisfies ReserveAliasResult, { status: 400 })
  }

  if (isReservedWord(cls.normalized)) {
    return Response.json({ ok: false, error: 'reserved_route' } satisfies ReserveAliasResult, { status: 400 })
  }

  // Bidirectional collision check — the alias fallback only runs on a
  // profile-miss in [username]/page.tsx, so if a real username ever matched
  // this alias the profile would always win and the alias would be
  // permanently unreachable. Skipped for anything that couldn't be a valid
  // username in the first place (every emoji alias), where the query would
  // always miss.
  if (COULD_BE_USERNAME.test(cls.normalized)) {
    const { data: profileCollision } = await adminDb
      .from('profiles').select('id').eq('username', cls.normalized).maybeSingle()
    if (profileCollision) {
      return Response.json({ ok: false, error: 'already_taken_username' } satisfies ReserveAliasResult, { status: 409 })
    }
  }

  const { data: aliasCollision } = await adminDb
    .from('aliases').select('id').eq('alias_hex', cls.hex).maybeSingle()
  if (aliasCollision) {
    return Response.json({ ok: false, error: 'already_taken_alias' } satisfies ReserveAliasResult, { status: 409 })
  }

  const { data: inserted, error: insertError } = await adminDb
    .from('aliases')
    .insert([{
      user_id: prof.id,
      alias_raw: cls.normalized,
      alias_normalized: cls.normalized,
      alias_hex: cls.hex,
      category: cls.category,
      target_url: targetUrl,
      is_premium: true,
    }])
    .select('id')
    .single()

  if (insertError) {
    // Unique-violation race: two concurrent requests passed the read-check
    // above for the same alias_hex before either committed the insert.
    if (insertError.code === '23505') {
      return Response.json({ ok: false, error: 'already_taken_alias' } satisfies ReserveAliasResult, { status: 409 })
    }
    return Response.json({ ok: false, error: 'invalid_input' } satisfies ReserveAliasResult, { status: 500 })
  }

  // [username]/page.tsx has revalidate=60 (ISR): if someone visited this
  // exact string before it was reserved, the resulting 404 could otherwise
  // stay cached for up to 60s after creation. Bust it immediately so the
  // alias resolves right away. The nested /tapni.kz/{alias} route is
  // force-dynamic already, so it needs no equivalent call.
  revalidatePath(`/${cls.normalized}`)

  return Response.json({
    ok: true,
    alias: {
      id: inserted.id,
      aliasRaw: cls.normalized,
      category: cls.category,
      urls: [`https://tapni.kz/${cls.normalized}`, `https://tapni.kz/tapni.kz/${cls.normalized}`],
    },
  } satisfies ReserveAliasResult, { status: 201 })
}
