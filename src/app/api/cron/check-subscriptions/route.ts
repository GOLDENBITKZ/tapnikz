import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegram, adminChatId } from '@/lib/telegram'

const BOT_URL = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const SITE_URL = 'https://tapni.kz'

async function notifyUser(
  telegramChatId: string,
  text: string,
  buttons?: { text: string; url?: string }[][]
) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !telegramChatId) return
  try {
    await fetch(`${BOT_URL()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text,
        parse_mode: 'HTML',
        ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
      }),
    })
  } catch {
    // non-fatal
  }
}

export async function GET(request: Request) {
  // FIX #2: guard against missing CRON_SECRET (avoids "Bearer undefined" bypass)
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const now = new Date()
  const chatId = adminChatId()

  // ── 1. Expire overdue subscriptions ──────────────────────────────────
  const { data: expired } = await db
    .from('profiles')
    .update({ is_premium: false })
    .eq('is_premium', true)
    .lt('subscription_expires_at', now.toISOString())
    .select('username, phone, telegram_chat_id, business_name')

  if (expired?.length) {
    const lines = (expired as { username: string; phone: string | null }[]).map(
      (p) => `🔴 ${p.username} +${p.phone ?? '?'}`
    )
    await sendTelegram(chatId, `🔴 <b>Подписки истекли (${expired.length}):</b>\n\n${lines.join('\n')}`)

    // Notify each user who has Telegram linked
    for (const p of expired as { telegram_chat_id: string | null; username: string }[]) {
      if (!p.telegram_chat_id) continue
      await notifyUser(
        p.telegram_chat_id,
        `😔 <b>Ваш Premium истёк</b>\n\n` +
        `Страница tapni.kz/${p.username} перешла на бесплатный план.\n` +
        `Доступны только первые 3 кнопки.\n\n` +
        `Продлите подписку — данные и ссылка сохранятся:`,
        [[{ text: '🔄 Продлить Premium', url: `${SITE_URL}/pay` }]]
      )
    }
  }

  // ── 2. Warn users expiring in ~7 days (window: 6d–7d remaining) ──────
  const in6d = new Date(now.getTime() + 6 * 86400000).toISOString()
  const in7d = new Date(now.getTime() + 7 * 86400000).toISOString()
  const { data: expiring7 } = await db
    .from('profiles')
    .select('username, phone, subscription_expires_at, subscription_plan, telegram_chat_id')
    .eq('is_premium', true)
    .gt('subscription_expires_at', in6d)
    .lte('subscription_expires_at', in7d)

  if (expiring7?.length) {
    const lines = (expiring7 as { username: string; phone: string | null; subscription_expires_at: string }[]).map((p) => {
      const d = new Date(p.subscription_expires_at).toLocaleDateString('ru-KZ')
      return `⚠️ ${p.username} +${p.phone ?? '?'} — до ${d}`
    })
    await sendTelegram(chatId, `⚠️ <b>Истекают через ~7 дней (${expiring7.length}):</b>\n\n${lines.join('\n')}`)

    for (const p of expiring7 as { telegram_chat_id: string | null; username: string; subscription_expires_at: string }[]) {
      if (!p.telegram_chat_id) continue
      const expiryDate = new Date(p.subscription_expires_at).toLocaleDateString('ru-KZ')
      await notifyUser(
        p.telegram_chat_id,
        `⏰ <b>Напоминание о Premium</b>\n\n` +
        `Ваша подписка на tapni.kz/${p.username} истекает <b>${expiryDate}</b> — через 7 дней.\n\n` +
        `Продлите заранее — ссылка и все кнопки останутся на месте.`,
        [[{ text: '🔄 Продлить Premium', url: `${SITE_URL}/pay` }]]
      )
    }
  }

  // ── 3. Warn users expiring in ~3 days (window: 2d–3d remaining) ──────
  const in2d = new Date(now.getTime() + 2 * 86400000).toISOString()
  const in3d = new Date(now.getTime() + 3 * 86400000).toISOString()
  const { data: expiring3 } = await db
    .from('profiles')
    .select('username, phone, subscription_expires_at, subscription_plan, telegram_chat_id')
    .eq('is_premium', true)
    .gt('subscription_expires_at', in2d)
    .lte('subscription_expires_at', in3d)

  if (expiring3?.length) {
    const lines = (expiring3 as { username: string; phone: string | null; subscription_expires_at: string }[]).map((p) => {
      const d = new Date(p.subscription_expires_at).toLocaleDateString('ru-KZ')
      return `🚨 ${p.username} +${p.phone ?? '?'} — до ${d}`
    })
    await sendTelegram(chatId, `🚨 <b>Истекают через ~3 дня (${expiring3.length}):</b>\n\n${lines.join('\n')}`)

    for (const p of expiring3 as { telegram_chat_id: string | null; username: string; subscription_expires_at: string }[]) {
      if (!p.telegram_chat_id) continue
      const expiryDate = new Date(p.subscription_expires_at).toLocaleDateString('ru-KZ')
      await notifyUser(
        p.telegram_chat_id,
        `🚨 <b>Premium истекает через 3 дня!</b>\n\n` +
        `Дата: <b>${expiryDate}</b>\n\n` +
        `Если не продлить — страница tapni.kz/${p.username} вернётся к 3 бесплатным кнопкам.\n` +
        `Продлите прямо сейчас:`,
        [[{ text: '💳 Продлить сейчас', url: `${SITE_URL}/pay` }]]
      )
    }
  }

  return Response.json({
    ok: true,
    expired: expired?.length ?? 0,
    expiring7: expiring7?.length ?? 0,
    expiring3: expiring3?.length ?? 0,
  })
}
