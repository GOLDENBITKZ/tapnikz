import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const HOME = 'https://tapni.kz'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { username } = await params

  // Resolve profile → ediny_qr link
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return Response.redirect(`${HOME}/${username}`, 302)

  const { data: link } = await db
    .from('links')
    .select('id, url')
    .eq('profile_id', profile.id)
    .eq('icon_type', 'ediny_qr')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!link?.url?.startsWith('https://')) {
    return Response.redirect(`${HOME}/${username}`, 302)
  }

  // Track as click (same pipeline as /api/click — increments click_count + click_events)
  Promise.all([
    db.rpc('increment_link_click', { p_link_id: link.id }),
    db.from('click_events').insert([{ link_id: link.id }]),
  ]).catch(() => {})

  const ua = req.headers.get('user-agent') ?? ''
  const payUrl = link.url
  const isKaspiUrl = payUrl.startsWith('https://pay.kaspi.kz/')

  // Android + Kaspi URL: Intent opens Kaspi app directly; fallback = raw URL
  if (/Android/i.test(ua) && isKaspiUrl) {
    const { hostname, pathname } = new URL(payUrl)
    const fallback = encodeURIComponent(payUrl)
    return Response.redirect(
      `intent://${hostname}${pathname}#Intent;scheme=https;package=kz.kaspi.mobile;S.browser_fallback_url=${fallback};end`,
      302
    )
  }

  // Other banks / НПК URLs / iOS / Desktop → direct redirect to payment URL
  return Response.redirect(payUrl, 302)
}
