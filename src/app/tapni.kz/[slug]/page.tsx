import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { decodeAliasParam, toAliasHex } from '@/lib/unicode-utils'

// Static "tapni.kz" folder living alongside the dynamic [username] route.
// Next.js resolves static segments before dynamic ones, so this claims
// /tapni.kz/* — but only the sub-paths: there is deliberately no page.tsx
// at src/app/tapni.kz/, so /tapni.kz itself still falls through to
// [username] and would render a profile named "tapni.kz" normally.
//
// Note the DB does NOT prevent that name — the live CHECK is
// ^[a-z0-9][a-z0-9._-]{2,31}$, which permits dots (that's how the brand
// profiles egov.kz, kolesa.kz etc. exist); the regex in SUPABASE_SCHEMA.sql
// is stale. What actually keeps this collision-free is 'tapni.kz' being in
// RESERVED_ROUTE_WORDS, enforced at signup and rename. Emoji aliases are
// safe by the same CHECK for a different reason: it allows no character
// outside [a-z0-9._-], so no username can ever equal a symbol alias.
//
// force-dynamic (unlike [username]/page.tsx's revalidate=60): this is a
// brand-new route with no generateStaticParams and no existing caching
// contract — without this, Next's default static-render heuristic would
// cache the first response indefinitely, so an alias reserved after the
// first (miss) visit could stay unreachable through this URL form forever.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function BrandedAliasRedirectPage({ params }: Props) {
  const { slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: alias } = await db
    .from('aliases')
    .select('target_url')
    .eq('alias_hex', toAliasHex(decodeAliasParam(slug)))
    .maybeSingle()

  if (!alias?.target_url) notFound()
  redirect(alias.target_url)
}
