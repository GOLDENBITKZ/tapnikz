import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegram } from '@/lib/telegram'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Rate limit: 3 lead submissions per phone+profile per hour
const rateMap = new Map<string, { count: number; resetAt: number }>()
function checkRate(key: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3600_000 }); return true }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(request: Request) {
  let body: { username: string; link_id?: string; name?: string; phone?: string; message?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'invalid json' }, { status: 400 }) }

  const { username, link_id, name = '', phone = '', message = '' } = body
  if (!username || typeof username !== 'string') return Response.json({ error: 'username required' }, { status: 400 })
  if (!name.trim()) return Response.json({ error: 'name required' }, { status: 400 })
  if (!phone.trim()) return Response.json({ error: 'phone required' }, { status: 400 })

  const cleanPhone = phone.replace(/\D/g, '').slice(0, 15)
  if (cleanPhone.length < 10) return Response.json({ error: 'invalid phone' }, { status: 400 })

  const rateKey = `${username}:${cleanPhone}`
  if (!checkRate(rateKey)) return Response.json({ ok: true }) // silently ignore

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: prof } = await adminDb
    .from('profiles')
    .select('id, business_name, telegram_chat_id, is_premium')
    .eq('username', username)
    .maybeSingle()

  if (!prof) return Response.json({ error: 'profile not found' }, { status: 404 })

  await adminDb.from('lead_submissions').insert([{
    profile_id: prof.id,
    link_id: link_id ?? null,
    name: name.trim().slice(0, 100),
    phone: cleanPhone,
    message: message.trim().slice(0, 500) || null,
  }])

  // Notify profile owner via Telegram
  if (prof.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
    const text =
      `📩 <b>Новая заявка!</b>\n\n` +
      `👤 ${esc(name.trim())}\n` +
      `📱 +${cleanPhone}\n` +
      (message.trim() ? `💬 ${esc(message.trim())}\n` : '') +
      `\n📎 Страница: tapni.kz/${username}`
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: prof.telegram_chat_id,
          text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '📋 Все заявки', url: 'https://tapni.kz/dashboard' },
              { text: `📞 +${cleanPhone}`, url: `https://wa.me/${cleanPhone}` },
            ]],
          },
        }),
      })
    } catch { /* non-fatal */ }
  }

  // Also notify admin if owner has no Telegram
  if (!prof.telegram_chat_id) {
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    if (adminChatId && process.env.TELEGRAM_BOT_TOKEN) {
      await sendTelegram(adminChatId,
        `📩 <b>Заявка без Telegram</b> → ${username}\n👤 ${esc(name.trim())} · +${cleanPhone}`
      )
    }
  }

  return Response.json({ ok: true })
}
