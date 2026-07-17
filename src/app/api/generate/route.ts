import { NextRequest, NextResponse } from 'next/server'

// Per-IP rate limit: 5 AI-generate calls/hour (protects GROQ quota)
const generateRateMap = new Map<string, { count: number; resetAt: number }>()
function checkGenerateRate(ip: string): boolean {
  const now = Date.now()
  const entry = generateRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    generateRateMap.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

const VALID_THEMES = ['dark', 'light', 'gradient', 'blogger', 'business', 'seller'] as const
const VALID_ICONS = [
  'whatsapp', 'telegram', 'instagram', 'tiktok', 'youtube',
  'kaspi', 'kaspi_pay', 'kaspi_shop', 'kaspi_qr', 'ediny_qr', 'smart_qr', 'twogis', 'website',
  'phone', 'email', 'kolesa', 'krisha', 'vk', 'facebook',
  'link', 'android', 'ios', 'paypal',
] as const

const SOURCE_HINTS: Record<string, string> = {
  instagram: 'Ссылка будет стоять в Bio Instagram. Клиент уже видел фото/контент — ему нужен быстрый способ связаться или заказать. Кнопка instagram обязательна. Тема gradient или blogger хорошо смотрится.',
  tiktok:    'Ссылка будет в Bio TikTok. Аудитория молодая, мобильная. Кнопка tiktok обязательна. Тема dark или gradient.',
  telegram:  'Ссылка будет в Telegram (канал, бот, bio). Кнопка telegram обязательна.',
  kaspi:     'Продавец Kaspi. Кнопки kaspi_shop и kaspi_pay обязательны. Тема seller. Клиент уже в экосистеме Kaspi.',
  general:   'Общий сайт или визитка. Приоритет — WhatsApp и адрес.',
}

const GOAL_HINTS: Record<string, string> = {
  orders:    'Главная цель — получить заказ. Самые важные кнопки: whatsapp или telegram для связи, kaspi_pay для оплаты.',
  followers: 'Главная цель — набрать подписчиков. Самые важные кнопки: instagram, tiktok, telegram.',
  location:  'Главная цель — привести клиента в точку. Самые важные кнопки: twogis, phone. Обязательно указать адрес.',
  leads:     'Главная цель — собрать контакты. Самые важные кнопки: whatsapp, telegram, phone.',
  showcase:  'Главная цель — показать товары/услуги. Самые важные кнопки: kaspi_shop, website, instagram.',
}

function buildSystemPrompt(source: string, goal: string): string {
  return `
Ты — ИИ-ассистент сервиса tapni.kz (Казахстан). Создаёшь визитку на основе контекста бизнеса.

ИСТОЧНИК ТРАФИКА: ${SOURCE_HINTS[source] ?? SOURCE_HINTS.general}
ЦЕЛЬ СТРАНИЦЫ: ${GOAL_HINTS[goal] ?? GOAL_HINTS.orders}

КАЗАХСТАНСКИЙ КОНТЕКСТ:
- Главный мессенджер: WhatsApp
- Главный маркетплейс: Kaspi (kaspi_shop, kaspi_pay, kaspi_qr, ediny_qr)
- Главная карта: 2ГИС (twogis)
- Для пекарен/цветочных/салонов → тема light, акцент на WhatsApp + адрес
- Для IT/авто/ночных заведений → тема dark
- Для Kaspi-продавцов → тема seller + kaspi_shop обязательно

ДОСТУПНЫЕ icon_type: whatsapp, telegram, instagram, tiktok, youtube, kaspi, kaspi_pay, kaspi_shop, kaspi_qr, ediny_qr, twogis, website, phone, email, kolesa, krisha, vk, facebook, link, android, ios, paypal

ДОСТУПНЫЕ theme: dark, light, gradient, blogger, business, seller

ВЕРНИ ТОЛЬКО JSON (без markdown, без пояснений):
{
  "theme": "<valid theme>",
  "bio": "<1-2 предложения, до 120 символов, на русском>",
  "address": "<город/район или пустая строка>",
  "links": [
    { "icon_type": "<valid icon_type>", "title": "<название кнопки>", "url": "" }
  ]
}
Правила: минимум 2, максимум 5 кнопок. url всегда пустая строка "".
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkGenerateRate(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const body = await req.json()
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const source = typeof body.source === 'string' ? body.source : 'general'
    const goal   = typeof body.goal   === 'string' ? body.goal   : 'orders'

    if (prompt.length < 3) {
      return NextResponse.json({ error: 'prompt_too_short' }, { status: 400 })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) return NextResponse.json({ error: 'no_key' }, { status: 500 })

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        temperature: 0.5,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt(source, goal) },
          { role: 'user',   content: `Описание бизнеса: ${prompt.slice(0, 400)}` },
        ],
      }),
    })

    if (!groqRes.ok) {
      console.error('[generate] GROQ', groqRes.status)
      return NextResponse.json({ error: 'groq_error' }, { status: 502 })
    }

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content ?? '{}'

    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(raw) }
    catch { return NextResponse.json({ error: 'parse_error' }, { status: 502 }) }

    const theme   = VALID_THEMES.includes(parsed.theme as never) ? (parsed.theme as string) : 'dark'
    const bio     = typeof parsed.bio     === 'string' ? parsed.bio.slice(0, 160)    : ''
    const address = typeof parsed.address === 'string' ? parsed.address.slice(0, 80) : ''
    const rawLinks = Array.isArray(parsed.links) ? parsed.links : []
    const links = rawLinks
      .filter((l): l is Record<string, string> => !!l && typeof l === 'object')
      .map((l) => ({
        icon_type: VALID_ICONS.includes(l.icon_type as never) ? l.icon_type : 'link',
        title: typeof l.title === 'string' ? l.title.slice(0, 60) : '',
        url: '',
      }))
      .slice(0, 5)

    return NextResponse.json({ theme, bio, address, links })
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
