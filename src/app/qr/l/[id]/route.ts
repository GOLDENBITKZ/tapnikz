import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const HOME = 'https://tapni.kz'

type SmartQrData = { ios?: string; android?: string; web?: string; label?: string }

// Returns true if URL is a Play Store / App Store direct link (redirect directly, no intent needed)
function isStoreUrl(url: string) {
  return /play\.google\.com\/store|apps\.apple\.com/i.test(url)
}

function buildAndroidIntent(androidUrl: string, fallback: string): string {
  try {
    const { hostname, pathname, search } = new URL(androidUrl)
    const fb = encodeURIComponent(fallback)
    return `intent://${hostname}${pathname}${search}#Intent;scheme=https;package=;S.browser_fallback_url=${fb};end`
  } catch {
    return fallback
  }
}

// Lightweight bridge page for in-app browsers (Instagram/TikTok WebView)
// JS tries intent:// scheme; button shown as fallback
function bridgePage(intentUrl: string, webUrl: string, label: string): Response {
  const intentJson = JSON.stringify(intentUrl)
  const webJson = JSON.stringify(webUrl)
  const labelEsc = label.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${labelEsc}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0c0c18;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:24px;text-align:center}
.title{font-size:17px;font-weight:700}
.sub{font-size:13px;color:#9ca3af;line-height:1.5}
.btn{margin-top:8px;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:14px;text-decoration:none}
.alt{font-size:12px;color:#6b7280;margin-top:8px}
a.web{color:#818cf8;font-size:13px;margin-top:6px;display:block}
</style>
</head><body>
<p class="title">📲 ${labelEsc}</p>
<p class="sub">Открываем приложение…<br>Если не открылось — нажмите кнопку</p>
<a id="btn" class="btn" href="#">Открыть приложение</a>
<a class="web" href="#">Открыть в браузере</a>
<script>
var intent=${intentJson}, web=${webJson};
document.getElementById('btn').href=intent;
document.querySelectorAll('a.web')[0].href=web;
var t=setTimeout(function(){window.location=web;},1800);
document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(t);});
setTimeout(function(){window.location=intent;},200);
</script>
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validate UUID format to prevent DB abuse
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.redirect(HOME, 302)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any

  const { data: link } = await db
    .from('links')
    .select('id, url, title')
    .eq('id', id)
    .eq('icon_type', 'smart_qr')
    .maybeSingle()

  if (!link?.url) return Response.redirect(HOME, 302)

  let data: SmartQrData = {}
  try { data = JSON.parse(link.url) } catch { return Response.redirect(HOME, 302) }

  const ios = data.ios?.trim() || ''
  const android = data.android?.trim() || ''
  const web = data.web?.trim() || HOME
  const label = link.title || data.label || 'Открыть приложение'

  if (!ios && !android && !web) return Response.redirect(HOME, 302)

  // Track as QR scan (source differentiates from regular clicks)
  Promise.all([
    db.rpc('increment_link_click', { p_link_id: id }),
    db.from('click_events').insert([{ link_id: id, source: 'qr_scan' }]),
  ]).catch(() => {})

  const ua = req.headers.get('user-agent') ?? ''
  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isInAppBrowser = /Instagram|FBAN|FBAV|TikTok|BytedanceWebview/i.test(ua)

  if (isAndroid) {
    const target = android || web
    if (isStoreUrl(target)) {
      return Response.redirect(target, 302)
    }
    if (isInAppBrowser && android) {
      // WebView can't handle intent:// natively — show bridge page
      const intentUrl = buildAndroidIntent(android, web)
      return bridgePage(intentUrl, web, label)
    }
    if (android) {
      return Response.redirect(buildAndroidIntent(android, web), 302)
    }
    return Response.redirect(web, 302)
  }

  if (isIOS) {
    return Response.redirect(ios || web, 302)
  }

  // Desktop
  return Response.redirect(web, 302)
}
