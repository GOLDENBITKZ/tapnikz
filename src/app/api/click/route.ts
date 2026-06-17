import { createClient } from '@supabase/supabase-js'

// FIX #3: removed 'edge' runtime — Edge terminates before fire-and-forget completes

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const HOME = 'https://tapni.kz'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  // Require a valid link ID — prevents open redirect abuse
  if (!id) return Response.redirect(HOME)

  const db = adminClient()
  const { data } = await db
    .from('links')
    .select('url')
    .eq('id', id)
    .maybeSingle()

  if (!data?.url) return Response.redirect(HOME)

  // Product links store JSON — extract the actual product URL
  let targetUrl = data.url
  if (data.url.startsWith('{')) {
    try {
      const parsed = JSON.parse(data.url) as { l?: string }
      targetUrl = parsed.l ?? ''
    } catch {
      return Response.redirect(HOME)
    }
  }

  // Validate URL scheme
  try {
    const parsed = new URL(targetUrl)
    if (!['http:', 'https:', 'tel:', 'mailto:'].includes(parsed.protocol)) {
      return Response.redirect(HOME)
    }
  } catch {
    return Response.redirect(HOME)
  }

  // FIX #3: await before redirect — edge runtime would drop fire-and-forget
  // Also insert into click_events for time-series analytics (V8)
  await Promise.all([
    db.rpc('increment_link_click', { p_link_id: id }).then(() => {}, () => {}),
    db.from('click_events').insert([{ link_id: id }]).then(() => {}, () => {}),
  ])

  return Response.redirect(targetUrl)
}
