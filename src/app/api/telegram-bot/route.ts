import { sendTelegram, adminChatId } from '@/lib/telegram'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { activatePremium } from '@/lib/activate-premium'
import Groq from 'groq-sdk'

// In-memory map for receipt flow: chatId → pending payment info
// Cleared after photo received or after 10 minutes
const receiptPending = new Map<string, { username: string; plan: 'monthly' | 'annual'; days: number; paymentId: string | null; ts: number }>()

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

// Send message with persistent reply keyboard
async function sendMenu(chatId: string, text: string, isManager = false) {
  await tgPost('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: isManager ? MANAGER_KEYBOARD : USER_KEYBOARD,
  })
}

// Send message with inline buttons (keyboard already persists from prior messages)
async function sendInlineWithMenu(
  chatId: string,
  text: string,
  buttons: { text: string; url?: string; callback_data?: string }[][]
) {
  await sendInline(chatId, text, buttons)
}

const USER_KEYBOARD = {
  keyboard: [
    [{ text: '🏠 Главная' }, { text: '⚡ Premium' }],
    [{ text: '👤 Профиль' }, { text: '📊 Статистика' }],
    [{ text: '📋 Заявки' }, { text: '👥 Реферал' }],
    [{ text: '❓ Помощь' }, { text: '🆘 Поддержка' }],
    [{ text: '🔗 Моя страница' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: 'Выберите действие...',
}

// Extended keyboard for managers — adds commission/client buttons
const MANAGER_KEYBOARD = {
  keyboard: [
    [{ text: '🏠 Главная' }, { text: '⚡ Premium' }],
    [{ text: '👤 Профиль' }, { text: '📊 Статистика' }],
    [{ text: '📋 Заявки' }, { text: '👥 Реферал' }],
    [{ text: '💰 Комиссии' }, { text: '👤 Мои клиенты' }],
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

<b>Менеджеры</b>
/manager add <i>username</i> — назначить менеджером
/manager remove <i>username</i> — снять статус менеджера
/managers — список всех менеджеров
/commissions — все ожидающие комиссии
/paid <i>username</i> — отметить комиссии менеджера как выплаченные

<b>Промо</b>
/promo add <i>username</i> — отметить как промо (комиссии не начисляются)
/promo remove <i>username</i> — снять промо-статус
/promo list — список всех промо-пользователей

<b>Финансы</b>
/revenue [days] — выручка за N дней (по умолч. 30)
/payments <i>username</i> — история платежей пользователя

<b>Сообщения</b>
/message <i>username текст</i> — отправить сообщение пользователю
/setphone <i>username +7XXXXXXXXXX</i> — изменить номер телефона
/reset <i>username</i> — сбросить пароль (или /reset +77001234567)
/delete <i>username</i> — удалить аккаунт (двухшаговое подтверждение)

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
  const tg = data.telegram_chat_id ? `\n💬 Telegram: ✅ (ID: ${data.telegram_chat_id})` : '\n💬 Telegram: —'
  const typeBadge = data.is_manager ? '\n👔 Менеджер: ✅' :
    data.is_promo ? '\n🎁 Тип: Промо (без комиссий)' :
    data.referred_by ? `\n🔗 Реферал от: @${data.referred_by}` :
    data.is_premium ? '\n💳 Тип: Платный клиент' : ''
  return (
    `👤 <b>${esc(data.business_name)}</b>\n` +
    `📎 ${SITE_URL}/${data.username}\n` +
    `📱 +${esc(String(data.phone ?? '?'))}\n` +
    (data.address ? `📍 ${esc(data.address)}\n` : '') +
    (data.bio ? `💬 ${esc(data.bio)}\n` : '') +
    `⚡ Premium: ${premiumStr}` +
    typeBadge + links + avatar + tg + '\n' +
    `📅 Регистрация: ${new Date(data.created_at as string).toLocaleDateString('ru-KZ')}`
  )
}

async function setupBotCommands() {
  await tgPost('setMyCommands', {
    commands: [
      { command: 'start', description: '🏠 Главное меню' },
      { command: 'mystats', description: '📊 Статистика переходов' },
      { command: 'leads', description: '📋 Заявки от клиентов' },
      { command: 'ref', description: '👥 Реферальная ссылка' },
      { command: 'pay', description: '⚡ Подключить Premium' },
      { command: 'help', description: '❓ Частые вопросы' },
      { command: 'support', description: '🆘 Техподдержка' },
      { command: 'mypage', description: '🔗 Моя страница' },
      { command: 'managerstats', description: '💰 Статистика менеджера' },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let update: Record<string, any>
  try { update = await request.json() } catch { return Response.json({ ok: true }) }

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
    } else if (data === 'clients_list') {
      await managerClientsHandler(chatId)
    } else if (data === 'payout_request') {
      await managerPayoutRequestHandler(chatId)
    } else if (data.startsWith('manager_approve:') && chatId === adminChatId()) {
      const uname = (data.split(':')[1] ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40)
      if (uname) {
        const db = getSupabaseAdmin() as any
        const { data: mgrProf } = await db.from('profiles').select('telegram_chat_id').eq('username', uname).maybeSingle()
        await db.from('profiles').update({ is_manager: true, manager_since: new Date().toISOString() }).eq('username', uname)
        await sendTelegram(chatId, `✅ @${uname} назначен менеджером`)
        if (mgrProf?.telegram_chat_id) {
          await tgPost('sendMessage', {
            chat_id: mgrProf.telegram_chat_id,
            text: `🎉 <b>Вы назначены менеджером tapni.kz!</b>\n\nВы зарабатываете <b>20%</b> с каждого привлечённого Premium-клиента.\n\nКабинет менеджера: <a href="https://tapni.kz/manager">tapni.kz/manager</a>`,
            parse_mode: 'HTML',
            reply_markup: MANAGER_KEYBOARD,
          })
        }
      }
    } else if (data.startsWith('quick_activate:') && chatId === adminChatId()) {
      const [, uname, daysStr] = data.split(':')
      const safeUname = (uname ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40)
      if (!safeUname) return Response.json({ ok: true })
      const days = parseInt(daysStr ?? '30', 10)
      if (isNaN(days) || days < 1 || days > 3650) return Response.json({ ok: true })
      await adminActivateHandler(chatId, safeUname, days)
    } else if (data.startsWith('cancel_premium:') && chatId === adminChatId()) {
      const rawUname = data.split(':')[1] ?? ''
      const uname = rawUname.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40)
      if (!uname) return Response.json({ ok: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminDb = (getSupabaseAdmin() as any)
      // Fetch first to know if was_premium (avoid duplicate cancel notification)
      const { data: beforeProf } = await adminDb.from('profiles').select('is_premium, business_name, telegram_chat_id').eq('username', uname).maybeSingle()
      if (!beforeProf) { await sendTelegram(chatId, `❌ Не найден: ${uname}`); return Response.json({ ok: true }) }
      const wasPremium = beforeProf.is_premium
      const { error } = await adminDb
        .from('profiles')
        .update({ is_premium: false, subscription_expires_at: null, updated_at: new Date().toISOString() })
        .eq('username', uname)
      const profData = beforeProf
      if (error) {
        await sendTelegram(chatId, `❌ Ошибка: ${uname}`)
      } else {
        // Cancel pending payments for this user
        await adminDb.from('payments')
          .update({ status: 'cancelled' })
          .eq('username', uname)
          .eq('status', 'pending')
          .catch(() => {})
        await sendTelegram(chatId, `✅ Premium отменён для <b>${esc(profData.business_name)}</b> (@${uname})`)
        if (profData.telegram_chat_id && wasPremium) {
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
      const db = getSupabaseAdmin() as any
      const { data: prof } = await db.from('profiles').select('id,business_name,username,phone,address,bio,is_premium,subscription_expires_at,subscription_plan,avatar_url,telegram_chat_id,created_at').eq('username', uname).maybeSingle()
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
  if (!msg?.text && !msg?.contact && !msg?.photo && !msg?.document) return Response.json({ ok: true })

  const chatId = String(msg.chat?.id ?? '')
  const isAdmin = chatId === adminChatId()

  // ── Contact sharing (phone linking) ──────────────────────────
  if (msg.contact && !isAdmin) {
    // Verify the user is sharing their OWN contact (prevents linking someone else's account)
    const senderId = msg.from?.id
    if (senderId && msg.contact.user_id && String(msg.contact.user_id) !== String(senderId)) {
      await tgPost('sendMessage', { chat_id: chatId, text: `❌ Пожалуйста, поделитесь своим номером через кнопку «📱 Поделиться номером».`, parse_mode: 'HTML', reply_markup: USER_KEYBOARD })
      return Response.json({ ok: true })
    }
    await handleContactShare(chatId, msg.contact)
    return Response.json({ ok: true })
  }

  // ── Photo / document receipt upload ─────────────────────────
  if ((msg.photo || msg.document) && !isAdmin) {
    if (msg.photo) {
      await handleReceiptPhoto(chatId, msg.photo)
    } else if (msg.document) {
      const mime = msg.document.mime_type ?? ''
      if (mime.startsWith('image/')) {
        // Image sent as file (uncompressed) — treat like a photo
        await handleReceiptPhotoById(chatId, msg.document.file_id)
      } else {
        await tgPost('sendMessage', {
          chat_id: chatId,
          text: '📸 Пожалуйста, отправьте <b>скриншот</b> (фото) чека, а не файл PDF.\n\nСделайте снимок экрана и отправьте как фото.',
          parse_mode: 'HTML',
        })
      }
    }
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
        const db = (getSupabaseAdmin() as any)
        const [total, premium, annual, promoP, managers, referrals, today, week, withLogo, withTg] = await Promise.all([
          db.from('profiles').select('*', { count: 'exact', head: true }),
          db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
          db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true).eq('subscription_plan', 'annual'),
          db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true).eq('is_promo', true),
          db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_manager', true),
          db.from('profiles').select('*', { count: 'exact', head: true }).not('referred_by', 'is', null),
          db.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
          db.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
          db.from('profiles').select('*', { count: 'exact', head: true }).not('avatar_url', 'is', null),
          db.from('profiles').select('*', { count: 'exact', head: true }).not('telegram_chat_id', 'is', null),
        ])
        const realPremium = (premium.count ?? 0) - (promoP.count ?? 0)
        const freePremium = (premium.count ?? 0) - (annual.count ?? 0)
        await reply(
          `📊 <b>Статистика tapni.kz</b>\n\n` +
          `👥 Всего аккаунтов: <b>${total.count ?? 0}</b>\n\n` +
          `<b>Типы аккаунтов:</b>\n` +
          `  💳 Платных: <b>${realPremium}</b> (⭐год: ${annual.count ?? 0} · 📅мес: ${freePremium})\n` +
          `  🎁 Промо/блогеры: ${promoP.count ?? 0}\n` +
          `  🔗 Рефералы менеджеров: ${referrals.count ?? 0}\n` +
          `  👔 Менеджеры: ${managers.count ?? 0}\n\n` +
          `<b>Прочее:</b>\n` +
          `  🖼 С логотипом: ${withLogo.count ?? 0}\n` +
          `  💬 Telegram привязан: ${withTg.count ?? 0}\n` +
          `  🆕 За 24 ч: ${today.count ?? 0}\n` +
          `  📈 За 7 дней: ${week.count ?? 0}`
        )

      } else if (cmd === '/users') {
        const { data } = await (getSupabaseAdmin() as any)
          .from('profiles')
          .select('username, business_name, phone, is_premium, is_promo, is_manager, referred_by, subscription_plan, created_at')
          .order('created_at', { ascending: false })
          .limit(10)

        if (!data?.length) { await reply('Нет пользователей'); return Response.json({ ok: true }) }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = data.map((p: any) => {
          const date = new Date(p.created_at).toLocaleDateString('ru-KZ', { day: '2-digit', month: '2-digit' })
          const badge = p.is_manager ? '👔' : p.is_premium ? (p.is_promo ? '🎁' : p.subscription_plan === 'annual' ? '⭐' : '⚡') : '·'
          const ref = p.referred_by ? ` ←@${p.referred_by}` : ''
          return `${badge} <b>${p.username}</b> (${p.business_name ?? '—'}) +${p.phone ?? '?'}${ref} [${date}]`
        })
        await reply(`👥 <b>Последние 10:</b>\n\n${lines.join('\n')}\n\n· бесплатный · ⚡ платный · ⭐ год · 🎁 промо · 👔 менеджер`)

      } else if (cmd === '/find') {
        const query = parts[1] ?? ''
        if (!query) { await reply('Использование: /find username или /find +77001234567'); return Response.json({ ok: true }) }
        const phone = query.replace(/^\+/, '')
        const isPhone = /^\d{11}$/.test(phone)
        const db = getSupabaseAdmin() as any
        const PROF_COLS = 'id,business_name,username,phone,address,bio,is_premium,is_promo,is_manager,referred_by,subscription_expires_at,subscription_plan,avatar_url,telegram_chat_id,created_at'
        const { data } = isPhone
          ? await db.from('profiles').select(PROF_COLS).eq('phone', phone).maybeSingle()
          : await db.from('profiles').select(PROF_COLS).eq('username', query.toLowerCase()).maybeSingle()

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
        const adminDb2 = (getSupabaseAdmin() as any)
        const { data, error } = await adminDb2
          .from('profiles')
          .update({ is_premium: false, is_promo: false, subscription_expires_at: null, subscription_plan: 'monthly', updated_at: new Date().toISOString() })
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
        const db = (getSupabaseAdmin() as any)
        const { data: existing } = await db.from('profiles').select('id, business_name, telegram_chat_id').eq('username', uname).maybeSingle()
        if (existing) {
          await adminActivateHandler(chatId, uname, days)
          return Response.json({ ok: true })
        }
        // Store pre-gift for when they register
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminDb = (getSupabaseAdmin() as any)
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
        const adminDb3 = (getSupabaseAdmin() as any)
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
        const { data: prof } = await (getSupabaseAdmin() as any)
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
        const { data } = await (getSupabaseAdmin() as any)
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
            .from('payments' as any).select('plan, amount, status, provider, created_at').gte('created_at', since)
          if (pErr?.code === '42P01') {
            await reply(`❌ Таблица payments не создана.\n\nЗапустите <code>SUPABASE_MIGRATION_V7.sql</code> в Supabase SQL Editor.`)
            return Response.json({ ok: true })
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const confirmed = ((pmts ?? []) as any[]).filter((p: any) => p.status === 'confirmed')
          // Real revenue = confirmed excluding admin-gifted (admin_confirmed provider = always promo)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const real = confirmed.filter((p: any) => p.provider !== 'admin_confirmed')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gifted = confirmed.filter((p: any) => p.provider === 'admin_confirmed')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalRevenue = real.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const monthly = real.filter((p: any) => p.plan === 'monthly').length
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const annual = real.filter((p: any) => p.plan === 'annual').length
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cancelled = ((pmts ?? []) as any[]).filter((p: any) => p.status === 'cancelled').length
          await reply(
            `💰 <b>Выручка за ${days} дней</b>\n\n` +
            `💵 Реальная: <b>${totalRevenue.toLocaleString('ru-KZ')} ₸</b>\n` +
            `📅 Месячных: ${monthly} × 1 000 ₸\n` +
            `⭐ Годовых: ${annual} × 10 000 ₸\n` +
            (gifted.length ? `🎁 Промо-активаций: ${gifted.length} (не считаются)\n` : '') +
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

      } else if (cmd === '/manager') {
        const action = parts[1]?.toLowerCase()
        const uname = parts[2]?.toLowerCase()
        const db = getSupabaseAdmin() as any
        if (action === 'add' && uname) {
          const { data: prof } = await db.from('profiles').select('username, business_name, telegram_chat_id').eq('username', uname).maybeSingle()
          if (!prof) { await reply(`❌ Пользователь не найден: <code>${uname}</code>`); return Response.json({ ok: true }) }
          await db.from('profiles').update({ is_manager: true, manager_since: new Date().toISOString() }).eq('username', uname)
          await reply(`✅ <b>@${uname}</b> назначен менеджером.\n\nКабинет: ${SITE_URL}/manager`)
          // Notify the new manager via Telegram with manager keyboard
          if (prof.telegram_chat_id && TOKEN()) {
            const referUrl = `${SITE_URL}/auth?ref=${uname}`
            await fetch(`https://api.telegram.org/bot${TOKEN()}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: prof.telegram_chat_id,
                text:
                  `🎉 <b>Поздравляем! Вы стали менеджером tapni.kz</b>\n\n` +
                  `Теперь вы зарабатываете <b>20%</b> с каждого привлечённого Premium-клиента.\n\n` +
                  `🔗 Ваша реферальная ссылка:\n<code>${referUrl}</code>\n\n` +
                  `Поделитесь ссылкой — ваш кабинет менеджера:`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '📊 Открыть кабинет менеджера', url: `${SITE_URL}/manager` }],
                    [{ text: '📤 Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(referUrl)}&text=${encodeURIComponent('Создайте визитку для бизнеса на tapni.kz:')}` }],
                  ],
                },
              }),
            }).catch(() => {})
            // Update keyboard to manager version
            await fetch(`https://api.telegram.org/bot${TOKEN()}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: prof.telegram_chat_id,
                text: `💰 <b>Ваше меню обновлено</b> — теперь доступны кнопки «Комиссии» и «Мои клиенты».\n\nНажмите /start чтобы увидеть новое меню.`,
                parse_mode: 'HTML',
                reply_markup: MANAGER_KEYBOARD,
              }),
            }).catch(() => {})
          }
        } else if (action === 'remove' && uname) {
          const { data: removedProf } = await db.from('profiles').select('telegram_chat_id, is_manager').eq('username', uname).maybeSingle()
          if (!removedProf) {
            await reply(`❌ Пользователь <b>@${uname}</b> не найден.`)
          } else if (!removedProf.is_manager) {
            await reply(`ℹ️ <b>@${uname}</b> не является менеджером.`)
          } else {
          await db.from('profiles').update({ is_manager: false, manager_since: null }).eq('username', uname)
          await reply(`✅ Статус менеджера снят с <b>@${uname}</b>.`)
          // Restore regular keyboard
          if (removedProf?.telegram_chat_id && TOKEN()) {
            await fetch(`https://api.telegram.org/bot${TOKEN()}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: removedProf.telegram_chat_id,
                text: `ℹ️ Ваш статус менеджера tapni.kz был изменён.`,
                parse_mode: 'HTML',
                reply_markup: USER_KEYBOARD,
              }),
            }).catch(() => {})
          }
          } // end else (is_manager)
        } else {
          await reply(`Использование:\n/manager add <i>username</i> — назначить менеджером\n/manager remove <i>username</i> — снять статус`)
        }

      } else if (cmd === '/managers') {
        const db = getSupabaseAdmin() as any
        const { data: mgrs } = await db
          .from('profiles')
          .select('username, business_name')
          .eq('is_manager', true)
          .order('username')
        if (!mgrs?.length) { await reply('Нет активных менеджеров.'); return Response.json({ ok: true }) }
        // Fetch commission stats for each manager
        const usernames = (mgrs as { username: string }[]).map(m => m.username)
        const { data: commRows } = await db
          .from('sales_commissions')
          .select('manager_username, commission_amount, status')
          .in('manager_username', usernames)
        const commMap = new Map<string, { total: number; pending: number; clients: Set<string> }>()
        for (const c of (commRows ?? []) as { manager_username: string; commission_amount: number; status: string }[]) {
          if (!commMap.has(c.manager_username)) commMap.set(c.manager_username, { total: 0, pending: 0, clients: new Set() })
          const e = commMap.get(c.manager_username)!
          e.total += c.commission_amount
          if (c.status === 'pending') e.pending += c.commission_amount
        }
        const lines = (mgrs as { username: string; business_name: string | null }[]).map(m => {
          const s = commMap.get(m.username)
          return `👤 <b>@${m.username}</b>${m.business_name ? ` (${m.business_name})` : ''}\n` +
            `   💰 Заработано: ${(s?.total ?? 0).toLocaleString('ru-KZ')} ₸ · К выплате: ${(s?.pending ?? 0).toLocaleString('ru-KZ')} ₸`
        })
        await reply(`👥 <b>Менеджеры (${mgrs.length}):</b>\n\n${lines.join('\n\n')}`)

      } else if (cmd === '/commissions') {
        const db = getSupabaseAdmin() as any
        const { data: comms } = await db
          .from('sales_commissions')
          .select('manager_username, client_username, sale_amount, commission_amount, plan, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(30)
        if (!comms?.length) { await reply('Нет ожидающих комиссий.'); return Response.json({ ok: true }) }
        const lines = (comms as { manager_username: string; client_username: string; sale_amount: number; commission_amount: number; plan: string; created_at: string }[]).map(c => {
          const dt = new Date(c.created_at).toLocaleDateString('ru-KZ')
          const planLabel = c.plan === 'annual' ? '⭐год' : '📅мес'
          return `⏳ <b>@${c.manager_username}</b> → @${c.client_username} · ${planLabel} · ${c.commission_amount.toLocaleString('ru-KZ')} ₸ (${dt})`
        })
        const total = (comms as { commission_amount: number }[]).reduce((s, c) => s + c.commission_amount, 0)
        await reply(`⏳ <b>Ожидающие комиссии:</b>\n\n${lines.join('\n')}\n\n💵 Итого к выплате: <b>${total.toLocaleString('ru-KZ')} ₸</b>`)

      } else if (cmd === '/paid') {
        const uname = parts[1]?.toLowerCase()
        if (!uname) { await reply('Использование: /paid <i>username</i>'); return Response.json({ ok: true }) }
        const db = getSupabaseAdmin() as any
        // Sum pending before update
        const { data: pending } = await db
          .from('sales_commissions')
          .select('id, commission_amount')
          .eq('manager_username', uname)
          .eq('status', 'pending')
        if (!pending?.length) { await reply(`Нет ожидающих комиссий для <b>@${uname}</b>.`); return Response.json({ ok: true }) }
        const totalPaid = (pending as { commission_amount: number }[]).reduce((s, c) => s + c.commission_amount, 0)
        const ids = (pending as { id: string }[]).map(c => c.id)
        await db.from('sales_commissions').update({ status: 'paid', paid_at: new Date().toISOString() }).in('id', ids)
        // Notify manager via Telegram
        const { data: mgrProf } = await db.from('profiles').select('telegram_chat_id').eq('username', uname).maybeSingle()
        if (mgrProf?.telegram_chat_id) {
          await tgPost('sendMessage', {
            chat_id: mgrProf.telegram_chat_id,
            text: `✅ <b>Выплата получена!</b>\n\nАдминистратор отметил комиссию <b>${totalPaid.toLocaleString('ru-KZ')} ₸</b> как выплаченную.\n\nСпасибо за работу!`,
            parse_mode: 'HTML',
          })
        }
        await reply(`✅ <b>${ids.length} комиссий @${uname}</b> отмечены как выплаченные.\n💵 Сумма: <b>${totalPaid.toLocaleString('ru-KZ')} ₸</b>`)

      } else if (cmd === '/promo') {
        const action = parts[1]?.toLowerCase()
        const uname = parts[2]?.toLowerCase()
        const db = getSupabaseAdmin() as any
        if (action === 'add' && uname) {
          const { data: pf } = await db.from('profiles').select('username, business_name, is_premium').eq('username', uname).maybeSingle()
          if (!pf) { await reply(`❌ Пользователь не найден: <code>${uname}</code>`); return Response.json({ ok: true }) }
          await db.from('profiles').update({ is_promo: true }).eq('username', uname)
          const premiumNote = pf.is_premium ? ' (Premium активен — без комиссий)' : ''
          await reply(`🎁 <b>@${uname}</b> отмечен как промо-аккаунт.${premiumNote}\n\nКомиссии для этого клиента начисляться не будут.`)
        } else if (action === 'remove' && uname) {
          await db.from('profiles').update({ is_promo: false }).eq('username', uname)
          await reply(`✅ Промо-статус снят с <b>@${uname}</b>. Теперь оплаты генерируют реальные комиссии.`)
        } else if (action === 'list') {
          const { data: promoUsers } = await db
            .from('profiles')
            .select('username, business_name, is_premium, subscription_expires_at')
            .eq('is_promo', true)
            .order('username')
          if (!promoUsers?.length) { await reply('Нет промо-аккаунтов.'); return Response.json({ ok: true }) }
          const lines = (promoUsers as { username: string; business_name: string | null; is_premium: boolean; subscription_expires_at: string | null }[]).map(p => {
            const badge = p.is_premium ? '⚡' : '·'
            const exp = p.subscription_expires_at ? ` до ${new Date(p.subscription_expires_at).toLocaleDateString('ru-KZ')}` : ''
            return `${badge} <b>@${p.username}</b>${p.business_name ? ` (${p.business_name})` : ''}${exp}`
          })
          await reply(`🎁 <b>Промо-аккаунты (${promoUsers.length}):</b>\n\n${lines.join('\n')}`)
        } else {
          await reply('Использование:\n/promo add <i>username</i> — отметить как промо\n/promo remove <i>username</i> — снять промо-статус\n/promo list — список всех промо')
        }

      } else if (cmd === '/expired') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        const { data } = await (getSupabaseAdmin() as any)
          .from('profiles').select('username, phone, subscription_expires_at')
          .eq('is_premium', false).gte('subscription_expires_at', weekAgo)
          .lte('subscription_expires_at', new Date().toISOString())
          .order('subscription_expires_at', { ascending: false })
        if (!data?.length) { await reply('Нет истёкших за 7 дней'); return Response.json({ ok: true }) }
        const lines = (data as { username: string; phone: string | null; subscription_expires_at: string | null }[])
          .map((p) => `🔴 <b>${p.username}</b> +${p.phone ?? '?'} — истёк ${new Date(p.subscription_expires_at!).toLocaleDateString('ru-KZ')}`)
        await reply(`🔴 <b>Истёкшие (7 дней):</b>\n\n${lines.join('\n')}`)

      } else if (cmd === '/setphone') {
        const uname = parts[1]?.toLowerCase()
        const newPhone = parts[2]?.replace(/\D/g, '')
        if (!uname || !newPhone || newPhone.length < 10) {
          await reply('Использование: /setphone username +77001234567\nПример: /setphone demo +77001234567')
          return Response.json({ ok: true })
        }
        const db = getSupabaseAdmin() as any
        const { data: prof, error: findErr } = await db
          .from('profiles')
          .select('id, business_name, phone, telegram_chat_id')
          .eq('username', uname)
          .maybeSingle()
        if (findErr || !prof) {
          await reply(`❌ Пользователь <b>${uname}</b> не найден`)
          return Response.json({ ok: true })
        }
        const oldPhone = prof.phone ?? '?'
        const { error: updErr } = await db
          .from('profiles')
          .update({ phone: newPhone, updated_at: new Date().toISOString() })
          .eq('id', prof.id)
        // Also update the Supabase Auth email so /reset still works after phone change
        if (!updErr) {
          await db.auth.admin.updateUserById(prof.id, { email: `${newPhone}@users.tapni.kz` }).catch(() => {})
        }
        if (updErr) {
          await reply(`❌ Ошибка: <code>${esc(updErr.message ?? updErr.code)}</code>`)
        } else {
          await reply(
            `✅ <b>Номер изменён</b>\n\n` +
            `👤 ${esc(prof.business_name)} (@${uname})\n` +
            `📱 +${oldPhone} → +${newPhone}`
          )
          if (prof.telegram_chat_id) {
            await tgPost('sendMessage', {
              chat_id: prof.telegram_chat_id,
              text: `ℹ️ Ваш номер телефона в аккаунте tapni.kz был изменён администратором.\n\nНовый номер: +${newPhone}`,
              parse_mode: 'HTML',
            })
          }
        }

      } else if (cmd === '/reset') {
        // /reset username  OR  /reset +77001234567
        const query = parts[1] ?? ''
        if (!query) {
          await reply('Использование:\n/reset <i>username</i>\n/reset <i>+77001234567</i>')
          return Response.json({ ok: true })
        }
        const db = getSupabaseAdmin() as any
        const phone = query.replace(/^\+/, '').replace(/\D/g, '')
        const isPhone = /^\d{10,12}$/.test(phone)
        const { data: prof } = isPhone
          ? await db.from('profiles').select('username, business_name, telegram_chat_id, phone').eq('phone', phone).maybeSingle()
          : await db.from('profiles').select('username, business_name, telegram_chat_id, phone').eq('username', query.toLowerCase()).maybeSingle()

        if (!prof) {
          await reply(`❌ Пользователь не найден: <code>${query}</code>`)
          return Response.json({ ok: true })
        }

        const email = `${prof.phone}@users.tapni.kz`
        const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: 'https://tapni.kz/auth/set-password' },
        })

        if (linkErr || !linkData?.properties?.action_link) {
          await reply(`❌ Ошибка генерации ссылки: <code>${linkErr?.message ?? 'нет данных'}</code>`)
          return Response.json({ ok: true })
        }

        const actionLink = linkData.properties.action_link as string
        const userMsg =
          `🔐 <b>Сброс пароля tapni.kz</b>\n\n` +
          `Администратор инициировал сброс пароля для аккаунта <b>${prof.business_name}</b>.\n\n` +
          `<b>Ссылка действует 1 час и одноразовая.</b>\n\n` +
          `👉 <a href="${actionLink}">Задать новый пароль</a>`

        if (prof.telegram_chat_id) {
          await tgPost('sendMessage', {
            chat_id: prof.telegram_chat_id,
            text: userMsg,
            parse_mode: 'HTML',
          })
          await reply(
            `✅ <b>Ссылка отправлена пользователю в Telegram</b>\n\n` +
            `👤 ${prof.business_name} (tapni.kz/${prof.username})\n` +
            `📱 +${prof.phone}\n\n` +
            `🔑 <a href="${actionLink}">Ссылка для сброса пароля (копия)</a>\n` +
            `<i>Действует 1 час, одноразовая</i>`
          )
        } else {
          await reply(
            `⚠️ <b>Telegram не привязан — отправьте вручную</b>\n\n` +
            `👤 ${prof.business_name} (tapni.kz/${prof.username})\n` +
            `📱 +${prof.phone}\n\n` +
            `🔑 <a href="${actionLink}">Ссылка для сброса пароля</a>\n` +
            `<i>Отправьте пользователю через WhatsApp. Действует 1 час, одноразовая.</i>`
          )
        }

      } else if (cmd === '/delete') {
        const action = parts[1]?.toLowerCase()
        const uname = parts[2]?.toLowerCase() ?? parts[1]?.toLowerCase()
        const db = getSupabaseAdmin() as any

        if (action === 'confirm' && parts[2]) {
          // Step 2: actual deletion
          const { data: prof } = await db.from('profiles')
            .select('id, username, business_name, phone, is_premium')
            .eq('username', parts[2].toLowerCase())
            .maybeSingle()
          if (!prof) { await reply(`❌ Пользователь не найден: <code>${parts[2]}</code>`); return Response.json({ ok: true }) }

          // Delete all related data in order
          const linkIds = await db.from('links').select('id').eq('profile_id', prof.id)
          if (linkIds.data?.length) {
            const ids = (linkIds.data as { id: string }[]).map(l => l.id)
            await db.from('click_events').delete().in('link_id', ids)
          }
          await db.from('links').delete().eq('profile_id', prof.id)
          await db.from('payments').delete().eq('username', prof.username)
          await db.from('sales_commissions').delete().or(`manager_username.eq.${prof.username},client_username.eq.${prof.username}`)
          await db.from('lead_submissions').delete().eq('profile_id', prof.id)
          await db.from('profiles').delete().eq('id', prof.id)
          try { await db.auth.admin.deleteUser(prof.id) } catch { /* user may not exist in auth */ }

          await reply(
            `🗑 <b>Аккаунт удалён</b>\n\n` +
            `👤 @${prof.username}${prof.business_name ? ` (${prof.business_name})` : ''}\n` +
            `📱 ${prof.phone ? `+${prof.phone}` : 'нет телефона'}\n` +
            `${prof.is_premium ? '⚡ Был Premium' : '· Бесплатный'}`
          )

        } else if (uname && action !== 'confirm') {
          // Step 1: show info and ask for confirmation
          const { data: prof } = await db.from('profiles')
            .select('id, username, business_name, phone, is_premium, subscription_expires_at, created_at')
            .eq('username', uname)
            .maybeSingle()
          if (!prof) { await reply(`❌ Пользователь не найден: <code>${uname}</code>`); return Response.json({ ok: true }) }

          const [linksRes, paymentsRes] = await Promise.all([
            db.from('links').select('*', { count: 'exact', head: true }).eq('profile_id', prof.id),
            db.from('payments').select('*', { count: 'exact', head: true }).eq('username', prof.username),
          ])
          const expires = prof.subscription_expires_at
            ? new Date(prof.subscription_expires_at).toLocaleDateString('ru-KZ')
            : '—'
          const createdAt = new Date(prof.created_at).toLocaleDateString('ru-KZ')

          await reply(
            `⚠️ <b>Удаление аккаунта</b>\n\n` +
            `👤 @${prof.username}${prof.business_name ? ` (${prof.business_name})` : ''}\n` +
            `📱 ${prof.phone ? `+${prof.phone}` : 'нет телефона'}\n` +
            `${prof.is_premium ? `⚡ Premium до ${expires}` : '· Бесплатный'}\n` +
            `📅 Зарегистрирован: ${createdAt}\n` +
            `🔗 Кнопок: ${linksRes.count ?? 0} · 💳 Платежей: ${paymentsRes.count ?? 0}\n\n` +
            `Удалятся: профиль, кнопки, клики, платежи, комиссии.\n\n` +
            `Для подтверждения:\n<code>/delete confirm ${prof.username}</code>`
          )
        } else {
          await reply('Использование:\n/delete <i>username</i> — показать данные и запросить подтверждение\n/delete confirm <i>username</i> — удалить безвозвратно')
        }

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
      text === '📋 Заявки'       ? '/leads'    :
      text === '👥 Реферал'      ? '/ref'      :
      text === '💰 Комиссии'     ? '/managerstats' :
      text === '👤 Мои клиенты'  ? '/clients'  :
      text === '❓ Помощь'        ? '/help'     :
      text === '🆘 Поддержка'    ? '/support'  :
      text === '🔗 Моя страница'  ? '/mypage'   :
      cmd

    if (normalized === '/start' && parts[1]?.startsWith('receipt_')) {
      // Deep link from pay page: /start receipt_username
      const targetUsername = parts[1].slice('receipt_'.length).replace(/[^a-z0-9._-]/g, '').slice(0, 40)
      await receiptStartHandler(chatId, targetUsername)
    } else if (normalized === '/start') {
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
    } else if (normalized === '/ref' || normalized === '/referral') {
      await refHandler(chatId)
    } else if (normalized === '/managerstats' || normalized === '/mgrstat') {
      await managerStatsHandler(chatId)
    } else if (normalized === '/clients') {
      await managerClientsHandler(chatId)
    } else if (normalized === '/paid' || normalized === '/payout') {
      await managerPayoutRequestHandler(chatId)
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
    try {
      await tgPost('sendMessage', { chat_id: chatId, text: `⚠️ Произошла ошибка. Попробуйте позже или напишите в поддержку.`, parse_mode: 'HTML', reply_markup: USER_KEYBOARD })
    } catch { /* ignore secondary error */ }
  }

  return Response.json({ ok: true })
}

// ─── Phone contact handler ────────────────────────────────────

async function handleContactShare(chatId: string, contact: { phone_number?: string }) {
  const raw = contact.phone_number ?? ''
  let phone = raw.replace(/\D/g, '')
  // KZ numbers: if starts with 8, treat as 77...
  if (phone.startsWith('8') && phone.length === 11) phone = '7' + phone.slice(1)

  const { data: prof } = await (getSupabaseAdmin() as any)
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
    const giftDb = (getSupabaseAdmin() as any)
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

  // Link telegram_chat_id to profile + start onboarding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkResult = await (getSupabaseAdmin() as any)
    .from('profiles')
    .update({ telegram_chat_id: chatId, onboarding_step: 1, onboarding_sent_at: new Date().toISOString() })
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

  // Onboarding step 1: immediate welcome guide
  await tgPost('sendMessage', {
    chat_id: chatId,
    text:
      `🚀 <b>3 шага чтобы начать:</b>\n\n` +
      `1️⃣ Добавьте кнопки — WhatsApp, Kaspi Pay, 2ГИС\n` +
      `2️⃣ Загрузите логотип и укажите адрес\n` +
      `3️⃣ Поделитесь ссылкой с клиентами\n\n` +
      `Ваша ссылка: <code>${SITE_URL}/${prof.username}</code>`,
    parse_mode: 'HTML',
  })
  await sendInline(chatId, 'Начните прямо сейчас:', [
    [{ text: '✏️ Открыть дашборд', url: `${SITE_URL}/dashboard` }],
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
  const { data: linked } = await (getSupabaseAdmin() as any)
    .from('profiles')
    .select('username, business_name, is_premium, is_manager, subscription_expires_at')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (linked) {
    const expiryStr = linked.subscription_expires_at
      ? ` · до ${new Date(linked.subscription_expires_at).toLocaleDateString('ru-KZ')}`
      : ''
    const managerBadge = linked.is_manager ? '\n👔 Менеджер tapni.kz' : ''
    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `👋 С возвращением, <b>${linked.business_name}</b>!\n\n` +
        `🔗 ${SITE_URL}/${linked.username}\n` +
        (linked.is_premium ? `⚡ Premium активен${expiryStr}\n` : '') +
        managerBadge +
        `\nЧто хотите сделать? 👇`,
      parse_mode: 'HTML',
      reply_markup: linked.is_manager ? MANAGER_KEYBOARD : USER_KEYBOARD,
    })
    await sendInline(chatId, '🔗 Перейти к управлению:', [
      [{ text: `🌐 Открыть мою страницу`, url: `${SITE_URL}/${linked.username}` }],
      [{ text: '✏️ Управлять ссылками', url: `${SITE_URL}/dashboard` }],
      ...(linked.is_manager ? [[{ text: '💰 Кабинет менеджера', url: `${SITE_URL}/manager` }]] : []),
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
  const { data: linked } = await (getSupabaseAdmin() as any)
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
  const { data: linked } = await (getSupabaseAdmin() as any)
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
  const { data: linked } = await (getSupabaseAdmin() as any)
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
    `Кабинет → вкладка «Профиль» → «Загрузить логотип» (JPG/PNG/WebP, до 10 МБ).\n\n` +
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
    const { data: linked } = await (getSupabaseAdmin() as any)
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
  const adminDb = (getSupabaseAdmin() as any)
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
      `👤 ${esc(String(data.business_name))} (@${esc(username)})\n` +
      `📱 +${esc(String(data.phone ?? '?'))}\n` +
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
    // Update pending payments row → confirmed (or insert new if none pending)
    try {
      const amount = plan === 'annual' ? 10000 : 1000
      const { data: pendingPmt } = await adminDb
        .from('payments')
        .select('id')
        .eq('username', username)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pendingPmt?.id) {
        await adminDb.from('payments').update({
          status: 'confirmed',
          days,
          amount,
          plan,
          admin_tg_id: adminChatIdVal,
          provider: 'admin_confirmed',
        }).eq('id', pendingPmt.id)
      } else {
        await adminDb.from('payments').insert({
          username,
          plan,
          amount,
          days,
          method: 'manual',
          status: 'confirmed',
          provider: 'admin_confirmed',
          admin_tg_id: adminChatIdVal,
        })
      }
    } catch (payErr) {
      // payments table doesn't exist — migrations V7+V12 not applied
      const errMsg = payErr instanceof Error ? payErr.message : String(payErr)
      await sendTelegram(adminChatIdVal,
        `⚠️ <b>Premium активирован, но запись платежа не создана!</b>\n\n` +
        `@${username} — применить SUPABASE_MIGRATION_V7.sql + V12.sql\n\n` +
        `Ошибка: <code>${errMsg.slice(0, 200)}</code>`
      )
    }
  }
}

// ─── User profile handler ─────────────────────────────────────

async function profileHandler(chatId: string) {
  const { data: linked } = await (getSupabaseAdmin() as any)
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
    (linked.bio ? `💬 ${esc(String(linked.bio))}\n` : '') +
    (linked.address ? `📍 ${esc(String(linked.address))}\n` : '') +
    (linked.phone ? `📱 +${esc(String(linked.phone))}\n` : '') +
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
  const { data: linked } = await (getSupabaseAdmin() as any)
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

  const { data: links } = await (getSupabaseAdmin() as any)
    .from('links')
    .select('id, title, url, icon_type, click_count')
    .eq('profile_id', linked.id)
    .order('click_count', { ascending: false })

  if (!links?.length) {
    await sendInline(chatId,
      `📊 <b>Статистика</b> · tapni.kz/${linked.username}\n\nУ вас пока нет ссылок. Добавьте первую:`,
      [[{ text: '➕ Добавить ссылку', url: `${SITE_URL}/dashboard` }]]
    )
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalClicks = links.reduce((s: any, l: any) => s + (l.click_count ?? 0), 0)
  const viewCount = (linked as { view_count?: number }).view_count ?? 0

  // Compute top link by 7-day clicks — filter to own link IDs to avoid full-table scan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkIds = links.map((l: any) => l.id)
  const { data: recentClicks } = await (getSupabaseAdmin() as any)
    .from('click_events')
    .select('link_id')
    .in('link_id', linkIds)
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())

  const clicksByLink: Record<string, number> = {}
  for (const row of (recentClicks ?? []) as any[]) {
    clicksByLink[row.link_id] = (clicksByLink[row.link_id] ?? 0) + 1
  }
  const topLink7 = links
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => ({ ...l, recent: clicksByLink[l.id] ?? 0 }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => b.recent - a.recent)[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = links.slice(0, 8).map((l: any) => {
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
  const { data: linked } = await (getSupabaseAdmin() as any)
    .from('profiles')
    .select('username, id, is_premium')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked) {
    await sendMenu(chatId, `📋 <b>Заявки</b>\n\nПривяжите аккаунт чтобы видеть заявки.`)
    return
  }

  const { data: leds } = await (getSupabaseAdmin() as any)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = leds.map((l: any) => {
    const dt = new Date(l.created_at).toLocaleDateString('ru-KZ', { day: 'numeric', month: 'short' })
    const msg = l.message ? `\n   💬 ${esc(l.message.slice(0, 60))}` : ''
    return `👤 <b>${esc(l.name)}</b> · <code>${esc(l.phone)}</code> · ${dt}${msg}`
  })

  await sendInline(chatId,
    `📋 <b>Последние заявки</b> · tapni.kz/${linked.username}\n\n${lines.join('\n\n')}`,
    [[{ text: '📋 Все заявки', url: `${SITE_URL}/dashboard` }]]
  )
}

async function managerPayoutRequestHandler(chatId: string) {
  const db = getSupabaseAdmin() as any
  const { data: linked } = await db
    .from('profiles')
    .select('username, is_manager')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked?.is_manager) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: `ℹ️ Эта команда доступна только менеджерам tapni.kz.\n\nСтаньте менеджером: ${SITE_URL}/partners`,
      parse_mode: 'HTML',
    })
    return
  }

  const { data: comms } = await db
    .from('sales_commissions')
    .select('commission_amount')
    .eq('manager_username', linked.username)
    .eq('status', 'pending')

  const total = (comms ?? []).reduce((s: number, c: { commission_amount: number }) => s + c.commission_amount, 0)

  if (total < 2000) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `💰 <b>Баланс комиссий</b>\n\n` +
        `К выплате: <b>${total.toLocaleString('ru-KZ')} ₸</b>\n\n` +
        `Минимум для выплаты — 2 000 ₸.\n` +
        `Продолжайте привлекать клиентов!\n\n` +
        `Кабинет: ${SITE_URL}/manager`,
      parse_mode: 'HTML',
    })
    return
  }

  // Notify admin about payout request
  const adminId = adminChatId()
  if (adminId) {
    await sendTelegram(adminId,
      `💸 <b>Запрос выплаты от менеджера</b>\n\n` +
      `👤 @${linked.username}\n` +
      `💵 К выплате: <b>${total.toLocaleString('ru-KZ')} ₸</b>\n\n` +
      `После перевода: /paid ${linked.username}`
    )
  }

  await tgPost('sendMessage', {
    chat_id: chatId,
    text:
      `✅ <b>Запрос на выплату отправлен!</b>\n\n` +
      `Сумма: <b>${total.toLocaleString('ru-KZ')} ₸</b>\n\n` +
      `Администратор переведёт деньги в течение 7 рабочих дней.\n\n` +
      `Статус комиссий: ${SITE_URL}/manager`,
    parse_mode: 'HTML',
  })
}

async function managerStatsHandler(chatId: string) {
  const db = getSupabaseAdmin() as any
  const { data: linked } = await db
    .from('profiles')
    .select('username, is_manager')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked?.is_manager) {
    await sendMenu(chatId,
      `ℹ️ Статистика менеджера доступна только менеджерам tapni.kz.\n\nСтаньте менеджером и зарабатывайте 20% с каждого привлечённого Premium-клиента:\n${SITE_URL}/partners`
    )
    return
  }

  const [{ count: totalClients }, { count: premClients }, { data: comms }] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', linked.username),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', linked.username).eq('is_premium', true),
    db.from('sales_commissions').select('commission_amount, status').eq('manager_username', linked.username),
  ])
  const totalEarned = (comms ?? []).reduce((s: number, c: { commission_amount: number }) => s + c.commission_amount, 0)
  const pendingPayout = (comms ?? []).filter((c: { status: string }) => c.status === 'pending').reduce((s: number, c: { commission_amount: number }) => s + c.commission_amount, 0)
  const referUrl = `${SITE_URL}/auth?ref=${linked.username}`

  await sendInline(chatId,
    `💰 <b>Статистика менеджера</b>\n\n` +
    `👤 Клиентов привлечено: <b>${totalClients ?? 0}</b>\n` +
    `⚡ Из них Premium: <b>${premClients ?? 0}</b>\n\n` +
    `💵 Заработано всего: <b>${totalEarned.toLocaleString('ru-KZ')} ₸</b>\n` +
    `⏳ К выплате: <b>${pendingPayout.toLocaleString('ru-KZ')} ₸</b>\n\n` +
    `🔗 Ваша ссылка:\n<code>${referUrl}</code>`,
    [
      [{ text: '👤 Мои клиенты', callback_data: 'clients_list' },
       { text: '📤 Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(referUrl)}&text=${encodeURIComponent(`Создайте визитку для бизнеса на tapni.kz:`)}` }],
      ...(pendingPayout >= 2000
        ? [[{ text: `💸 Запросить выплату ${pendingPayout.toLocaleString('ru-KZ')} ₸`, callback_data: 'payout_request' }]]
        : pendingPayout > 0
          ? [[{ text: `⏳ К выплате: ${pendingPayout.toLocaleString('ru-KZ')} ₸ (мин. 2 000 ₸)`, url: `${SITE_URL}/manager` }]]
          : []),
      [{ text: '🖥 Открыть кабинет', url: `${SITE_URL}/manager` }],
    ]
  )
}

async function refHandler(chatId: string) {
  const db = getSupabaseAdmin() as any
  const { data: linked } = await db
    .from('profiles')
    .select('username, business_name')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: `👥 <b>Реферальная программа</b>\n\nПривяжите аккаунт чтобы получить свою реферальную ссылку:`,
      parse_mode: 'HTML',
      reply_markup: CONTACT_KEYBOARD,
    })
    return
  }

  const referUrl = `${SITE_URL}/auth?ref=${linked.username}`

  // Count referred users
  const [{ count: totalReferred }, { count: premReferred }] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', linked.username),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', linked.username).eq('is_premium', true),
  ])

  const shareText = encodeURIComponent(
    `Создал визитку-страницу на tapni.kz — теперь все контакты в одной ссылке!\n\nРегистрируйтесь бесплатно: ${referUrl}`
  )

  await sendInline(chatId,
    `👥 <b>Реферальная программа</b>\n\n` +
    `Приглашайте друзей и получайте вознаграждение.\n\n` +
    `🔗 Ваша ссылка:\n<code>${referUrl}</code>\n\n` +
    `👤 Привлечено: <b>${totalReferred ?? 0}</b> пользователей\n` +
    `⚡ Из них Premium: <b>${premReferred ?? 0}</b>\n\n` +
    `Поделитесь ссылкой в Instagram Bio, TikTok, WhatsApp-группах или на визитке.`,
    [
      [{ text: '📤 Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(referUrl)}&text=${encodeURIComponent(`Создайте визитку-страницу на tapni.kz бесплатно:`)}` }],
      [{ text: '📊 Стать менеджером (с вознаграждением)', url: `${SITE_URL}/partners` }],
    ]
  )
}

async function managerClientsHandler(chatId: string) {
  const db = getSupabaseAdmin() as any
  const { data: linked } = await db
    .from('profiles')
    .select('username, is_manager')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!linked?.is_manager) {
    await sendMenu(chatId,
      `ℹ️ Эта команда доступна только менеджерам tapni.kz.\n\nСтаньте менеджером и получайте 20% с каждого привлечённого клиента: ${SITE_URL}/partners`
    )
    return
  }

  const { data: clients } = await db
    .from('profiles')
    .select('username, business_name, is_premium, subscription_plan, created_at')
    .eq('referred_by', linked.username)
    .order('created_at', { ascending: false })
    .limit(15)

  if (!clients?.length) {
    const referUrl = `${SITE_URL}/auth?ref=${linked.username}`
    await sendInline(chatId,
      `👤 <b>Мои клиенты</b>\n\nКлиентов ещё нет.\n\n🔗 Ваша реферальная ссылка:\n<code>${referUrl}</code>\n\nПоделитесь ссылкой и начните зарабатывать!`,
      [
        [{ text: '📤 Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(referUrl)}&text=${encodeURIComponent(`Создайте визитку для бизнеса на tapni.kz бесплатно:`)}` }],
        [{ text: '📊 Кабинет менеджера', url: `${SITE_URL}/manager` }],
      ]
    )
    return
  }

  const lines = (clients as { username: string; business_name: string; is_premium: boolean; subscription_plan: string; created_at: string }[]).map((c) => {
    const badge = c.is_premium ? (c.subscription_plan === 'annual' ? '⭐' : '⚡') : '🆓'
    const dt = new Date(c.created_at).toLocaleDateString('ru-KZ', { day: 'numeric', month: 'short' })
    return `${badge} <b>${esc(c.business_name || c.username)}</b> @${c.username} · ${dt}`
  })

  await sendInline(chatId,
    `👤 <b>Мои клиенты</b> (${clients.length}${clients.length === 15 ? '+' : ''})\n\n` +
    lines.join('\n') + '\n\n' +
    `⭐ — годовой Premium · ⚡ — месячный · 🆓 — бесплатный`,
    [[{ text: '📊 Полная статистика', url: `${SITE_URL}/manager` }]]
  )
}

async function mypageHandler(chatId: string) {
  const { data: linked } = await (getSupabaseAdmin() as any)
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

// ─── Receipt flow: /start receipt_<username> deep link ────────

async function receiptStartHandler(chatId: string, targetUsername: string) {
  if (!targetUsername) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: `❌ Неверная ссылка. Откройте страницу оплаты заново.`,
      parse_mode: 'HTML',
    })
    return
  }

  // Find the pending payment for this username
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = (getSupabaseAdmin() as any)
  const { data: pendingPmt } = await adminDb
    .from('payments')
    .select('id, plan, days')
    .eq('username', targetUsername)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .catch(() => ({ data: null }))

  if (!pendingPmt) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: `❌ <b>Оплата не найдена</b>\n\nПохоже, заявка устарела или уже подтверждена.\nОткройте страницу оплаты заново.`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '💳 Открыть страницу оплаты', url: `${SITE_URL}/pay` }]] },
    })
    return
  }

  const plan = pendingPmt.plan === 'annual' ? 'annual' : 'monthly'
  const days = pendingPmt.days ?? (plan === 'annual' ? 365 : 30)

  // Store in memory map for photo handler (10 min TTL)
  receiptPending.set(chatId, {
    username: targetUsername,
    plan,
    days,
    paymentId: pendingPmt?.id ?? null,
    ts: Date.now(),
  })

  const planLabel = plan === 'annual' ? '⭐ Годовая (10 000 ₸)' : '📅 Месячная (1 000 ₸)'
  await sendInline(chatId,
    `📸 <b>Отправьте скриншот оплаты</b>\n\n` +
    `Пользователь: <b>${targetUsername}</b>\n` +
    `Тариф: ${planLabel}\n\n` +
    `Пришлите скриншот чека из Kaspi или Халык Банк — администратор проверит и активирует Premium в течение 15 минут.`,
    [[{ text: '💬 Написать в WhatsApp', url: 'https://wa.me/77755696531' }]]
  )
}

// ─── Receipt helpers ──────────────────────────────────────────

/** Validate receipt image with Groq Vision and return extracted data */
async function validateReceiptWithGroq(imageBase64: string): Promise<{
  isReceipt: boolean
  amount: number | null
  transactionId: string | null
  recipient: string | null
  confidence: 'high' | 'low'
}> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { isReceipt: false, amount: null, transactionId: null, recipient: null, confidence: 'low' }

  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [
          {
            type: 'text',
            text: 'Это квитанция об оплате (Kaspi, Халык Банк или другой банк Казахстана)? Извлеки данные и ответь ТОЛЬКО в JSON без пояснений:\n{"is_receipt":true/false,"amount":число_тенге_или_null,"transaction_id":"строка_или_null","recipient":"строка_или_null","confidence":"high/low"}\nConfidence=high если сумма и ID транзакции чётко видны. Если это не чек — {"is_receipt":false,"amount":null,"transaction_id":null,"recipient":null,"confidence":"low"}',
          } as any,
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          } as any,
        ],
      }],
      max_tokens: 150,
      temperature: 0.1,
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { isReceipt: false, amount: null, transactionId: null, recipient: null, confidence: 'low' }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      isReceipt: Boolean(parsed.is_receipt),
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      transactionId: parsed.transaction_id ? String(parsed.transaction_id).trim() : null,
      recipient: parsed.recipient ? String(parsed.recipient).trim() : null,
      confidence: parsed.confidence === 'high' ? 'high' : 'low',
    }
  } catch {
    return { isReceipt: false, amount: null, transactionId: null, recipient: null, confidence: 'low' }
  }
}

/** Get pending receipt context for a chatId (memory + DB fallback) */
async function getPendingReceipt(chatId: string) {
  // Expire stale entries
  for (const [id, entry] of receiptPending.entries()) {
    if (Date.now() - entry.ts > 10 * 60_000) receiptPending.delete(id)
  }

  let pending = receiptPending.get(chatId)
  if (pending) return pending

  // Cold-start fallback: look up by telegram_chat_id in DB
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = (getSupabaseAdmin() as any)
    const { data: prof } = await adminDb
      .from('profiles').select('username').eq('telegram_chat_id', chatId).maybeSingle()
    if (prof?.username) {
      const thirtyMinAgo = new Date(Date.now() - 120 * 60_000).toISOString()
      const { data: pmtRow } = await adminDb
        .from('payments').select('id, plan, days')
        .eq('username', prof.username).eq('status', 'pending')
        .gte('created_at', thirtyMinAgo)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (pmtRow) {
        const plan: 'monthly' | 'annual' = pmtRow.plan === 'annual' ? 'annual' : 'monthly'
        return { username: prof.username, plan, days: pmtRow.days ?? (plan === 'annual' ? 365 : 30), paymentId: pmtRow.id ?? null, ts: Date.now() }
      }
    }
  } catch { /* non-fatal */ }
  return null
}

// ─── Receipt photo handler ─────────────────────────────────────

async function handleReceiptPhoto(
  chatId: string,
  photos: { file_id: string; file_unique_id: string; width: number; height: number }[]
) {
  const bestPhoto = photos.reduce((a, b) => (a.width > b.width ? a : b))
  await handleReceiptPhotoById(chatId, bestPhoto.file_id)
}

async function handleReceiptPhotoById(chatId: string, fileId: string) {
  const pending = await getPendingReceipt(chatId)

  if (!pending) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: '📸 Фото получено, но нет активного запроса на оплату.\n\nЧтобы отправить чек, откройте личный кабинет → вкладка «Оплата» → кнопка «Отправить чек через Telegram».',
      parse_mode: 'HTML',
      reply_markup: USER_KEYBOARD,
    })
    return
  }

  receiptPending.delete(chatId)

  // Send "processing" message immediately
  await tgPost('sendMessage', {
    chat_id: chatId,
    text: '⏳ Проверяю чек...',
    parse_mode: 'HTML',
  })

  // Download image from Telegram for Groq Vision
  let imageBase64: string | null = null
  let receiptUrl: string | null = null
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN()}/getFile?file_id=${fileId}`)
    const fileJson = await fileRes.json()
    if (fileJson.ok && fileJson.result?.file_path) {
      const filePath = fileJson.result.file_path
      receiptUrl = `https://api.telegram.org/file/bot${TOKEN()}/${filePath}`
      const imgRes = await fetch(receiptUrl)
      const buf = await imgRes.arrayBuffer()
      imageBase64 = Buffer.from(buf).toString('base64')
    }
  } catch { /* continue without vision */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = (getSupabaseAdmin() as any)
  const planLabel = pending.plan === 'annual' ? '⭐ Годовая (10 000 ₸)' : '📅 Месячная (1 000 ₸)'
  const expectedAmount = pending.plan === 'annual' ? 10000 : 1000

  // Run Groq Vision validation
  let validation = { isReceipt: false, amount: null as number | null, transactionId: null as string | null, recipient: null as string | null, confidence: 'low' as 'high' | 'low' }
  if (imageBase64) {
    validation = await validateReceiptWithGroq(imageBase64)
  }

  // Check for duplicate transaction ID
  let isDuplicate = false
  if (validation.transactionId) {
    try {
      const { data: existing } = await adminDb
        .from('payments').select('id').eq('transaction_id', validation.transactionId).maybeSingle()
      if (existing) isDuplicate = true
    } catch { /* non-fatal */ }
  }

  const amountOk = validation.amount !== null && Math.abs(validation.amount - expectedAmount) <= expectedAmount * 0.05
  // Verify receipt is for OUR merchant when KASPI_MERCHANT_ID is configured
  const merchantId = process.env.KASPI_MERCHANT_ID
  const recipientOk = !merchantId || !validation.recipient || validation.recipient.toLowerCase().includes(merchantId.toLowerCase())
  const autoApprove = validation.isReceipt && amountOk && validation.confidence === 'high' && !isDuplicate && recipientOk && validation.transactionId !== null

  // Save receipt_url and validation data
  if (pending.paymentId) {
    try {
      await adminDb.from('payments').update({
        receipt_url: receiptUrl,
        ...(validation.transactionId ? { transaction_id: validation.transactionId } : {}),
        auto_validated: autoApprove,
        groq_confidence: validation.confidence,
      }).eq('id', pending.paymentId)
    } catch { /* non-fatal */ }
  }

  if (autoApprove) {
    // ── AUTO ACTIVATION ─────────────────────────────────────────
    try {
      await activatePremium({
        username: pending.username,
        plan: pending.plan,
        pendingPaymentId: pending.paymentId ?? '',
        provider: 'groq_auto_validated',
        note: `Groq vision: ${validation.transactionId ?? 'no_txid'} · ${validation.amount} ₸`,
      })
      // activatePremium() already updates payment status → 'confirmed'
    } catch (err) {
      console.error('[receipt] activatePremium failed', err)
      // Fall through to manual approval
      await notifyAdminForManualReview(chatId, fileId, pending, validation, 'activation_failed')
      await tgPost('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Чек подтверждён, но произошла техническая ошибка. Администратор активирует вручную в течение 15 минут.',
        parse_mode: 'HTML',
      })
      return
    }

    // Notify user of success
    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `🎉 <b>Premium активирован!</b>\n\n` +
        `✅ Чек проверен автоматически\n` +
        `📋 Тариф: ${planLabel}\n` +
        `📅 Доступ: ${pending.days} дней\n\n` +
        `Откройте личный кабинет — все функции уже доступны!`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🚀 Открыть кабинет', url: `${SITE_URL}/dashboard` }]] },
    })

    // Notify admin about auto-activation
    const adminId = adminChatId()
    if (adminId) {
      await tgPost('sendPhoto', {
        chat_id: adminId,
        photo: fileId,
        caption:
          `✅ <b>Автоактивация Premium</b>\n\n` +
          `👤 ${esc(pending.username)} · ${planLabel}\n` +
          `💳 Сумма: ${validation.amount} ₸\n` +
          `🔑 TxID: ${esc(validation.transactionId ?? '—')}\n` +
          `📍 Получатель: ${esc(validation.recipient ?? '—')}\n` +
          `🤖 Confidence: ${validation.confidence}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Отменить (если ошибка)', callback_data: `cancel_premium:${pending.username}` }]],
        },
      })
    }
  } else {
    // ── MANUAL REVIEW ───────────────────────────────────────────
    const reason = isDuplicate
      ? 'дублирующийся ID транзакции'
      : !validation.isReceipt
        ? 'не распознан как чек'
        : !amountOk
          ? `сумма ${validation.amount ?? '?'} ₸ не совпадает с ${expectedAmount} ₸`
          : 'низкая уверенность AI'

    await notifyAdminForManualReview(chatId, fileId, pending, validation, reason)

    await tgPost('sendMessage', {
      chat_id: chatId,
      text:
        `📸 <b>Чек получен!</b>\n\n` +
        `Администратор проверит и активирует Premium в течение 15 минут.\n\n` +
        `Если срочно — напишите в WhatsApp:`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '💬 WhatsApp', url: 'https://wa.me/77755696531' }]] },
    })
  }
}

async function notifyAdminForManualReview(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userChatId: string,
  fileId: string,
  pending: { username: string; plan: string; days: number; paymentId: string | null },
  validation: { isReceipt: boolean; amount: number | null; transactionId: string | null; recipient: string | null; confidence: string },
  reason: string
) {
  const adminId = adminChatId()
  if (!adminId) return
  const planLabel = pending.plan === 'annual' ? '⭐ Годовая (10 000 ₸)' : '📅 Месячная (1 000 ₸)'
  await tgPost('sendPhoto', {
    chat_id: adminId,
    photo: fileId,
    caption:
      `📸 <b>Чек — требует проверки</b>\n\n` +
      `👤 ${esc(pending.username)} · ${planLabel}\n` +
      `🤖 AI: ${reason}\n` +
      `💳 Распознано: ${validation.amount ?? '?'} ₸ · ${esc(validation.transactionId ?? '?')}\n\n` +
      `Подтвердите если платёж корректный:`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: `✅ Активировать ${pending.days} дней`, callback_data: `quick_activate:${pending.username}:${pending.days}` }],
        [{ text: '❌ Отклонить', callback_data: `cancel_premium:${pending.username}` }],
      ],
    },
  })
}
