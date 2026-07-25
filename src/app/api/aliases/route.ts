import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { classifyAlias, isReservedWord } from '@/lib/unicode-utils'

export type ReserveAliasResult =
  | { ok: true; alias: { id: string; aliasRaw: string; urls: [string, string] } }
  | {
      ok: false
      error:
        | 'unauthorized' | 'premium_required' | 'invalid_input'
        | 'reserved_route' | 'mixed_script'
        | 'already_taken_alias' | 'already_taken_username'
    }

export type AliasListItem = {
  id: string
  aliasRaw: string
  targetUrl: string
  urls: [string, string]
  createdAt: string
  updatedAt: string
}

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
    .select('id, alias_raw, target_url, created_at, updated_at')
    .eq('user_id', prof.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })

  const aliases: AliasListItem[] = (data ?? []).map((a: { id: string; alias_raw: string; target_url: string; created_at: string; updated_at: string }) => ({
    id: a.id,
    aliasRaw: a.alias_raw,
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

  // Same URL-scheme validation idiom as api/links/route.ts and api/click/route.ts:
  // only http/https, bounded length (mirrors the aliases.target_url CHECK constraint).
  if (!targetUrlRaw || targetUrlRaw.length > 2048) {
    return Response.json({ ok: false, error: 'invalid_input' } satisfies ReserveAliasResult, { status: 400 })
  }
  try {
    const parsed = new URL(targetUrlRaw)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return Response.json({ ok: false, error: 'invalid_input' } satisfies ReserveAliasResult, { status: 400 })
    }
  } catch {
    return Response.json({ ok: false, error: 'invalid_input' } satisfies ReserveAliasResult, { status: 400 })
  }

  const cls = classifyAlias(aliasRaw)
  if (!cls.ok) {
    const error = cls.reason === 'mixed_script' || cls.reason === 'not_single_grapheme' ? 'mixed_script' : 'invalid_input'
    return Response.json({ ok: false, error } satisfies ReserveAliasResult, { status: 400 })
  }

  if (isReservedWord(cls.normalized)) {
    return Response.json({ ok: false, error: 'reserved_route' } satisfies ReserveAliasResult, { status: 400 })
  }

  // Bidirectional collision check — an alias fallback only runs on a profile-miss
  // in [username]/page.tsx, so if a real username ever matched this alias the
  // profile would always win and the alias would be permanently unreachable.
  // Only meaningful for 'ascii'-kind aliases: the live username CHECK is
  // ^[a-z0-9][a-z0-9._-]{2,31}$ (dots allowed — that's how egov.kz etc.
  // exist; the regex in SUPABASE_SCHEMA.sql is stale), which admits no
  // character outside [a-z0-9._-], so a username can never equal a
  // 'symbol'-kind (emoji) alias and the lookup would always miss.
  if (cls.kind === 'ascii') {
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
      target_url: targetUrlRaw,
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
      urls: [`https://tapni.kz/${cls.normalized}`, `https://tapni.kz/tapni.kz/${cls.normalized}`],
    },
  } satisfies ReserveAliasResult, { status: 201 })
}
