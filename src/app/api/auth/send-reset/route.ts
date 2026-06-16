import { createClient } from '@supabase/supabase-js'

// Rate limit: max 3 reset requests per phone per hour
const rateMap = new Map<string, { count: number; resetAt: number }>()

function checkRate(phone: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(phone)
  if (!entry || now > entry.resetAt) {
    rateMap.set(phone, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function notifyAdmin(text: string) {
  const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? ''
  if (adminId) await sendTelegram(adminId, text)
}

export async function POST(request: Request) {
  let phone: string
  try {
    const body = await request.json()
    phone = String(body.phone ?? '').replace(/\D/g, '').trim()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  // Normalize KZ phone
  if (phone.startsWith('8') && phone.length === 11) phone = '7' + phone.slice(1)
  if (!(/^7\d{10}$/.test(phone))) {
    return Response.json({ ok: true }) // don't reveal validation errors
  }

  // Rate limit silently
  if (!checkRate(phone)) {
    return Response.json({ ok: true })
  }

  const db = adminClient()

  // Look up profile (don't reveal whether phone exists to the caller)
  const { data: profile } = await db
    .from('profiles')
    .select('username, business_name, telegram_chat_id')
    .eq('phone', phone)
    .maybeSingle()

  if (!profile) {
    // Still return ok — prevents user enumeration
    return Response.json({ ok: true })
  }

  // Generate a Supabase password recovery link (server-side, never exposed to browser)
  const email = `${phone}@users.tapni.kz`
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://tapni.kz/auth/set-password' },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[send-reset] generateLink error', linkError)
    return Response.json({ ok: true })
  }

  const actionLink = linkData.properties.action_link
  const msg =
    `🔐 <b>Сброс пароля tapni.kz</b>\n\n` +
    `Запрошена смена пароля для аккаунта <b>${profile.business_name}</b> (tapni.kz/${profile.username}).\n\n` +
    `<b>Ссылка действует 1 час и одноразовая.</b>\n\n` +
    `Если вы не запрашивали сброс — проигнорируйте это сообщение.\n\n` +
    `👉 <a href="${actionLink}">Задать новый пароль</a>`

  if (profile.telegram_chat_id) {
    // Automated: send directly to user's Telegram
    await sendTelegram(profile.telegram_chat_id, msg)
  } else {
    // Manual fallback: notify admin to forward via WhatsApp
    await notifyAdmin(
      `🔐 <b>Запрос сброса пароля</b>\n\n` +
      `👤 ${profile.business_name} (tapni.kz/${profile.username})\n` +
      `📱 +${phone}\n` +
      `⚠️ Telegram не привязан — отправьте ссылку через WhatsApp на этот номер.\n\n` +
      `🔗 Ссылка (одноразовая, 1 ч):\n${actionLink}`
    )
  }

  return Response.json({ ok: true, hasTelegram: !!profile.telegram_chat_id })
}
