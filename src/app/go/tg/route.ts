// Smart Telegram redirect — bypasses t.me domain blocks (Russia, KZ, etc.).
// Usage: /go/tg?u=username  or  /go/tg?u=joinchat/HASH  or  /go/tg?u=%2BHASH

const HOME = 'https://tapni.kz'
const TG_WEB_BASE = 'https://telegram.me'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const u = searchParams.get('u')?.trim()
  // Optional ?start= param for bot deep links (e.g. /go/tg?u=botname&start=receipt_xyz)
  const startOverride = searchParams.get('start')

  if (!u) return Response.redirect(HOME)

  // Sanitize: only allow safe characters in a Telegram username/path
  if (!/^[A-Za-z0-9@_+\-/?.=&%]+$/.test(u)) return Response.redirect(HOME)
  if (startOverride && !/^[A-Za-z0-9_\-]+$/.test(startOverride)) return Response.redirect(HOME)

  // Strip leading @ or /
  const clean = u.replace(/^[@/]+/, '')

  let appScheme = ''
  let fallbackUrl = `${TG_WEB_BASE}/${clean}`

  if (clean.startsWith('joinchat/')) {
    const hash = clean.replace('joinchat/', '')
    appScheme = `tg://join?invite=${encodeURIComponent(hash)}`
    fallbackUrl = `${TG_WEB_BASE}/joinchat/${hash}`
  } else if (clean.startsWith('+')) {
    const hash = clean.slice(1)
    appScheme = `tg://join?invite=${encodeURIComponent(hash)}`
    fallbackUrl = `${TG_WEB_BASE}/+${hash}`
  } else {
    // username — may have /POST_ID suffix
    const parts = clean.split('/').filter(Boolean)
    const username = parts[0]
    if (!username) return Response.redirect(HOME)

    appScheme = `tg://resolve?domain=${encodeURIComponent(username)}`

    // ?start= from explicit query param takes priority
    if (startOverride) {
      appScheme += `&start=${encodeURIComponent(startOverride)}`
      fallbackUrl = `${TG_WEB_BASE}/${username}?start=${encodeURIComponent(startOverride)}`
    }

    // /channel/POST_ID
    if (parts[1] && /^\d+$/.test(parts[1])) appScheme += `&post=${parts[1]}`
  }

  const appJson = JSON.stringify(appScheme)
  const fbJson = JSON.stringify(fallbackUrl)

  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Telegram</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0c0c18;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:24px;text-align:center}
.icon{width:64px;height:64px;background:#2AABEE;border-radius:16px;display:flex;align-items:center;justify-content:center}
.title{font-size:17px;font-weight:700}
.sub{font-size:13px;color:#9ca3af;line-height:1.5}
.btn{margin-top:8px;display:inline-flex;align-items:center;gap:8px;background:#2AABEE;color:#fff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:14px;text-decoration:none}
.alt{font-size:12px;color:#6b7280;margin-top:4px}
.alt a{color:#9ca3af}
</style>
</head><body>
<div class="icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg></div>
<p class="title">Открытие Telegram…</p>
<p class="sub">Если приложение не открылось<br>нажмите кнопку ниже</p>
<a id="btn" class="btn" href="#">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg>
  Открыть в Telegram
</a>
<p class="alt"><a id="web" href="#">Открыть в браузере</a></p>
<script>
var app=${appJson},fb=${fbJson};
var btn=document.getElementById('btn');
var web=document.getElementById('web');
btn.href=app||fb;
web.href=fb;
if(app){
  var timer=setTimeout(function(){window.location.href=fb;},1600);
  document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(timer);});
  setTimeout(function(){window.location.href=app;},150);
}else{
  window.location.href=fb;
}
</script>
</body></html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
