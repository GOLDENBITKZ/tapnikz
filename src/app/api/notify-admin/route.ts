import { sendTelegram, sendTelegramWithButtons, adminChatId } from '@/lib/telegram'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// In-process rate limit: max 3 payment requests per username per hour
const rateMap = new Map<string, { count: number; resetAt: number }>()

function checkRate(username: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(username)
  if (!entry || now > entry.resetAt) {
    // Prune expired entries when map grows large to prevent memory leak
    if (rateMap.size > 200) {
      for (const [k, v] of rateMap) { if (now > v.resetAt) rateMap.delete(k) }
    }
    rateMap.set(username, { count: 1, resetAt: now + 3600_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

// Verify Supabase JWT from Authorization header and return the profile username
// Returns null if unauthenticated or no profile found
async function verifyAuthUsername(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = getSupabaseAdmin() as any
    const { data: { user }, error } = await adminDb.auth.getUser(token)
    if (error || !user) return null
    const { data: prof } = await adminDb.from('profiles').select('username').eq('id', user.id).maybeSingle()
    return prof?.username ?? null
  } catch {
    return null
  }
}

type Payload =
  | { type: 'new_user'; username: string; phone: string; business_name: string }
  | { type: 'payment_request'; username: string; phone?: string; plan?: 'monthly' | 'annual' }
  | { type: 'invoice_request'; username: string; phone?: string; company: string; bin: string }
  | { username: string }

export async function POST(request: Request) {
  let body: Payload
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!('username' in body) || !body.username || typeof body.username !== 'string') {
    return Response.json({ error: 'username required' }, { status: 400 })
  }

  const username = body.username.replace(/[^a-z0-9-]/g, '').slice(0, 40)
  if (!username) return Response.json({ error: 'invalid username' }, { status: 400 })

  const chatId = adminChatId()
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    return Response.json({ ok: true })
  }

  let text: string

  if ('type' in body && body.type === 'new_user') {
    // Rate-limit new_user pings before hitting the DB
    if (!checkRate(username)) {
      return Response.json({ ok: true })
    }
    // Verify by DB: profile must exist and have been created within the last 5 minutes.
    // JWT-based auth is unreliable here — after auth.signUp() the session may not be
    // immediately available if Supabase email confirmation is enabled.
    const adminDb2 = getSupabaseAdmin() as any
    const { data: newProf } = await adminDb2.from('profiles')
      .select('id, created_at, business_name, phone')
      .eq('username', username)
      .maybeSingle()
    if (!newProf) {
      return Response.json({ error: 'profile not found' }, { status: 404 })
    }
    const ageMs = Date.now() - new Date(newProf.created_at).getTime()
    if (ageMs > 300_000) {
      return Response.json({ error: 'registration window expired' }, { status: 403 })
    }

    text =
      `🆕 <b>Новый пользователь</b>\n\n` +
      `📎 tapni.kz/${username}\n` +
      `👤 ${esc(String(newProf.business_name ?? ''))}\n` +
      `📱 +${esc(String(newProf.phone ?? ''))}`

    let giftActivated = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminDb = getSupabaseAdmin() as any
      const { data: gift } = await adminDb.from('gift_codes').select('days, note').eq('username', username).maybeSingle()
      if (gift?.days) {
        const days: number = gift.days
        const expires = new Date(Date.now() + days * 86400000).toISOString()
        const plan = days >= 300 ? 'annual' : 'monthly'
        await adminDb.from('profiles').update({ is_premium: true, subscription_expires_at: expires, subscription_plan: plan }).eq('username', username)
        await adminDb.from('gift_codes').delete().eq('username', username)
        giftActivated = true
        const expiryDate = new Date(expires).toLocaleDateString('ru-KZ')
        text += `\n\n🎁 <b>Подарок автоактивирован!</b> ${gift.note ? `(${esc(gift.note)}) ` : ''}${days} дней · до ${expiryDate}`
      }
    } catch {
      // gift_codes table may not exist — skip silently
    }
    await sendTelegramWithButtons(chatId, text, [
      ...(giftActivated ? [] : [[
        { text: '⚡ Дать 1 год (365 д)', callback_data: `quick_activate:${username}:365` },
        { text: '📅 Дать месяц', callback_data: `quick_activate:${username}:30` },
      ]]),
      [{ text: '🔍 Профиль', callback_data: `admin_find:${username}` }],
    ])
    return Response.json({ ok: true })

  } else if ('type' in body && body.type === 'payment_request') {
    // FIX #1: Require authenticated session and verify username ownership
    const callerUsername = await verifyAuthUsername(request)
    if (!callerUsername) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (callerUsername !== username) {
      return Response.json({ error: 'Forbidden — username mismatch' }, { status: 403 })
    }

    if (!checkRate(username)) {
      return Response.json({ ok: true })
    }

    const b = body as { type: 'payment_request'; username: string; phone?: string; plan?: 'monthly' | 'annual' }
    const plan = b.plan === 'annual' ? 'annual' : 'monthly'
    const days = plan === 'annual' ? 365 : 30
    const planLabel = plan === 'annual' ? '⭐ Годовая (10 000 ₸)' : '📅 Месячная (1 000 ₸)'

    // Create pending payment — admin activates manually or cron auto-confirms after PENDING_AUTO_CONFIRM_HOURS
    let pendingId: string | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminDb = getSupabaseAdmin() as any
      const { data: pmtData } = await adminDb.from('payments').insert({
        username,
        plan,
        amount: plan === 'annual' ? 10000 : 1000,
        days,
        method: 'kaspi',
        status: 'pending',
        provider: 'kaspi_manual',
        ...(b.phone ? { notes: `phone: +${b.phone}` } : {}),
      }).select('id').maybeSingle()
      pendingId = pmtData?.id ?? null
    } catch {
      // payments table may not exist — run SUPABASE_MIGRATION_V7.sql + V12.sql
    }

    text =
      `💳 <b>Запрос Premium — ожидает подтверждения</b>\n\n` +
      `📎 tapni.kz/${username}\n` +
      (b.phone ? `📱 +${esc(b.phone)}\n` : '') +
      `📦 ${planLabel}\n` +
      `🔑 Код: TAP-${username}\n\n` +
      `⏱ Авто-активация через ${process.env.PENDING_AUTO_CONFIRM_HOURS ?? '6'}ч если не отменить.`

    await sendTelegramWithButtons(chatId, text, [
      [
        { text: `⚡ Активировать (${days} д)`, callback_data: `quick_activate:${username}:${days}` },
        { text: '❌ Отменить', callback_data: `cancel_premium:${username}` },
      ],
    ])

    return Response.json({ ok: true, pending: true, pendingId })

  } else if ('type' in body && body.type === 'invoice_request') {
    // FIX #1: Require auth for invoice requests too
    const callerUsername = await verifyAuthUsername(request)
    if (!callerUsername) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (callerUsername !== username) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!checkRate(username)) {
      return Response.json({ ok: true })
    }
    const b = body as { type: 'invoice_request'; username: string; phone?: string; company: string; bin: string }
    text =
      `🧾 <b>Запрос счёта (юрлицо)</b>\n\n` +
      `📎 tapni.kz/${username}\n` +
      (b.phone ? `📱 +${esc(b.phone)}\n` : '') +
      `🏢 ${esc(b.company)}\n` +
      `🔢 БИН: ${esc(b.bin)}\n` +
      `📦 Годовой тариф — 10 000 ₸\n` +
      `🔑 Код: TAP-${username}\n` +
      `\n✅ Активировать после оплаты: <code>/activate ${username} 365</code>`

  } else {
    // Legacy path — require auth to prevent anonymous admin spam
    const callerUsername = await verifyAuthUsername(request)
    if (!callerUsername) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (callerUsername !== username) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!checkRate(username)) {
      return Response.json({ ok: true })
    }
    text =
      `🔔 <b>tapni.kz — Запрос Premium</b>\n\n` +
      `Пользователь @${username} хочет Premium\n` +
      `\nАктивировать: /activate ${username} 30`
  }

  await sendTelegram(chatId, text)
  return Response.json({ ok: true })
}
