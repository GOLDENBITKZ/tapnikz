import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { toAliasHex } from '@/lib/unicode-utils'

// Safe to add as a static "tapni.kz" folder alongside the dynamic [username]
// route: profiles.username is CHECK-constrained to ^[a-z0-9-]{3,32}$ (no dot),
// so no real profile can ever be named "tapni.kz" — this can never collide
// with a user's own page, and Next.js resolves static segments before
// dynamic ones, so /tapni.kz/* never reaches [username]/page.tsx at all.
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
    .eq('alias_hex', toAliasHex(slug))
    .maybeSingle()

  if (!alias?.target_url) notFound()
  redirect(alias.target_url)
}
