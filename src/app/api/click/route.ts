import { getSupabaseAdmin } from '@/lib/supabase-admin'

// FIX #3: removed 'edge' runtime — Edge terminates before fire-and-forget completes

const HOME = 'https://tapni.kz'

// Rate limit: max 30 clicks per IP per hour (blocks bots; a human visits ~1-5 links per session)
const clickRateMap = new Map<string, { count: number; resetAt: number }>()
function checkClickRate(ip: string): boolean {
  const now = Date.now()
  if (clickRateMap.size > 1000) {
    for (const [k, v] of clickRateMap) { if (now > v.resetAt) clickRateMap.delete(k) }
  }
  const entry = clickRateMap.get(ip)
  if (!entry || now > entry.resetAt) { clickRateMap.set(ip, { count: 1, resetAt: now + 3_600_000 }); return true }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  // Require a valid UUID — prevents unnecessary DB errors and open redirect abuse
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.redirect(HOME)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const countClick = checkClickRate(ip)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data } = await db
    .from('links')
    .select('url')
    .eq('id', id)
    .maybeSingle()

  if (!data?.url) return Response.redirect(HOME)

  // Product / follow_gate / instagram_keyword links store JSON — extract the actual URL
  let targetUrl = data.url
  if (data.url.startsWith('{')) {
    try {
      const parsed = JSON.parse(data.url) as { l?: string; content?: string; ig?: string; link?: string }
      targetUrl = parsed.l ?? parsed.content ?? parsed.link ?? (parsed.ig ? `https://ig.me/m/${parsed.ig}` : '')
    } catch {
      return Response.redirect(HOME)
    }
  }

  // Validate URL scheme and tel: format
  try {
    const parsed = new URL(targetUrl)
    if (!['http:', 'https:', 'tel:', 'mailto:'].includes(parsed.protocol)) {
      return Response.redirect(HOME)
    }
    if (parsed.protocol === 'tel:' && !/^\+?[\d\s\-()]+$/.test(parsed.pathname)) {
      return Response.redirect(HOME)
    }
  } catch {
    return Response.redirect(HOME)
  }

  // FIX #3: await before redirect — edge runtime would drop fire-and-forget
  // Also insert into click_events for time-series analytics (V8)
  // Skip tracking if IP is rate-limited (prevents click inflation from bots)
  const track = countClick ? () => Promise.all([
    db.rpc('increment_link_click', { p_link_id: id }).then(() => {}, () => {}),
    db.from('click_events').insert([{ link_id: id }]).then(() => {}, () => {}),
  ]) : () => Promise.resolve()

  // Smart Telegram deep link — bypasses t.me domain blocks (Russia, KZ, etc.).
  // tg:// scheme opens the installed Telegram app directly without touching t.me.
  // Falls back to telegram.me (distinct domain from t.me, often unblocked separately).
  const isTelegramLink = /https?:\/\/t\.me\//.test(targetUrl)
  if (isTelegramLink) {
    let appScheme = ''
    // telegram.me is Telegram's alternate domain — different CDN/IP from t.me
    const fallbackUrl = targetUrl.replace('//t.me/', '//telegram.me/')

    try {
      const tgUrl = new URL(targetUrl)
      const pathname = tgUrl.pathname

      if (pathname.startsWith('/joinchat/')) {
        // Old-style invite link: t.me/joinchat/HASH
        const hash = pathname.replace('/joinchat/', '')
        appScheme = `tg://join?invite=${hash}`
      } else if (pathname.startsWith('/+')) {
        // New-style invite link: t.me/+HASH
        const hash = pathname.slice(2)
        appScheme = `tg://join?invite=${hash}`
      } else {
        const parts = pathname.split('/').filter(Boolean)
        const username = parts[0]
        if (username) {
          const start = tgUrl.searchParams.get('start')
          appScheme = `tg://resolve?domain=${encodeURIComponent(username)}`
          if (start) appScheme += `&start=${encodeURIComponent(start)}`
          if (parts[1] && /^\d+$/.test(parts[1])) appScheme += `&post=${parts[1]}`
        }
      }
    } catch { /* malformed URL — fall through to web fallback */ }

    const appJson = JSON.stringify(appScheme)
    const fallbackJson = JSON.stringify(fallbackUrl)
    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Telegram</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0c0c18;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:24px;text-align:center}
.icon{width:64px;height:64px;background:#2AABEE;border-radius:16px;display:flex;align-items:center;justify-content:center}
.title{font-size:17px;font-weight:700}
.sub{font-size:13px;color:#9ca3af;line-height:1.5}
.btn{margin-top:8px;display:inline-flex;align-items:center;gap:8px;background:#2AABEE;color:#fff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:14px;text-decoration:none;transition:opacity .15s}
.btn:active{opacity:.8}
.alt{font-size:12px;color:#6b7280;text-decoration:underline;cursor:pointer;margin-top:4px}
</style>
</head><body>
<div class="icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg></div>
<p class="title">Открытие Telegram…</p>
<p class="sub">Если приложение не открылось<br>нажмите кнопку ниже</p>
<a id="btn" class="btn" href="#">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg>
  Открыть в Telegram
</a>
<script>
var app=${appJson},fb=${fallbackJson};
var btn=document.getElementById('btn');
btn.href=app||fb;

// Try deep link immediately
if(app){
  var timer=setTimeout(function(){window.location.href=fb;},1600);
  // If app opened, page goes hidden — cancel fallback redirect
  document.addEventListener('visibilitychange',function(){
    if(document.hidden)clearTimeout(timer);
  });
  // Small delay so page renders before redirect
  setTimeout(function(){window.location.href=app;},150);
}else{
  window.location.href=fb;
}
</script>
</body></html>`

    await track()
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  }

  // Smart Instagram deep link — serve an HTML page that tries the native app first.
  // Only for instagram.com URLs; ig.me links are already handled natively by Meta.
  const isInstagramCom = targetUrl.includes('instagram.com/') && !targetUrl.includes('ig.me/')
  if (isInstagramCom) {
    let appScheme = ''
    try {
      const igUrl = new URL(targetUrl)
      const parts = igUrl.pathname.split('/').filter(Boolean)
      if (parts[0] === 'reel' && parts[1]) {
        // Reels: instagram://reels/<shortcode>
        appScheme = `instagram://reels/${parts[1]}`
      } else if (parts[0] && !['reel', 'p', 'stories', 'tv', 'explore', 'accounts'].includes(parts[0])) {
        // Profile page
        appScheme = `instagram://user?username=${parts[0]}`
      }
    } catch { /* malformed URL — fall through to web redirect */ }

    const webUrlJson = JSON.stringify(targetUrl)
    const appUrlJson = JSON.stringify(appScheme)
    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instagram</title>
<style>body{background:#1a1a2e;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>
</head><body><p style="opacity:0.5;font-size:14px">Открытие Instagram...</p>
<script>
var w=${webUrlJson},a=${appUrlJson};
var m=/iphone|ipad|ipod|android/i.test(navigator.userAgent);
if(m&&a){window.location=a;setTimeout(function(){window.location=w},1500);}else{window.location=w;}
</script></body></html>`

    await track()
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  await track()
  return Response.redirect(targetUrl)
}
