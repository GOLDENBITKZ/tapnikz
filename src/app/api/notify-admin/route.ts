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
    // Verify caller is the newly registered user (or allow without token for legacy compat)
    const callerUsername = await verifyAuthUsername(request)
    if (callerUsername && callerUsername !== username) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const b = body as { type: 'new_user'; username: string; phone: string; business_name: string }
    text =
      `🆕 <b>Новый пользователь</b>\n\n` +
      `📎 tapni.kz/${username}\n` +
      `👤 ${esc(b.business_name)}\n` +
      `📱 +${esc(b.phone)}`

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

    // Auto-provision 3 days immediately so user gets instant access
    let provisioned = false
    let userTgId: string | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminDb = getSupabaseAdmin() as any
      const provExpires = new Date(Date.now() + 3 * 86400000).toISOString()
      const { data: provData } = await adminDb
        .from('profiles')
        .update({ is_premium: true, subscription_expires_at: provExpires, subscription_plan: plan, updated_at: new Date().toISOString() })
        .eq('username', username)
        .select('id, telegram_chat_id')
        .maybeSingle()
      if (provData) {
        provisioned = true
        userTgId = provData.telegram_chat_id ?? null
      }
    } catch {
      // DB error — admin activates manually
    }

    text =
      `💳 <b>Запрос Premium${provisioned ? ' — авто-выдан на 3 дня ⚡' : ''}</b>\n\n` +
      `📎 tapni.kz/${username}\n` +
      // FIX #7: escape phone field
      (b.phone ? `📱 +${esc(b.phone)}\n` : '') +
      `📦 ${planLabel}\n` +
      `🔑 Код: TAP-${username}` +
      (provisioned
        ? `\n\n⚠️ Временный доступ выдан. Подтвердите оплату → продлится до ${days} дней. Если не оплачено — отмените.`
        : '')

    await sendTelegramWithButtons(chatId, text, [
      [{ text: `✅ Подтвердить ${days} дней`, callback_data: `quick_activate:${username}:${days}` }],
      [{ text: '❌ Отменить (не оплачено)', callback_data: `cancel_premium:${username}` }],
    ])

    if (provisioned && userTgId && process.env.TELEGRAM_BOT_TOKEN) {
      const expiryDate = new Date(Date.now() + 3 * 86400000).toLocaleDateString('ru-KZ')
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userTgId,
            text:
              `⚡ <b>Premium активирован!</b>\n\n` +
              `${plan === 'annual' ? '⭐ Годовая подписка' : '📅 Месячная подписка'}\n` +
              `📅 Действует до: <b>${expiryDate}</b>\n\n` +
              `✅ Безлимит кнопок · Логотип · QR-код\n\n` +
              `После подтверждения платежа подписка продлится до полного срока.`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '🔑 Открыть кабинет', url: 'https://tapni.kz/dashboard' }]] },
          }),
        })
      } catch {
        // non-fatal
      }
    }

    return Response.json({ ok: true, provisioned })

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
