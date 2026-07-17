import { getSupabaseAdmin } from './supabase-admin'

const SITE_URL = 'https://tapni.kz'

export interface ActivateParams {
  username: string
  plan: 'monthly' | 'annual'
  pendingPaymentId: string  // ID of pending payments row to update to 'confirmed'
  provider: string          // 'auto_confirmed' | 'receipt_confirmed' | etc.
  note?: string
}

export interface ActivateResult {
  success: boolean
  error?: string
}

/**
 * Activates premium for a user by updating profiles + confirming a pending payments row.
 * Notifies user and admin via Telegram.
 * Used by: cron auto-confirm, receipt photo confirmation.
 * For manual admin activation use adminActivateHandler in telegram-bot.
 */
export async function activatePremium({
  username,
  plan,
  pendingPaymentId,
  provider,
  note,
}: ActivateParams): Promise<ActivateResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const days = plan === 'annual' ? 365 : 30

  // Idempotency: skip if this payment was already confirmed
  const { data: existingPay } = await adminDb
    .from('payments')
    .select('status')
    .eq('id', pendingPaymentId)
    .maybeSingle()
  if (existingPay?.status === 'confirmed') return { success: true }

  // Read current profile to extend subscription from existing expiry (not from now)
  const { data: currentProfile, error: fetchErr } = await adminDb
    .from('profiles')
    .select('subscription_expires_at, telegram_chat_id')
    .eq('username', username)
    .maybeSingle()
  if (fetchErr || !currentProfile) {
    return { success: false, error: fetchErr?.message ?? 'Profile not found' }
  }

  const base = currentProfile.subscription_expires_at
    ? new Date(Math.max(new Date(currentProfile.subscription_expires_at).getTime(), Date.now()))
    : new Date()
  const expires = new Date(base.getTime() + days * 86400000).toISOString()
  const expiryDate = new Date(expires).toLocaleDateString('ru-KZ')

  // 1. Confirm the pending payments row FIRST (atomicity: if profile update fails, payment stays pending)
  const { error: payErr } = await adminDb.from('payments').update({
    status: 'confirmed',
    auto_confirmed_at: new Date().toISOString(),
    provider,
    ...(note ? { notes: note } : {}),
  }).eq('id', pendingPaymentId)

  if (payErr) {
    return { success: false, error: payErr.message }
  }

  // 2. Update profiles
  const { data: profData, error: profErr } = await adminDb
    .from('profiles')
    .update({
      is_premium: true,
      subscription_expires_at: expires,
      subscription_plan: plan,
      updated_at: new Date().toISOString(),
    })
    .eq('username', username)
    .select('business_name, telegram_chat_id')
    .maybeSingle()

  if (profErr || !profData) {
    // Roll back payment to pending so the cron can retry
    await adminDb.from('payments').update({
      status: 'pending',
      auto_confirmed_at: null,
      provider: null,
    }).eq('id', pendingPaymentId).catch(() => {})
    return { success: false, error: profErr?.message ?? 'Profile not found' }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { success: true }

  const tgFetch = (body: object) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, parse_mode: 'HTML' }),
    }).catch(() => {})

  // 3. Notify user
  const userChatId = profData.telegram_chat_id
  if (userChatId) {
    const planLabel = plan === 'annual' ? '⭐ Годовая подписка' : '📅 Месячная подписка'
    await tgFetch({
      chat_id: userChatId,
      text:
        `🎉 <b>Premium активирован!</b>\n\n` +
        `${planLabel}\n` +
        `📅 Действует до: <b>${expiryDate}</b>\n\n` +
        `✅ Безлимит кнопок\n✅ Свой логотип\n✅ QR-код\n✅ Смена адреса`,
      reply_markup: {
        inline_keyboard: [[{ text: '🔑 Открыть кабинет', url: `${SITE_URL}/dashboard` }]],
      },
    })
  }

  // 4. Notify admin
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (adminChatId) {
    const planLabel = plan === 'annual' ? '⭐ Годовая' : '📅 Месячная'
    const srcLabel = provider === 'auto_confirmed' ? '⏱ Авто' : '📸 Чек'
    await tgFetch({
      chat_id: adminChatId,
      text:
        `✅ <b>${srcLabel}: @${username}</b>\n` +
        `${planLabel} · до ${expiryDate}`,
    })
  }

  // 5. Record sales manager commission if client was referred by a manager
  const { data: clientRow } = await adminDb
    .from('profiles')
    .select('referred_by, is_promo')
    .eq('username', username)
    .maybeSingle()

  if (clientRow?.referred_by) {
    const { data: mgr } = await adminDb
      .from('profiles')
      .select('is_manager, telegram_chat_id')
      .eq('username', clientRow.referred_by)
      .eq('is_manager', true)
      .maybeSingle()

    // Guard: skip self-commission (manager paying for their own alt account)
    // Guard: skip if no payment_id (NULL would bypass UNIQUE constraint allowing duplicates)
    // Guard: skip if client is promo (no real revenue generated)
    if (mgr && clientRow.referred_by !== username && pendingPaymentId && !clientRow.is_promo) {
      // Guard: idempotency — prevent duplicate commission for the same payment
      const { data: existingComm } = await adminDb
        .from('sales_commissions')
        .select('id')
        .eq('payment_id', pendingPaymentId)
        .maybeSingle()

      // Guard: only FIRST payment earns commission — skip if manager already earned from this client
      // Exclude cancelled commissions so a refund doesn't permanently block a legitimate future commission
      const { data: prevComm } = await adminDb
        .from('sales_commissions')
        .select('id')
        .eq('manager_username', clientRow.referred_by)
        .eq('client_username', username)
        .neq('status', 'cancelled')
        .limit(1)
        .maybeSingle()

      if (!existingComm && !prevComm) {
        const { data: payRow } = await adminDb
          .from('payments')
          .select('amount')
          .eq('id', pendingPaymentId)
          .maybeSingle()
        const saleAmount = payRow?.amount ?? (plan === 'annual' ? 10000 : 1000)
        const commAmt = Math.round(saleAmount * 0.20)

        await adminDb.from('sales_commissions').insert({
          manager_username: clientRow.referred_by,
          client_username: username,
          payment_id: pendingPaymentId,
          plan,
          sale_amount: saleAmount,
          commission_amount: commAmt,
        })

        if (mgr.telegram_chat_id) {
          await tgFetch({
            chat_id: mgr.telegram_chat_id,
            text:
              `💰 <b>Новая комиссия!</b>\n\n` +
              `Клиент <b>@${username}</b> оплатил ${plan === 'annual' ? 'годовой' : 'месячный'} Premium.\n` +
              `Ваша комиссия: <b>${commAmt} ₸</b> — ожидает выплаты.\n\n` +
              `Кабинет: ${SITE_URL}/manager`,
          })
        }
      }
    }
  }

  return { success: true }
}
