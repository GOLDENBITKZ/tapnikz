import { sendTelegram, adminChatId } from '@/lib/telegram'
import { getSupabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Escape user-controlled strings before embedding in Telegram HTML messages
function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const KASPI_PAY = 'https://pay.kaspi.kz/pay/fugemta0'
const SITE_URL = 'https://tapni.kz'
const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''
const SUPPORT_WA = 'https://wa.me/77755696531'

// ─── Telegram API helpers ─────────────────────────────────────

async function tgPost(method: string, body: object) {
  const t = TOKEN()
  if (!t) return
  const res = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error(`[tgPost ${method}]`, res.status, err.slice(0, 200))
  }
}

// Send message with inline keyboard (text must be non-empty)
async function sendInline(
  chatId: string,
  text: string,
  buttons: { text: string; url?: string; callback_data?: string }[][]
) {
  if (!text.trim()) {
    console.error('[sendInline] empty text — skipping to prevent 400 error')
    return
  }
  await tgPost('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons },
  })
}

// Send message with persistent reply keyboard (or inline if buttons provided)
async function sendMenu(chatId: string, text: string) {
  await tgPost('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: USER_KEYBOARD,
  })
}

// Send message with BOTH: inline button strip + restores persistent keyboard in next message
async function sendInlineWithMenu(
  chatId: string,
  text: string,
  buttons: { text: string; url?: string; callback_data?: string }[][]
) {
  // First restore persistent keyboard (invisible but sets it)
  await tgPost('sendMessage', {
    chat_id: chatId,
    text: '👇',
    parse_mode: 'HTML',
    reply_markup: USER_KEYBOARD,
  })
  // Then send the rich inline message
  await sendInline(chatId, text, buttons)
}

const USER_KEYBOARD = {
  keyboard: [
    [{ text: '🏠 Главная' }, { text: '⚡ Premium' }],
    [{ text: '👤 Профиль' }, { text: '📊 Статистика' }],
    [{ text: '❓ Помощь' }, { text: '🆘 Поддержка' }],
    [{ text: '🔗 Моя страница' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: 'Выберите действие...',
}

// One-time keyboard requesting phone number
const CONTACT_KEYBOARD = {
  keyboard: [[{ text: '📱 Поделиться номером', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
}

// ─── Admin panel ──────────────────────────────────────────────

const ADMIN_HELP = `<b>tapni.kz Admin Panel</b>

<b>Пользователи</b>
/stats — статистика платформы
/users — последние 10 пользователей
/find <i>username</i> — найти по username
/find <i>+77001234567</i> — найти по номеру

<b>Подписки</b>
/activate <i>username days</i> — выдать Premium немедленно
  Пример: /activate demo 30 (месяц), /activate demo 365 (год)
/pregift <i>username days [заметка]</i> — подарить блогеру до регистрации
/gifts — список ожидающих подарков
/deactivate <i>username</i> — снять Premium
/expiring — истекают в ближ. 3 дня
/expired — истёкшие за 7 дней

<b>Финансы</b>
/revenue [days] — выручка за N дней (по умолч. 30)
/payments <i>username</i> — история платежей пользователя

<b>Сообщения</b>
/message <i>username текст</i> — отправить сообщение пользователю

<b>Система</b>
/myid — показать ваш chat ID
/setup — обновить команды бота в меню Telegram`

function formatProfile(data: Record<string, unknown>): string {
  const expiry = data.subscription_expires_at
    ? new Date(data.subscription_expires_at as string).toLocaleDateString('ru-KZ') : '—'
  const plan = data.subscription_plan === 'annual' ? '⭐ Годовая' : '📅 Месячная'
  const premiumStr = data.is_premium ? `✅ ${plan} · до ${expiry}` : '❌ Нет'
  const links = typeof data._link_count === 'number' ? `\n🔗 Кнопок: ${data._link_count}` : ''
  const avatar = data.avatar_url ? '\n🖼 Логотип: ✅' : '\n🖼 Логотип: —'
  const tg = data.telegram_chat_id ? `\n💬 Telegram: ✅ привязан (ID: ${data.telegram_chat_id})` : '\n💬 Telegram: —'
  return (
    `👤 <b>${esc(data.business_name)}</b>\n` +
    `📎 ${SITE_URL}/${data.username}\n` +
    `📱 +${data.phone ?? '?'}\n` +
    (data.address ? `📍 ${esc(data.address)}\n` : '') +
    (data.bio ? `💬 ${esc(data.bio)}\n` : '') +
    `⚡ Premium: ${premiumStr}` +
    links + avatar + tg + '\n' +
    `📅 Регистрация: ${new Date(data.created_at as string).toLocaleDateString('ru-KZ')}`
  )
}

async function setupBotCommands() {
  await tgPost('setMyCommands', {
    commands: [
      { command: 'start', description: '🏠 Главное меню' },
      { command: 'pay', description: '⚡ Подключить Premium' },
      { command: 'help', description: '❓ Частые вопросы' },
      { command: 'support', description: '🆘 Техподдержка' },
      { command: 'mypage', description: '🔗 Моя страница' },
    ],
    scope: { type: 'all_private_chats' },
  })
  await tgPost('setChatMenuButton', {
    menu_button: { type: 'commands' },
  })
}

// ─── Main webhook handler ─────────────────────────────────────

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const incoming = request.headers.get('x-telegram-bot-api-secret-token')
  // Always verify the webhook secret — reject if not configured or header mismatch.
  // To enable: set TELEGRAM_WEBHOOK_SECRET env var and re-register the webhook:
  //   setWebhook url=... secret_token=TELEGRAM_WEBHOOK_SECRET
  if (!secret || incoming !== secret) return new Response('Forbidden', { status: 403 })

  const update = await request.json()

  // ── Callback query ────────────────────────────────────────────
  if (update?.callback_query) {
    const cq = update.callback_query
    const chatId = String(cq.message?.chat?.id ?? '')
    const data: string = cq.data ?? ''

    await tgPost('answerCallbackQuery', { callback_query_id: cq.id })

    if (data === 'pay') {
      await payHandler(chatId)
    } else if (data === 'pay_monthly') {
      await payMonthlyHandler(chatId)
    } else if (data === 'pay_annual') {
      await payAnnualHandler(chatId)
    } else if (data === 'help_faq') {
      await helpHandler(chatId)
    } else if (data === 'link_phone') {
      await sendPhoneRequest(chatId)
    } else if (data.startsWith('quick_activate:') && chatId === adminChatId()) {
      const [, uname, daysStr] = data.split(':')
      await adminActivateHandler(chatId, uname, parseInt(daysStr ?? '30', 10))
    } else if (data.startsWith('cancel_premium:') && chatId === adminChatId()) {
      const uname = data.split(':')[1]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminDb = getSupabaseAdmin() as any
      const { data: profData, error } = await adminDb
        .from('profiles')
        .update({ is_premium: false, subscription_expires_at: null, updated_at: new Date().toISOString() })
        .eq('username', uname)
        .select('business_name, telegram_chat_id')
        .maybeSingle()
      if (error || !profData) {
        await sendTelegram(chatId, `❌ Не найден: ${uname}`)
      } else {
        await sendTelegram(chatId, `✅ Premium отменён для <b>${esc(profData.business_name)}</b> (@${uname})`)
        if (profData.telegram_chat_id) {
          await tgPost('sendMessage', {
            chat_id: profData.telegram_chat_id,
            text:
              `ℹ️ <b>Подтверждение платежа не получено.</b>\n\n` +
              `Доступ к Premium приостановлен.\n\n` +
              `Если вы оплатили, напишите нам — разберёмся:`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '💬 Написать в WhatsApp', url: 'https://wa.me/77755696531' }]] },
          })
        }
      }
    } else if (data.startsWith('admin_find:') && chatId === adminChatId()) {
      const uname = data.split(':')[1]
      // FIX #6: admin_find must use service role to bypass RLS
      const db = getSupabaseAdmin() as unknown as ReturnType<typeof getSupabase>
      const { data: prof } = await db.from('profiles').select('*').eq('username', uname).maybeSingle()
      if (!prof) {
        await sendTelegram(chatId, `❌ Пользователь <b>${uname}</b> не найден`)
      } else {
        const { count: lc } = await db.from('links').select('*', { count: 'exact', head: true }).eq('profile_id', prof.id)
        await sendTelegram(chatId, formatProfile({ ...prof, _link_count: lc ?? 0 }))
      }
    }

    return Response.json({ ok: true })
  }

  // ── Regular message ───────────────────────────────────────────
  const msg = update?.message
  if (!msg?.text && !msg?.contact) return Response.json({ ok: true })

  const chatId = String(msg.chat?.id ?? '')
  const isAdmin = chatId === adminChatId()

  // ── Contact sharing (phone linking) ──────────────────────────
  if (msg.contact && !isAdmin) {
    await handleContactShare(chatId, msg.contact)
    return Response.json({ ok: true })
  }

  if (!msg?.text) return Response.json({ ok: true })

  const text: string = msg.text.trim()
  const parts = text.split(/\s+/)
  // Strip @botname suffix that Telegram appends in group commands
  const cmd = parts[0].toLowerCase().replace(/@\S+$/, '')

  // Universal /myid command — helps anyone verify their chat ID
  if (cmd === '/myid') {
    const adminId = adminChatId()
    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `🆔 <b>Ваш Telegram Chat ID</b>\n\n` +
        `<code>${chatId}</code>\n\n` +
        (isAdmin
          ? `✅ Вы распознаны как администратор`
          : adminId
            ? `ℹ️ Это не админский ID (для справки)`
            : `⚠️ TELEGRAM_ADMIN_CHAT_ID не настроен в переменных окружения`),
      parse_mode: 'HTML',
    })
    return Response.json({ ok: true })
  }

  // ── Admin commands ────────────────────────────────────────────
  if (isAdmin) {
    const reply = (t: string) => sendTelegram(chatId, t)

    try {
      if (cmd === '/start' || cmd === '/help') {
        await reply(ADMIN_HELP)

      } else if (cmd === '/setup') {
        await setupBotCommands()
        await reply('✅ Команды бота обновлены в меню Telegram.')

      } else if (cmd === '/stats') {
        const db = getSupabase()
        const [total, premium, annual, today, week, withLogo, withTg] = await Promise.all([
          db.from('profiles').select('*', { count: 'exact', head: true }),
          db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
          db.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'annual'),
          db.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
          db.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
          db.from('profiles').select('*', { count: 'exact', head: true }).not('avatar_url', 'is', null),
          db.from('profiles').select('*', { count: 'exact', head: true }).not('telegram_chat_id', 'is', null),
        ])
        await reply(
          `📊 <b>Статистика tapni.kz</b>\n\n` +
          `👥 Пользователей: ${total.count ?? 0}\n` +
          `⚡ Premium: ${premium.count ?? 0}\n` +
          `  ├ ⭐ Годовых: ${annual.count ?? 0}\n` +
          `  └ 📅 Месячных: ${(premium.count ?? 0) - (annual.count ?? 0)}\n` +
          `🖼 С логотипом: ${withLogo.count ?? 0}\n` +
          `💬 Telegram привязан: ${withTg.count ?? 0}\n` +
          `🆕 За 24 ч: ${today.count ?? 0}\n` +
          `📈 За 7 дней: ${week.count ?? 0}`
        )

      } else if (cmd === '/users') {
        const { data } = await getSupabase()
          .from('profiles')
          .select('username, business_name, phone, is_premium, subscription_plan, created_at')
          .order('created_at', { ascending: false })
          .limit(10)

        if (!data?.length) { await reply('Нет пользователей'); return Response.json({ ok: true }) }
        const lines = data.map((p) => {
          const date = new Date(p.created_at).toLocaleDateString('ru-KZ', { day: '2-digit', month: '2-digit' })
          const badge = p.is_premium ? (p.subscription_plan === 'annual' ? '⭐' : '⚡') : '·'
          return `${badge} <b>${p.username}</b> (${p.business_name}) +${p.phone ?? '?'} [${date}]`
        })
        await reply(`👥 <b>Последние 10:</b>\n\n${lines.join('\n')}`)

      } else if (cmd === '/find') {
        const query = parts[1] ?? ''
        if (!query) { await reply('Использование: /find username или /find +77001234567'); return Response.json({ ok: true }) }
        const phone = query.replace(/^\+/, '')
        const isPhone = /^\d{10,11}$/.test(phone)
        const db = getSupabase()
        const { data } = isPhone
          ? await db.from('profiles').select('*').eq('phone', phone).maybeSingle()
          : await db.from('profiles').select('*').eq('username', query.toLowerCase()).maybeSingle()

        if (!data) { await reply(`❌ Не найден: ${query}`); return Response.json({ ok: true }) }
        const { count: linkCount } = await db
          .from('links').select('*', { count: 'exact', head: true }).eq('profile_id', data.id)
        await reply(formatProfile({ ...data, _link_count: linkCount ?? 0 }))

      } else if (cmd === '/activate') {
        const username = parts[1]?.toLowerCase()
        const days = parseInt(parts[2] ?? '30', 10)
        if (!username || isNaN(days) || days <= 0) {
          await reply('Использование: /activate username days\nПример: /activate demo 30')
          return Response.json({ ok: true })
        }
        await adminActivateHandler(chatId, username, days)

      } else if (cmd === '/deactivate') {
        const username = parts[1]?.toLowerCase()
        if (!username) { await reply('Использование: /deactivate username'); return Response.json({ ok: true }) }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminDb2 = getSupabaseAdmin() as any
        const { data, error } = await adminDb2
          .from('profiles')
          .update({ is_premium: false, subscription_expires_at: null, subscription_plan: 'monthly', updated_at: new Date().toISOString() })
          .eq('username', username)
          .select('business_name, telegram_chat_id')
          .maybeSingle()

        if (error) {
          await reply(`❌ <b>Ошибка</b>: <code>${error.message ?? error.code}</code>`)
        } else if (!data) {
          await reply(`❌ Пользователь <b>${username}</b> не найден`)
        } else {
          await reply(`✅ Premium снят для <b>${data.business_name}</b> (@${username})`)
          if (data.telegram_chat_id) {
            await tgPost('sendMessage', {
              chat_id: data.telegram_chat_id,
              text: `ℹ️ Ваш Premium-тариф истёк или был снят. Для продления — оплатите через личный кабинет.`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '💳 Продлить Premium', url: `${SITE_URL}/dashboard` }]] },
            })
          }
        }

      } else if (cmd === '/pregift') {
        const uname = parts[1]?.toLowerCase()
        const days = parseInt(parts[2] ?? '365', 10)
        const note = parts.slice(3).join(' ') || null
        if (!uname || isNaN(days) || days <= 0) {
          await reply('Использование: /pregift username days [заметка]\nПример: /pregift blogger 365 Instagram-блогер')
          return Response.json({ ok: true })
        }
        // Check if user already exists — activate immediately
        const db = getSupabase()
        const { data: existing } = await db.from('profiles').select('id, business_name, telegram_chat_id').eq('username', uname).maybeSingle()
        if (existing) {
          await adminActivateHandler(chatId, uname, days)
          return Response.json({ ok: true })
        }
        // Store pre-gift for when they register
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminDb = getSupabaseAdmin() as any
        const { error: giftErr } = await adminDb.from('gift_codes').upsert({ username: uname, days, note }, { onConflict: 'username' })
        if (giftErr) {
          if (giftErr.code === '42P01') {
            await reply(
              `⚠️ <b>Таблица gift_codes не создана</b>\n\n` +
              `Создайте её в Supabase SQL editor:\n\n` +
              `<code>CREATE TABLE IF NOT EXISTS gift_codes (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  username text NOT NULL UNIQUE,\n  days integer NOT NULL DEFAULT 365,\n  note text,\n  created_at timestamptz DEFAULT now()\n);\nALTER TABLE gift_codes ENABLE ROW LEVEL SECURITY;</code>`
            )
          } else {
            await reply(`❌ Ошибка: <code>${giftErr.message}</code>`)
          }
          return Response.json({ ok: true })
        }
        const plan = days >= 300 ? '⭐ Годовой' : '📅 Месячный'
        await reply(
          `🎁 <b>Подарок сохранён!</b>\n\n` +
          `👤 @${uname}\n` +
          `${plan} · ${days} дней\n` +
          (note ? `📝 ${note}\n` : '') +
          `\nKак только зарегистрируется — Premium активируется автоматически.`
        )

      } else if (cmd === '/gifts') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminDb3 = getSupabaseAdmin() as any
        const { data: gifts, error: gErr } = await adminDb3.from('gift_codes').select('*').order('created_at', { ascending: false })
        if (gErr) {
          await reply(gErr.code === '42P01' ? '❌ Таблица gift_codes не создана. Выполните /pregift для инструкций.' : `❌ ${gErr.message}`)
          return Response.json({ ok: true })
        }
        if (!gifts?.length) { await reply('🎁 Ожидающих подарков нет.'); return Response.json({ ok: true }) }
        const lines = (gifts as { username: string; days: number; note: string | null; created_at: string }[]).map((g) => {
          const dt = new Date(g.created_at).toLocaleDateString('ru-KZ')
          return `🎁 <b>${g.username}</b> — ${g.days} дней${g.note ? ` (${g.note})` : ''} [${dt}]`
        })
        await reply(`🎁 <b>Ожидают регистрации (${gifts.length}):</b>\n\n${lines.join('\n')}`)

      } else if (cmd === '/message') {
        const username = parts[1]?.toLowerCase()
        const messageText = parts.slice(2).join(' ')
        if (!username || !messageText) {
          await reply('Использование: /message username текст сообщения\nПример: /message demo Привет! Ваш Premium скоро истекает.')
          return Response.json({ ok: true })
        }
        const { data: prof } = await getSupabase()
          .from('profiles')
          .select('business_name, telegram_chat_id')
          .eq('username', username)
          .maybeSingle()

        if (!prof) { await reply(`❌ Пользователь ${username} не найден`); return Response.json({ ok: true }) }
        if (!prof.telegram_chat_id) { await reply(`❌ У ${prof.business_name} не привязан Telegram`); return Response.json({ ok: true }) }

        await tgPost('sendMessage', {
          chat_id: prof.telegram_chat_id,
          // FIX #9: escape admin-typed messageText before embedding in HTML
          text: `📢 <b>Сообщение от tapni.kz</b>\n\n${esc(messageText)}`,
          parse_mode: 'HTML',
        })
        await reply(`✅ Сообщение отправлено <b>${prof.business_name}</b> (@${username})`)

      } else if (cmd === '/expiring') {
        const in3days = new Date(Date.now() + 3 * 86400000).toISOString()
        const { data } = await getSupabase()
          .from('profiles').select('username, phone, subscription_expires_at, subscription_plan')
          .eq('is_premium', true).lte('subscription_expires_at', in3days)
          .gt('subscription_expires_at', new Date().toISOString()).order('subscription_expires_at')
        if (!data?.length) { await reply('Нет истекающих в ближ. 3 дня'); return Response.json({ ok: true }) }
        const lines = (data as { username: string; phone: string | null; subscription_expires_at: string | null; subscription_plan: string | null }[])
          .map((p) => {
            const badge = p.subscription_plan === 'annual' ? '⭐' : '⚡'
            return `${badge} <b>${p.username}</b> +${p.phone ?? '?'} — до ${new Date(p.subscription_expires_at!).toLocaleDateString('ru-KZ')}`
          })
        await reply(`⚠️ <b>Истекают в ближ. 3 дня:</b>\n\n${lines.join('\n')}`)

      } else if (cmd === '/revenue') {
        const days = parseInt(parts[1] ?? '30', 10)
        const since = new Date(Date.now() - days * 86400000).toISOString()
        try {
          const { data: pmts, error: pErr } = await getSupabaseAdmin()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('payments' as any).select('plan, amount, status, created_at').gte('created_at', since)
          if (pErr?.code === '42P01') {
            await reply(`❌ Таблица payments не создана.\n\nЗапустите <code>SUPABASE_MIGRATION_V7.sql</code> в Supabase SQL Editor.`)
            return Response.json({ ok: true })
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const confirmed = ((pmts ?? []) as any[]).filter((p: any) => p.status === 'confirmed')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalRevenue = confirmed.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const monthly = confirmed.filter((p: any) => p.plan === 'monthly').length
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const annual = confirmed.filter((p: any) => p.plan === 'annual').length
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cancelled = ((pmts ?? []) as any[]).filter((p: any) => p.status === 'cancelled').length
          await reply(
            `💰 <b>Выручка за ${days} дней</b>\n\n` +
            `💵 Итого: <b>${totalRevenue.toLocaleString('ru-KZ')} ₸</b>\n` +
            `📅 Месячных: ${monthly} × 1 000 ₸\n` +
            `⭐ Годовых: ${annual} × 10 000 ₸\n` +
            `❌ Отменённых: ${cancelled}\n\n` +
            `Всего операций: ${(pmts ?? []).length}`
          )
        } catch {
          await reply('❌ Ошибка при запросе payments. Запустите SUPABASE_MIGRATION_V7.sql.')
        }

      } else if (cmd === '/payments') {
        const uname = parts[1]?.toLowerCase()
        if (!uname) { await reply('Использование: /payments username'); return Response.json({ ok: true }) }
        try {
          const { data: pmts, error: pErr } = await getSupabaseAdmin()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('payments' as any).select('*').eq('username', uname).order('created_at', { ascending: false }).limit(10)
          if (pErr?.code === '42P01') { await reply('❌ Таблица payments не создана.'); return Response.json({ ok: true }) }
          if (!pmts?.length) { await reply(`Нет записей о платежах для <b>${uname}</b>`); return Response.json({ ok: true }) }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lines = (pmts as any[]).map((p: any) => {
            const dt = new Date(p.created_at).toLocaleDateString('ru-KZ')
            const icon = p.status === 'confirmed' ? '✅' : '❌'
            const planLabel = p.plan === 'annual' ? '⭐год' : '📅мес'
            return `${icon} ${dt} · ${planLabel} · ${(p.amount ?? 0).toLocaleString('ru-KZ')} ₸`
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const total = (pmts as any[]).filter((p: any) => p.status === 'confirmed').reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
          await reply(
            `💳 <b>Платежи @${uname}</b>\n\n` +
            lines.join('\n') +
            `\n\n💵 Итого: <b>${total.toLocaleString('ru-KZ')} ₸</b>`
          )
        } catch {
          await reply('❌ Ошибка при запросе payments.')
        }

      } else if (cmd === '/expired') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        const { data } = await getSupabase()
          .from('profiles').select('username, phone, subscription_expires_at')
          .eq('is_premium', false).gte('subscription_expires_at', weekAgo)
          .lte('subscription_expires_at', new Date().toISOString())
          .order('subscription_expires_at', { ascending: false })
        if (!data?.length) { await reply('Нет истёкших за 7 дней'); return Response.json({ ok: true }) }
        const lines = (data as { username: string; phone: string | null; subscription_expires_at: string | null }[])
          .map((p) => `🔴 <b>${p.username}</b> +${p.phone ?? '?'} — истёк ${new Date(p.subscription_expires_at!).toLocaleDateString('ru-KZ')}`)
        await reply(`🔴 <b>Истёкшие (7 дней):</b>\n\n${lines.join('\n')}`)

      } else {
        await reply(`❓ Неизвестная команда: <code>${cmd}</code>\n\nПоказать справку: /help`)
      }
    } catch (err) {
      console.error('[telegram-bot admin]', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      await sendTelegram(chatId, `❌ <b>Ошибка сервера</b>\n\n<code>${errMsg.slice(0, 300)}</code>`)
    }

    return Response.json({ ok: true })
  }

  // ── User-facing handlers ──────────────────────────────────────
  try {
    const normalized =
      text === '🏠 Главная'      ? '/start'    :
      text === '⚡ Premium'       ? '/pay'      :
      text === '👤 Профиль'      ? '/profile'  :
      text === '📊 Статистика'   ? '/mystats'  :
      text === '❓ Помощь'        ? '/help'     :
      text === '🆘 Поддержка'    ? '/support'  :
      text === '🔗 Моя страница'  ? '/mypage'   :
      cmd

    if (normalized === '/start') {
      await startHandler(chatId)
    } else if (normalized === '/pay' || normalized === '/premium') {
      await payHandler(chatId)
    } else if (normalized === '/profile') {
      await profileHandler(chatId)
    } else if (normalized === '/mystats') {
      await myStatsHandler(chatId)
    } else if (normalized === '/help') {
      await helpHandler(chatId)
    } else if (normalized === '/support') {
      const message = parts.slice(1).join(' ').trim() || undefined
      await supportHandler(chatId, message)
    } else if (normalized === '/mypage') {
      await mypageHandler(chatId)
    } else if (normalized === '/leads') {
      await leadsHandler(chatId)
    } else if (normalized === '/refer') {
      await referHandler(chatId)
    } else {
      // Unknown input — restore keyboard and show help
      await tgPost('sendMessage', {
        chat_id: chatId,
        text: `👆 Используйте кнопки меню`,
        parse_mode: 'HTML',
        reply_markup: USER_KEYBOARD,
      })
    }
  } catch (err) {
    console.error('[telegram-bot user]', err)
  }

  return Response.json({ ok: true })
}

// ─── Phone contact handler ────────────────────────────────────

async function handleContactShare(chatId: string, contact: { phone_number?: string }) {
  const raw = contact.phone_number ?? ''
  let phone = raw.replace(/\D/g, '')
  // KZ numbers: if starts with 8, treat as 77...
  if (phone.startsWith('8') && phone.length === 11) phone = '7' + phone.slice(1)

  const { data: prof } = await getSupabase()
    .from('profiles')
    .select('id, username, business_name, is_premium')
    .eq('phone', phone)
    .maybeSingle()

  if (!prof) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `😔 <b>Номер +${phone} не найден</b>\n\n` +
        `Нет аккаунта на tapni.kz? Создайте бесплатно — займёт 60 секунд.\n\n` +
        `Если аккаунт есть, убедитесь что регистрировались с этим номером.`,
      parse_mode: 'HTML',
      reply_markup: USER_KEYBOARD,
    })
    await sendInline(chatId, '🚀 Создайте страницу прямо сейчас:', [
      [{ text: '🚀 Создать страницу бесплатно', url: `${SITE_URL}/auth` }],
      [{ text: '⚡ Подключить Premium', callback_data: 'pay' }],
    ])
    return
  }

  // Check for pre-gift (admin gifted premium before registration)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const giftDb = getSupabaseAdmin() as any
    const { data: gift } = await giftDb.from('gift_codes').select('days').eq('username', prof.username).maybeSingle()
    if (gift?.days) {
      const days: number = gift.days
      const expires = new Date(Date.now() + days * 86400000).toISOString()
      const plan = days >= 300 ? 'annual' : 'monthly'
      await giftDb.from('profiles').update({ is_premium: true, subscription_expires_at: expires, subscription_plan: plan, updated_at: new Date().toISOString() }).eq('id', prof.id)
      await giftDb.from('gift_codes').delete().eq('username', prof.username)
      // Update local flag for greeting message
      prof.is_premium = true
      await tgPost('sendMessage', {
        chat_id: chatId,
        text:
          `🎁 <b>Вам подарен Premium!</b>\n\n` +
          `${plan === 'annual' ? '⭐ Годовая подписка' : '📅 Месячная подписка'} — ${days} дней\n` +
          `Действует до: <b>${new Date(expires).toLocaleDateString('ru-KZ')}</b>\n\n` +
          `✅ Безлимитные кнопки\n✅ Свой логотип\n✅ QR-код для печати`,
        parse_mode: 'HTML',
      })
    }
  } catch {
    // gift_codes table may not exist yet — skip silently
  }

  // Link telegram_chat_id to profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkResult = await (getSupabaseAdmin() as any)
    .from('profiles')
    .update({ telegram_chat_id: chatId })
    .eq('id', prof.id)

  if (linkResult.error) {
    console.error('[handleContactShare] link error', linkResult.error)
  }

  await tgPost('sendMessage', {
    chat_id: chatId,
    text:
      `✅ <b>Аккаунт подтверждён!</b>\n\n` +
      `👤 <b>${prof.business_name}</b>\n` +
      `🔗 ${SITE_URL}/${prof.username}\n` +
      (prof.is_premium ? `⚡ Premium активен\n` : '') +
      `\nТеперь используйте кнопки меню 👇`,
    parse_mode: 'HTML',
    reply_markup: USER_KEYBOARD,
  })
  await sendInline(chatId, '🔗 Ваша страница на tapni.kz:', [
    [{ text: `🌐 tapni.kz/${prof.username}`, url: `${SITE_URL}/${prof.username}` }],
    [{ text: '✏️ Управлять ссылками', url: `${SITE_URL}/dashboard` }],
    ...(prof.is_premium ? [] : [[{ text: '⚡ Подключить Premium', callback_data: 'pay' }]]),
  ])
}

// ─── Helpers ──────────────────────────────────────────────────

async function sendPhoneRequest(chatId: string) {
  await tgPost('sendMessage', {
    chat_id: chatId,
    text: `📱 <b>Привяжите ваш аккаунт tapni.kz</b>\n\nПоделитесь номером телефона — найдём ваш аккаунт автоматически:`,
    parse_mode: 'HTML',
    reply_markup: CONTACT_KEYBOARD,
  })
}

// ─── User command handlers ────────────────────────────────────

async function startHandler(chatId: string) {
  // Check if already linked
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, business_name, is_premium, subscription_expires_at')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (linked) {
    const expiryStr = linked.subscription_expires_at
      ? ` · до ${new Date(linked.subscription_expires_at).toLocaleDateString('ru-KZ')}`
      : ''
    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `👋 С возвращением, <b>${linked.business_name}</b>!\n\n` +
        `🔗 ${SITE_URL}/${linked.username}\n` +
        (linked.is_premium ? `⚡ Premium активен${expiryStr}\n` : '') +
        `\nЧто хотите сделать? 👇`,
      parse_mode: 'HTML',
      reply_markup: USER_KEYBOARD,
    })
    await sendInline(chatId, '🔗 Перейти к управлению:', [
      [{ text: `🌐 Открыть мою страницу`, url: `${SITE_URL}/${linked.username}` }],
      [{ text: '✏️ Управлять ссылками', url: `${SITE_URL}/dashboard` }],
      ...(linked.is_premium ? [] : [[{ text: '⚡ Подключить Premium', callback_data: 'pay' }]]),
    ])
    return
  }

  // Not linked — welcome + ask for phone
  await tgPost('sendMessage', {
    chat_id: chatId,
    text:
      `👋 Привет! Я <b>tapni.kz</b>\n\n` +
      `Сервис мобильных визиток для бизнеса Казахстана.\n\n` +
      `Одна ссылка в Instagram bio — и клиенты сразу видят WhatsApp, Kaspi Pay, 2ГИС и другие контакты.\n\n` +
      `Если у вас уже есть аккаунт — поделитесь номером для привязки:`,
    parse_mode: 'HTML',
    reply_markup: CONTACT_KEYBOARD,
  })
  await sendInline(chatId,
    `🆓 Бесплатно — 3 кнопки\n📅 Premium — 1 000 ₸/мес\n⭐ Годовой — 10 000 ₸/год (-2 000 ₸)\n\n👇 Нет аккаунта? Создайте прямо сейчас:`,
    [
      [{ text: '🚀 Создать страницу бесплатно', url: `${SITE_URL}/auth` }],
      [{ text: '⚡ Premium — подробнее', callback_data: 'pay' }],
    ]
  )
}

async function payHandler(chatId: string) {
  // Check if user is linked to show personalized activation button
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, is_premium')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (linked?.is_premium) {
    await sendInline(chatId,
      `⚡ <b>У вас активен Premium!</b>\n\nУправляйте страницей в личном кабинете:`,
      [[{ text: '🔑 Открыть кабинет', url: `${SITE_URL}/dashboard` }]]
    )
    return
  }

  await sendInline(chatId,
    `⚡ <b>tapni.kz Premium</b>\n\n` +
    `✅ Безлимитное число кнопок\n` +
    `✅ Свой логотип на странице\n` +
    `✅ Все типы ссылок (YouTube, TikTok, Facebook…)\n` +
    `✅ Без водяного знака tapni.kz\n` +
    `✅ QR-код для печати на визитках\n` +
    `✅ Смена адреса tapni.kz/ник\n\n` +
    `Выберите тариф:`,
    [
      [{ text: '📅 1 000 ₸/месяц', callback_data: 'pay_monthly' }],
      [{ text: '⭐ 10 000 ₸/год — ВЫГОДНЕЕ (-2 000 ₸)', callback_data: 'pay_annual' }],
      [{ text: '🔑 Уже оплатил → в кабинет', url: `${SITE_URL}/dashboard` }],
    ]
  )
}

async function payMonthlyHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles').select('username').eq('telegram_chat_id', chatId).maybeSingle()

  const refCode = linked ? `TAP-${linked.username}` : 'TAP-username'
  const waText = encodeURIComponent(`Оплатил Premium ${refCode} месячная`)

  await sendInline(chatId,
    `💳 <b>Premium — 1 000 ₸/месяц</b>\n\n` +
    `Ваш код платежа: <code>${refCode}</code>\n\n` +
    `Шаги:\n` +
    `1️⃣ Оплатите через Kaspi\n` +
    `2️⃣ Отправьте код <code>${refCode}</code> в WhatsApp\n` +
    `3️⃣ Активируем за 15 минут`,
    [
      [{ text: '💳 Оплатить 1 000 ₸ через Kaspi', url: KASPI_PAY }],
      [{ text: `💬 Написать код в WhatsApp`, url: `https://wa.me/77755696531?text=${waText}` }],
      [{ text: '🔑 Уже оплатил → кабинет', url: `${SITE_URL}/dashboard` }],
    ]
  )
}

async function payAnnualHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles').select('username').eq('telegram_chat_id', chatId).maybeSingle()

  const refCode = linked ? `TAP-${linked.username}` : 'TAP-username'
  const waText = encodeURIComponent(`Оплатил Premium ${refCode} годовая`)

  await sendInline(chatId,
    `⭐ <b>Premium — 10 000 ₸/год</b>\n\n` +
    `<b>Лучшее предложение!</b> 2 месяца бесплатно.\n\n` +
    `Ваш код платежа: <code>${refCode}</code>\n\n` +
    `Шаги:\n` +
    `1️⃣ Оплатите через Kaspi\n` +
    `2️⃣ Отправьте код <code>${refCode}</code> в WhatsApp\n` +
    `3️⃣ Активируем за 15 минут`,
    [
      [{ text: '💳 Оплатить 10 000 ₸ через Kaspi', url: KASPI_PAY }],
      [{ text: `💬 Написать код в WhatsApp`, url: `https://wa.me/77755696531?text=${waText}` }],
      [{ text: '🔑 Уже оплатил → кабинет', url: `${SITE_URL}/dashboard` }],
    ]
  )
}

async function helpHandler(chatId: string) {
  await sendInline(chatId,
    `❓ <b>Частые вопросы — tapni.kz</b>\n\n` +
    `<b>Что это такое?</b>\n` +
    `Страница-визитка с кнопками: WhatsApp, Kaspi, 2ГИС, Instagram. Одна ссылка в bio — клиенты сразу видят всё.\n\n` +
    `<b>Как добавить кнопку Kaspi Pay?</b>\n` +
    `Kaspi.kz → Платежи → Мой QR-код → Поделиться → скопируйте ссылку. Вставьте в кабинете.\n\n` +
    `<b>Как добавить логотип?</b>\n` +
    `Кабинет → вкладка «Профиль» → «Загрузить логотип» (JPG/PNG, до 2 МБ).\n\n` +
    `<b>Сколько стоит?</b>\n` +
    `🆓 Бесплатно — 3 кнопки\n` +
    `📅 Premium — 1 000 ₸/мес\n` +
    `⭐ Годовой — 10 000 ₸/год (−2 000 ₸)\n\n` +
    `<b>Как оплатить?</b>\n` +
    `Кнопка «Оплатить» в личном кабинете → Kaspi. Активация за 15 минут.`,
    [
      [{ text: '🚀 Создать страницу', url: `${SITE_URL}/auth` }],
      [{ text: '⚡ Подключить Premium', callback_data: 'pay' }],
      [{ text: '🆘 Поддержка', url: SUPPORT_WA }],
    ]
  )
}

async function supportHandler(chatId: string, message?: string) {
  const adminId = adminChatId()

  if (message) {
    // Gather user info for the admin notification
    const { data: linked } = await getSupabase()
      .from('profiles')
      .select('username, business_name, phone, is_premium')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()

    const userInfo = linked
      ? `👤 <b>${esc(linked.business_name)}</b> (@${linked.username}) +${linked.phone ?? '?'}${linked.is_premium ? ' ⚡' : ''}`
      : `👤 Telegram: <code>${chatId}</code> (не привязан)`

    // Notify admin
    const sent = adminId && TOKEN()
    if (sent) {
      await sendTelegram(adminId,
        `🆘 <b>Запрос поддержки</b>\n\n${userInfo}\n\n💬 ${esc(message)}`
      )
    }

    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `✅ <b>Запрос отправлен!</b>\n\n` +
        `Ответим в ближайшее время.\n` +
        `Также можно написать напрямую:`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [
        [{ text: '💬 WhatsApp поддержка', url: SUPPORT_WA }],
      ]},
    })
    return
  }

  // No message text — show instructions
  await tgPost('sendMessage', {
    chat_id: chatId,
    text:
      `🆘 <b>Техническая поддержка tapni.kz</b>\n\n` +
      `Напишите ваш вопрос прямо сейчас:\n` +
      `<code>/support Ваш вопрос здесь</code>\n\n` +
      `Или свяжитесь с нами напрямую:`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [
      [{ text: '💬 WhatsApp поддержка', url: SUPPORT_WA }],
    ]},
  })
}

// ─── Admin activate helper (reusable by /activate and quick_activate callback) ─

async function adminActivateHandler(adminChatIdVal: string, username: string, days: number) {
  const expires = new Date(Date.now() + days * 86400000).toISOString()
  const plan = days >= 300 ? 'annual' : 'monthly'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data, error } = await adminDb
    .from('profiles')
    .update({ is_premium: true, subscription_expires_at: expires, subscription_plan: plan, updated_at: new Date().toISOString() })
    .eq('username', username)
    .select('id, business_name, phone, telegram_chat_id')
    .maybeSingle()

  if (error) {
    await sendTelegram(adminChatIdVal, `❌ <b>Ошибка</b>: <code>${error.message ?? error.code}</code>`)
  } else if (!data) {
    await sendTelegram(adminChatIdVal, `❌ Пользователь <b>${username}</b> не найден`)
  } else {
    const expiryDate = new Date(expires).toLocaleDateString('ru-KZ')
    await sendTelegram(adminChatIdVal,
      `✅ <b>Premium активирован!</b>\n\n` +
      `👤 ${data.business_name} (@${username})\n` +
      `📱 +${data.phone ?? '?'}\n` +
      `${plan === 'annual' ? '⭐ Годовая' : '📅 Месячная'} · ${days} дней · до ${expiryDate}`
    )
    if (data.telegram_chat_id) {
      await tgPost('sendMessage', {
        chat_id: data.telegram_chat_id,
        text:
          `🎉 <b>Premium активирован!</b>\n\n` +
          `${plan === 'annual' ? '⭐ Годовая подписка' : '📅 Месячная подписка'}\n` +
          `📅 Действует до: <b>${expiryDate}</b>\n\n` +
          `Теперь доступны:\n` +
          `✅ Безлимит кнопок\n✅ Свой логотип\n✅ QR-код\n✅ Смена адреса`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🔑 Открыть кабинет', url: `${SITE_URL}/dashboard` }]] },
      })
    }
    // Log to payments table (silent fail if table not yet created)
    try {
      const amount = plan === 'annual' ? 10000 : 1000
      await adminDb.from('payments').insert({
        username,
        plan,
        amount,
        days,
        method: 'manual',
        status: 'confirmed',
        admin_tg_id: adminChatIdVal,
      })
    } catch {
      // payments table may not exist yet — run SUPABASE_MIGRATION_V7.sql
    }
  }
}

// ─── User profile handler ─────────────────────────────────────

async function profileHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, business_name, bio, address, phone, is_premium, subscription_expires_at, subscription_plan, avatar_url, theme, created_at')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: `👤 <b>Ваш профиль</b>\n\nДля просмотра профиля привяжите аккаунт:`,
      parse_mode: 'HTML',
      reply_markup: CONTACT_KEYBOARD,
    })
    return
  }

  const expiryStr = linked.subscription_expires_at
    ? new Date(linked.subscription_expires_at).toLocaleDateString('ru-KZ') : '—'
  const plan = linked.subscription_plan === 'annual' ? '⭐ Годовая' : '📅 Месячная'
  const premiumStr = linked.is_premium ? `✅ ${plan} · до ${expiryStr}` : '❌ Нет'
  const themes: Record<string, string> = { dark: 'Тёмная', light: 'Светлая', gradient: 'Градиент', blogger: 'Блогер 💄', business: 'Бизнес 💼', seller: 'Селлер 🛒' }
  const themeLabel = themes[linked.theme ?? 'dark'] ?? linked.theme

  await sendInline(chatId,
    `👤 <b>${linked.business_name}</b>\n\n` +
    `🔗 ${SITE_URL}/${linked.username}\n` +
    (linked.bio ? `💬 ${linked.bio}\n` : '') +
    (linked.address ? `📍 ${linked.address}\n` : '') +
    (linked.phone ? `📱 +${linked.phone}\n` : '') +
    `🎨 Тема: ${themeLabel}\n` +
    `🖼 Логотип: ${linked.avatar_url ? '✅' : '—'}\n` +
    `⚡ Premium: ${premiumStr}\n` +
    `📅 С нами с: ${new Date(linked.created_at).toLocaleDateString('ru-KZ')}`,
    [
      [{ text: `🌐 Открыть мою страницу`, url: `${SITE_URL}/${linked.username}` }],
      [{ text: '✏️ Редактировать профиль', url: `${SITE_URL}/dashboard` }],
      ...(!linked.is_premium ? [[{ text: '⚡ Подключить Premium', callback_data: 'pay' }]] : []),
    ]
  )
}

// ─── User stats handler ───────────────────────────────────────

async function myStatsHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, business_name, id, view_count')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: `📊 <b>Статистика</b>\n\nПривяжите аккаунт для просмотра статистики:`,
      parse_mode: 'HTML',
      reply_markup: CONTACT_KEYBOARD,
    })
    return
  }

  const [{ data: links }, { data: recentClicks }] = await Promise.all([
    getSupabase()
      .from('links')
      .select('id, title, url, icon_type, click_count')
      .eq('profile_id', linked.id)
      .order('click_count', { ascending: false }),
    getSupabase()
      .from('click_events')
      .select('link_id')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ])

  if (!links?.length) {
    await sendInline(chatId,
      `📊 <b>Статистика</b> · tapni.kz/${linked.username}\n\nУ вас пока нет ссылок. Добавьте первую:`,
      [[{ text: '➕ Добавить ссылку', url: `${SITE_URL}/dashboard` }]]
    )
    return
  }

  const totalClicks = links.reduce((s, l) => s + (l.click_count ?? 0), 0)
  const viewCount = (linked as { view_count?: number }).view_count ?? 0

  // Compute top link by 7-day clicks
  const recent7 = recentClicks ?? []
  const clicksByLink: Record<string, number> = {}
  for (const row of recent7) {
    clicksByLink[row.link_id] = (clicksByLink[row.link_id] ?? 0) + 1
  }
  const topLink7 = links
    .map((l) => ({ ...l, recent: clicksByLink[l.id] ?? 0 }))
    .sort((a, b) => b.recent - a.recent)[0]

  const lines = links.slice(0, 8).map((l) => {
    const clicks = l.click_count ?? 0
    const bar = '█'.repeat(Math.min(Math.round(clicks / Math.max(totalClicks, 1) * 10), 10))
    return `${bar || '░'} <b>${esc(l.title || l.icon_type)}</b> — ${clicks} кл.`
  })

  const topLine = topLink7?.recent > 0
    ? `\n🔥 Топ за 7 дней: <b>${esc(topLink7.title || topLink7.icon_type)}</b> (${topLink7.recent} кл.)`
    : ''

  await sendInline(chatId,
    `📊 <b>Статистика</b> · tapni.kz/${linked.username}\n\n` +
    `👁 Просмотров страницы: <b>${viewCount}</b>\n` +
    `👆 Всего кликов: <b>${totalClicks}</b>${topLine}\n\n` +
    lines.join('\n'),
    [
      [{ text: `🌐 Открыть мою страницу`, url: `${SITE_URL}/${linked.username}` }],
      [{ text: '✏️ Управлять ссылками', url: `${SITE_URL}/dashboard` }],
    ]
  )
}

async function leadsHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, id, is_premium')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked) {
    await sendMenu(chatId, `📋 <b>Заявки</b>\n\nПривяжите аккаунт чтобы видеть заявки.`)
    return
  }

  const { data: leds } = await getSupabase()
    .from('lead_submissions')
    .select('name, phone, message, created_at')
    .eq('profile_id', linked.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!leds?.length) {
    await sendInline(chatId,
      `📋 <b>Заявки</b> · tapni.kz/${linked.username}\n\nЗаявок пока нет. Добавьте кнопку «Записаться» на свою страницу:`,
      [[{ text: '✏️ Перейти в кабинет', url: `${SITE_URL}/dashboard` }]]
    )
    return
  }

  const lines = leds.map((l) => {
    const dt = new Date(l.created_at).toLocaleDateString('ru-KZ', { day: 'numeric', month: 'short' })
    const msg = l.message ? `\n   💬 ${esc(l.message.slice(0, 60))}` : ''
    return `👤 <b>${esc(l.name)}</b> · <code>${esc(l.phone)}</code> · ${dt}${msg}`
  })

  await sendInline(chatId,
    `📋 <b>Последние заявки</b> · tapni.kz/${linked.username}\n\n${lines.join('\n\n')}`,
    [[{ text: '📋 Все заявки', url: `${SITE_URL}/dashboard` }]]
  )
}

async function referHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked) {
    await sendMenu(chatId, `👥 <b>Реферальная программа</b>\n\nПривяжите аккаунт чтобы получить вашу реферальную ссылку.`)
    return
  }

  const { count } = await getSupabase()
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', linked.username)

  const referUrl = `${SITE_URL}/auth?ref=${linked.username}`
  await sendInline(chatId,
    `👥 <b>Реферальная программа</b>\n\n` +
    `Пригласите друга — оба получите <b>+7 дней Premium</b> бесплатно!\n\n` +
    `🔗 Ваша ссылка:\n<code>${referUrl}</code>\n\n` +
    `👤 Приглашено: <b>${count ?? 0}</b> чел.`,
    [
      [{ text: '📎 Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(referUrl)}&text=${encodeURIComponent('Создай свою мини-страницу на tapni.kz бесплатно!')}` }],
    ]
  )
}

async function mypageHandler(chatId: string) {
  const { data: linked } = await getSupabase()
    .from('profiles')
    .select('username, business_name, is_premium, subscription_expires_at')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (linked) {
    const expiryStr = linked.subscription_expires_at
      ? ` · до ${new Date(linked.subscription_expires_at).toLocaleDateString('ru-KZ')}`
      : ''
    await sendInline(chatId,
      `🔗 <b>${linked.business_name}</b>\n\n` +
      `📎 ${SITE_URL}/${linked.username}\n` +
      (linked.is_premium ? `⚡ Premium${expiryStr}` : `🆓 Бесплатный тариф · 3 кнопки`),
      [
        [{ text: `🌐 tapni.kz/${linked.username}`, url: `${SITE_URL}/${linked.username}` }],
        [{ text: '✏️ Управлять ссылками', url: `${SITE_URL}/dashboard` }],
        ...(linked.is_premium ? [] : [[{ text: '⚡ Подключить Premium', callback_data: 'pay' }]]),
      ]
    )
    return
  }

  // Not linked
  await tgPost('sendMessage', {
    chat_id: chatId,
    text:
      `🔗 <b>Ваша страница на tapni.kz</b>\n\n` +
      `Для доступа поделитесь номером телефона — найдём ваш аккаунт автоматически:`,
    parse_mode: 'HTML',
    reply_markup: CONTACT_KEYBOARD,
  })
  await sendInline(chatId, `Ещё нет аккаунта?`, [
    [{ text: '🚀 Создать страницу бесплатно', url: `${SITE_URL}/auth` }],
    [{ text: '🔑 Войти в кабинет', url: `${SITE_URL}/dashboard` }],
  ])
}
