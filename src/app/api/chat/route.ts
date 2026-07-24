import Groq from 'groq-sdk'

// Global rate limit: 20 Groq calls/minute across all users
const globalMap = new Map<'global', { count: number; resetAt: number }>()
// Per-IP rate limit: 8 Groq calls/hour
const userMap = new Map<string, { count: number; resetAt: number }>()

function checkGlobal(): boolean {
  const now = Date.now()
  const entry = globalMap.get('global')
  if (!entry || now > entry.resetAt) {
    globalMap.set('global', { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

function checkUser(ip: string): boolean {
  const now = Date.now()
  const entry = userMap.get(ip)
  if (!entry || now > entry.resetAt) {
    if (userMap.size > 1000) {
      for (const [k, v] of userMap) { if (now > v.resetAt) userMap.delete(k) }
    }
    userMap.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= 8) return false
  entry.count++
  return true
}

const SYSTEM = (page: string) => `Ты — точный помощник tapni.kz. Отвечай ТОЛЬКО на основе информации ниже. Не придумывай функций. Если не знаешь — скажи "уточните у поддержки в WhatsApp +77755696531". Всегда заканчивай конкретным призывом к действию. Отвечай по-русски, 1-3 предложения.

TAPNI.KZ — цифровые визитки для бизнеса Казахстана (Алматы, Астана, Шымкент и весь Казахстан).

ТИПЫ КНОПОК:
Соцсети: WhatsApp, Telegram, Instagram, TikTok, YouTube, Facebook, ВКонтакте, X (Twitter)
Казахстан: Kaspi Pay (приём оплаты), Kaspi Магазин (страница магазина), Kaspi Товар (карточка товара), Kaspi Pay QR-код, 2ГИС навигация, Kolesa.kz, Krisha.kz
Контакты: Телефон, Email, Сайт, Android (Google Play), iOS (App Store), PayPal
Контент (только Premium): Форма заявки, Изображение/баннер, Видео (YouTube/TikTok), FAQ аккордеон, Обратный отсчёт, Прайс-лист, Карточка товара, Smart QR (маршрутизация iOS/Android/Web), Текст/Описание
Instagram-маркетинг: Instagram DM, Reels/Пост, «Подпишись и получи» (follow gate), DM-триггер по ключ. слову, Вирусный вызов (счётчик просмотров)
Другое: Ссылка, Меню

ПРОФИЛЬ: имя бизнеса, описание (bio), адрес, рабочие часы, аватар, 6 тем (Тёмная, Светлая, Градиент, Блогер, Бизнес, Продавец)

АНАЛИТИКА: просмотры профиля + клики по каждой кнопке + история за 7 дней (Premium)

ТАРИФЫ:
Бесплатно: 3 кнопки, водяной знак "Сделано на tapni.kz", базовые типы
Premium месяц: 1 000 ₸/мес — безлимит кнопок, все типы кнопок, QR-код, аналитика, смена ника, без водяного знака
Premium год: 10 000 ₸/год (экономия 2 000 ₸)
Оплата: Kaspi Pay или Halyk Bank → отправить скриншот чека в Telegram бот (@Tapnikzbot) → Premium активируется автоматически

TELEGRAM БОТ @Tapnikzbot:
- Привязать: написать /start боту — получите уведомления
- Уведомления: за 7 дней и 3 дня до конца подписки
- Сброс пароля: приходит ссылка прямо в Telegram
- Оплата: отправить скриншот чека → автоматическая активация Premium

ПОДДЕРЖКА: WhatsApp +77755696531, Instagram @tapni.kz, Telegram @Tapnikzbot

Страница сейчас: "${page}"`

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  let messages: { role: 'user' | 'assistant'; content: string }[]
  let page: string
  try {
    const body = await request.json()
    messages = body.messages ?? []
    // Sanitize page: only allow URL-safe characters, cap length
    const rawPage = String(body.page ?? '/')
    page = rawPage.replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 100) || '/'
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'empty messages' }, { status: 400 })
  }

  // Sanitize messages: allow only user/assistant roles (prevents system prompt injection) and cap length
  messages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content ?? '').slice(0, 500) }))

  // Last user message must be at least 3 chars
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUser || lastUser.content.trim().length < 3) {
    return Response.json({ error: 'too short' }, { status: 400 })
  }

  if (!checkGlobal()) {
    return Response.json({ rateLimited: true, reason: 'global' }, { status: 429 })
  }
  if (!checkUser(ip)) {
    return Response.json({ rateLimited: true, reason: 'user' }, { status: 429 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'AI временно недоступен' }, { status: 503 })
  }

  try {
    const groq = new Groq({ apiKey })
    // Keep last 6 messages to limit tokens
    const trimmed = messages.slice(-6)
    const completion = await Promise.race([
      groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: SYSTEM(page) }, ...trimmed],
        max_tokens: 200,
        temperature: 0.4,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('chat_timeout')), 12_000)),
    ])
    const reply = completion.choices[0]?.message?.content ?? ''
    return Response.json({ reply })
  } catch (err) {
    console.error('[chat] groq error', err)
    return Response.json({ error: 'Ошибка AI, попробуйте позже' }, { status: 500 })
  }
}
