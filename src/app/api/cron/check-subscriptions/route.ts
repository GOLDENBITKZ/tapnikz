import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegram, adminChatId } from '@/lib/telegram'
import { activatePremium } from '@/lib/activate-premium'

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

  try {

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

  // ── 4. Onboarding sequences ────────────────────────────────────────────
  let onboardingCount = 0

  // Step 2 (day +2): nudge to add buttons if links_count < 2
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 1 * 86400000).toISOString()

  const { data: step1Users } = await db
    .from('profiles')
    .select('id, username, business_name, telegram_chat_id')
    .eq('onboarding_step', 1)
    .not('telegram_chat_id', 'is', null)
    .lte('onboarding_sent_at', twoDaysAgo)
    .gte('onboarding_sent_at', new Date(now.getTime() - 10 * 86400000).toISOString())

  for (const u of (step1Users ?? [])) {
    // Check link count
    const { count: linkCount } = await db
      .from('links').select('*', { count: 'exact', head: true }).eq('profile_id', u.id)
    if ((linkCount ?? 0) >= 2) {
      // Already set up, skip to step 3
      await db.from('profiles').update({ onboarding_step: 2, onboarding_sent_at: new Date().toISOString() }).eq('id', u.id)
      continue
    }
    await notifyUser(
      u.telegram_chat_id,
      `💡 <b>Подсказка для ${u.business_name}</b>\n\n` +
      `Для бизнеса в Казахстане рекомендуем добавить:\n` +
      `✅ <b>WhatsApp</b> — клиенты пишут напрямую\n` +
      `✅ <b>Kaspi Pay</b> — оплата без наличных\n` +
      `✅ <b>2ГИС</b> — клиенты найдут вас на карте\n\n` +
      `Добавьте их в дашборде за 2 минуты 👇`,
      [[{ text: '✏️ Добавить кнопки', url: `${SITE_URL}/dashboard` }]]
    )
    await db.from('profiles').update({ onboarding_step: 2, onboarding_sent_at: new Date().toISOString() }).eq('id', u.id)
    onboardingCount++
  }

  // Step 3 (day +5): share nudge if view_count < 10
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString()
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString()

  const { data: step2Users } = await db
    .from('profiles')
    .select('id, username, business_name, telegram_chat_id, view_count')
    .eq('onboarding_step', 2)
    .not('telegram_chat_id', 'is', null)
    .lte('onboarding_sent_at', threeDaysAgo)
    .gte('onboarding_sent_at', new Date(now.getTime() - 14 * 86400000).toISOString())

  for (const u of (step2Users ?? [])) {
    if ((u.view_count ?? 0) < 10) {
      const shareText = encodeURIComponent(`Все мои контакты здесь: ${SITE_URL}/${u.username} 👆`)
      await notifyUser(
        u.telegram_chat_id,
        `🚀 <b>Ваша страница готова — поделитесь!</b>\n\n` +
        `Отправьте ссылку в:\n` +
        `• WhatsApp-статус\n` +
        `• Instagram bio\n` +
        `• Telegram-канал\n\n` +
        `Готовый текст для клиентов:\n` +
        `<i>"Все мои контакты здесь: ${SITE_URL}/${u.username} 👆"</i>`,
        [
          [{ text: '📤 Поделиться в Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(`${SITE_URL}/${u.username}`)}&text=${shareText}` }],
          [{ text: '🌐 Открыть страницу', url: `${SITE_URL}/${u.username}` }],
        ]
      )
    }
    await db.from('profiles').update({ onboarding_step: 3, onboarding_sent_at: new Date().toISOString() }).eq('id', u.id)
    onboardingCount++
  }

  // Step 4 (day +7): referral nudge
  const { data: step3Users } = await db
    .from('profiles')
    .select('id, username, business_name, telegram_chat_id')
    .eq('onboarding_step', 3)
    .not('telegram_chat_id', 'is', null)
    .lte('onboarding_sent_at', twoDaysAgo)
    .gte('onboarding_sent_at', new Date(now.getTime() - 21 * 86400000).toISOString())

  for (const u of (step3Users ?? [])) {
    await notifyUser(
      u.telegram_chat_id,
      `💼 <b>Зарабатывайте с tapni.kz!</b>\n\n` +
      `Рекомендуйте tapni.kz и получайте <b>20% комиссии</b> с первой оплаты каждого клиента.\n\n` +
      `Ваша ссылка для приглашения клиентов:\n` +
      `<code>${SITE_URL}/auth?ref=${u.username}</code>\n\n` +
      `Узнайте подробнее о программе менеджеров 👇`,
      [
        [{ text: '💼 Стать менеджером', url: `${SITE_URL}/partners` }],
        [{ text: '📤 Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(`${SITE_URL}/auth?ref=${u.username}`)}&text=${encodeURIComponent(`Попробуй tapni.kz — мобильная визитка для бизнеса в Казахстане. Kaspi Pay, 2ГИС, WhatsApp в одной ссылке!`)}` }],
      ]
    )
    await db.from('profiles').update({ onboarding_step: 4, onboarding_sent_at: new Date().toISOString() }).eq('id', u.id)
    onboardingCount++
  }

  if (onboardingCount > 0) {
    await sendTelegram(chatId, `📬 Onboarding сообщений отправлено: <b>${onboardingCount}</b>`)
  }

  // ── 5. Manager inactivity: warn at 45 days, deactivate at 60 days ──────
  const day45ago = new Date(now.getTime() - 45 * 86400000).toISOString()
  const day47ago = new Date(now.getTime() - 47 * 86400000).toISOString()
  const day60ago = new Date(now.getTime() - 60 * 86400000).toISOString()

  const { data: inactiveManagers } = await db
    .from('profiles')
    .select('id, username, telegram_chat_id, manager_since')
    .eq('is_manager', true)
    .not('manager_since', 'is', null)
    .lte('manager_since', day45ago)

  // Batch clientCount query to avoid N+1 per manager
  const mgrUsernames = (inactiveManagers ?? []).map(
    (m: { username: string }) => m.username
  )
  const clientCountMap = new Map<string, number>()
  if (mgrUsernames.length > 0) {
    const { data: referredRows } = await db
      .from('profiles')
      .select('referred_by')
      .in('referred_by', mgrUsernames)
    for (const row of (referredRows ?? []) as { referred_by: string }[]) {
      clientCountMap.set(row.referred_by, (clientCountMap.get(row.referred_by) ?? 0) + 1)
    }
  }

  let deactivated = 0
  const deactivatedNames: string[] = []
  for (const mgr of (inactiveManagers ?? []) as {
    id: string; username: string; telegram_chat_id: string | null; manager_since: string
  }[]) {
    if ((clientCountMap.get(mgr.username) ?? 0) > 0) continue

    if (mgr.manager_since <= day60ago) {
      // Deactivate — 60+ days with 0 clients; clear manager_since to avoid re-triggering
      await db.from('profiles').update({ is_manager: false, manager_since: null }).eq('id', mgr.id)
      deactivated++
      deactivatedNames.push(`@${mgr.username}`)
      if (mgr.telegram_chat_id) {
        await notifyUser(
          mgr.telegram_chat_id,
          `⚠️ <b>Статус менеджера деактивирован</b>\n\n` +
          `За 60 дней не появилось ни одного клиента.\n\n` +
          `Хотите продолжить — активируйтесь снова: ${SITE_URL}/partners`
        )
      }
    } else if (mgr.manager_since > day47ago) {
      // Warning — only fire for managers in the 45-47 day window (at most ~3 warnings total)
      if (mgr.telegram_chat_id) {
        const daysActive = Math.floor((now.getTime() - new Date(mgr.manager_since).getTime()) / 86400000)
        const daysLeft = Math.max(1, 60 - daysActive)
        await notifyUser(
          mgr.telegram_chat_id,
          `⏳ <b>Напоминание для менеджера tapni.kz</b>\n\n` +
          `Вы активированы, но клиентов ещё нет.\n` +
          `Через ${daysLeft} дней статус будет снят автоматически.\n\n` +
          `Поделитесь ссылкой:\n<code>${SITE_URL}/auth?ref=${mgr.username}</code>`,
          [[{ text: '📊 Открыть кабинет', url: `${SITE_URL}/manager` }]]
        )
      }
    }
  }

  if (deactivated > 0) {
    await sendTelegram(
      adminChatId(),
      `🔴 Деактивировано менеджеров (неактивность): <b>${deactivated}</b>\n${deactivatedNames.join(', ')}`
    )
  }

  // ── 6. Auto-confirm pending payments after N hours ────────────────────
  // Default 72h — admin must confirm within 3 days or explicitly cancel
  const pendingHours = parseInt(process.env.PENDING_AUTO_CONFIRM_HOURS ?? '72')
  const pendingCutoff = new Date(now.getTime() - pendingHours * 3600_000).toISOString()

  // Only auto-confirm if receipt was uploaded AND validated by AI (prevents fake receipts)
  const { data: pendingPayments } = await db
    .from('payments')
    .select('id, username, plan')
    .eq('status', 'pending')
    .lt('created_at', pendingCutoff)
    .not('receipt_url', 'is', null)
    .eq('auto_validated', true)

  let autoConfirmed = 0
  for (const pmt of (pendingPayments ?? []) as { id: string; username: string; plan: string }[]) {
    const plan = pmt.plan === 'annual' ? 'annual' : 'monthly'
    const result = await activatePremium({
      username: pmt.username,
      plan,
      pendingPaymentId: pmt.id,
      provider: 'auto_confirmed',
      note: `Авто-подтверждение через ${pendingHours}ч`,
    })
    if (result.success) autoConfirmed++
  }

  // Clean up stale pending rows WITHOUT receipt that are older than (pendingHours + 24h).
  // Must run AFTER auto-confirm step. Only deletes rows with no receipt_url (rows with receipt
  // are either auto-confirmed above, or still waiting — keep them until pendingHours + buffer).
  try {
    await db
      .from('payments')
      .delete()
      .eq('status', 'pending')
      .is('receipt_url', null)
      .lt('created_at', new Date(now.getTime() - (pendingHours + 24) * 3600_000).toISOString())
  } catch { /* non-fatal */ }

  if (autoConfirmed > 0) {
    await sendTelegram(chatId, `⚡ Авто-подтверждено платежей: <b>${autoConfirmed}</b>`)
  }

  // ── 7. Weekly stats digest (Mondays only) ─────────────────────────────
  let digestCount = 0
  if (now.getUTCDay() === 1) { // Monday
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    // Get all users with Telegram linked
    const { data: tgUsers } = await db
      .from('profiles')
      .select('id, username, business_name, telegram_chat_id, view_count')
      .not('telegram_chat_id', 'is', null)
      .limit(500)

    for (const u of (tgUsers ?? []) as { id: string; username: string; business_name: string; telegram_chat_id: string; view_count: number }[]) {
      try {
        // Count clicks in last 7 days via click_events
        const { count: weekClicks } = await db
          .from('click_events')
          .select('*', { count: 'exact', head: true })
          .in('link_id', db.from('links').select('id').eq('profile_id', u.id))
          .gte('created_at', weekAgo)

        // Count leads in last 7 days
        const { count: weekLeads } = await db
          .from('lead_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', u.id)
          .gte('created_at', weekAgo)

        const clicks = weekClicks ?? 0
        const leads = weekLeads ?? 0

        // Only send if there's something to report
        if (clicks === 0 && leads === 0) continue

        const viewsStr = u.view_count > 0 ? `\n👁 Просмотров всего: <b>${u.view_count}</b>` : ''
        const leadsStr = leads > 0 ? `\n📋 Новых заявок: <b>${leads}</b>` : ''
        const clicksStr = clicks > 0 ? `\n👆 Кликов за неделю: <b>${clicks}</b>` : ''

        await notifyUser(
          u.telegram_chat_id,
          `📊 <b>Ваша статистика за неделю</b>\n` +
          `tapni.kz/${u.username}${viewsStr}${clicksStr}${leadsStr}\n\n` +
          `${leads > 0 ? '🎉 Клиенты оставляют заявки! Отвечайте быстро — это увеличивает конверсию.' : '💡 Поделитесь ссылкой в Instagram Bio или WhatsApp-статусе.'}`,
          [[
            { text: '📊 Полная аналитика', url: `${SITE_URL}/dashboard` },
            ...(leads > 0 ? [{ text: '📋 Заявки', url: `${SITE_URL}/dashboard` }] : []),
          ]]
        )
        digestCount++
        // Small delay to avoid Telegram rate limits
        await new Promise((r) => setTimeout(r, 100))
      } catch { /* skip user on error */ }
    }

    if (digestCount > 0) {
      await sendTelegram(chatId, `📨 Еженедельный дайджест отправлен: <b>${digestCount}</b> пользователей`)
    }
  }

  return Response.json({
    ok: true,
    expired: expired?.length ?? 0,
    expiring7: expiring7?.length ?? 0,
    expiring3: expiring3?.length ?? 0,
    onboarding: onboardingCount,
    managersDeactivated: deactivated,
    autoConfirmed,
    weeklyDigest: digestCount,
  })
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    if (chatId) {
      await sendTelegram(chatId,
        `🚨 <b>CRON ОШИБКА — check-subscriptions</b>\n\n` +
        `<code>${msg.slice(0, 500)}</code>\n\n` +
        `Подписки и уведомления могут не обрабатываться!`
      ).catch(() => {})
    }
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
