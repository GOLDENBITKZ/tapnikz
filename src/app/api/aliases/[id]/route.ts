import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeTargetUrl } from '@/lib/normalize-url'

// Same Bearer-token auth + effective-premium pattern as ../route.ts and
// src/app/api/links/route.ts's getAuthProfile.
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

// PATCH /api/aliases/[id] — repoint an already-reserved alias to a new
// target_url. The alias string itself (alias_raw/alias_hex) never changes
// here — only where it redirects to. Deliberately requires an ACTIVE
// Premium subscription, same as creation: an alias keeps *redirecting*
// after Premium lapses (matches this codebase's convention elsewhere),
// but re-gating edits behind active Premium prevents a one-time purchase
// from turning into permanent free editing — otherwise Premium-gating the
// creation step would be pointless once the URL itself can be changed
// through the edit path for free forever.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ ok: false, error: 'invalid_input' }, { status: 400 })
    }

    const auth = await getAuthProfile(request)
    if (!auth) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    const { prof, adminDb } = auth

    if (!prof.is_premium) {
      return Response.json({ ok: false, error: 'premium_required' }, { status: 403 })
    }

    let body: { target_url?: string }
    try { body = await request.json() } catch {
      return Response.json({ ok: false, error: 'invalid_input' }, { status: 400 })
    }

    // Empty clears the target, which points the alias back at the owner's own
    // profile page — the same default a reservation made without a URL gets.
    // Otherwise normalised like everywhere else, so "instagram.com/shop" is
    // accepted and unsafe schemes are refused with a specific error.
    const raw = (body.target_url ?? '').trim()
    let targetUrl: string | null = null
    if (raw) {
      targetUrl = normalizeTargetUrl(raw)
      if (!targetUrl) {
        return Response.json({ ok: false, error: 'invalid_url' }, { status: 400 })
      }
    }

    // Ownership check — verify this alias belongs to the caller before
    // touching it (mirrors src/app/api/links/[id]/route.ts).
    const { data: alias } = await adminDb
      .from('aliases').select('id, alias_raw')
      .eq('id', id).eq('user_id', prof.id)
      .maybeSingle()
    if (!alias) return Response.json({ ok: false, error: 'not_found' }, { status: 404 })

    const { error: updateError } = await adminDb
      .from('aliases')
      .update({ target_url: targetUrl })
      .eq('id', id).eq('user_id', prof.id)

    if (updateError) return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })

    // Bust the 60s ISR cache on tapni.kz/{alias} (served by
    // [username]/page.tsx) so the new destination is live immediately.
    revalidatePath(`/${alias.alias_raw}`)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[aliases/[id] PATCH]', err)
    return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
}

// DELETE /api/aliases/[id] — release a reserved symbol.
//
// Deleting is clean by construction: no table has a foreign key pointing at
// aliases (checked against pg_constraint), so the row leaves nothing behind —
// no orphans, no cascade, no counters to fix up.
//
// Two things do change, and both are intended:
//   • the symbol goes back into circulation and someone else may take it;
//   • anything already printed with that link stops working.
// The UI asks for confirmation and says so before calling this.
//
// Deliberately NOT gated on active Premium. Reserving and repointing require
// it, but removing your own data must never be something a lapsed
// subscription can trap you out of.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ ok: false, error: 'invalid_input' }, { status: 400 })
    }

    const auth = await getAuthProfile(request)
    if (!auth) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    const { prof, adminDb } = auth

    // Fetch before deleting: the alias string is needed to bust its cache
    // afterwards, and it is gone once the row is.
    const { data: alias } = await adminDb
      .from('aliases').select('id, alias_raw')
      .eq('id', id).eq('user_id', prof.id)
      .maybeSingle()
    if (!alias) return Response.json({ ok: false, error: 'not_found' }, { status: 404 })

    const { error: deleteError } = await adminDb
      .from('aliases').delete()
      .eq('id', id).eq('user_id', prof.id)

    if (deleteError) return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })

    // Without this the deleted symbol would keep redirecting from the ISR
    // cache on tapni.kz/{alias} for up to 60s.
    revalidatePath(`/${alias.alias_raw}`)

    return Response.json({ ok: true, aliasRaw: alias.alias_raw })
  } catch (err) {
    console.error('[aliases/[id] DELETE]', err)
    return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
}
