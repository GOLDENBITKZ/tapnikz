import { NextRequest, NextResponse } from 'next/server'
import { sanitizeCopy } from '@/lib/page-copy'

// This route previously generated page *structure* — a theme and a list of
// buttons, every one with url: "". Nothing ever called it, and the reason is
// visible in that contract: it produced a page of dead buttons the owner still
// had to fill in by hand. It now generates the part a model can actually
// supply — the words — while URLs stay with the person who knows them.

// Per-IP cap on generations/hour. This endpoint is reachable from the landing
// page without an account, so it is the only thing between a bored visitor and
// the GROQ bill.
//
// Counted at the point of calling GROQ, not on arrival. Charging for rejected
// requests looked reasonable until it was tested: a typo returning
// prompt_too_short, and a malformed body, each burned quota before anything was
// generated — five fumbles and a visitor is locked out for an hour having never
// seen the feature work. Only calls that actually cost money count.
const GENERATE_LIMIT = 10
const generateRateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const entry = generateRateMap.get(ip)
  if (!entry || Date.now() > entry.resetAt) return false
  return entry.count >= GENERATE_LIMIT
}

function recordGeneration(ip: string): void {
  const now = Date.now()
  const entry = generateRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    if (generateRateMap.size > 500) {
      for (const [k, v] of generateRateMap) { if (now > v.resetAt) generateRateMap.delete(k) }
    }
    generateRateMap.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return
  }
  entry.count++
}

/** Give the slot back when the generation failed: nothing was produced and
 *  nothing was billed, so charging the visitor for it is just a smaller cap. */
function refundGeneration(ip: string): void {
  const entry = generateRateMap.get(ip)
  if (entry && Date.now() <= entry.resetAt && entry.count > 0) entry.count--
}

// Checked against live GROQ output before shipping. Three rules earned their
// place by fixing failures seen in testing, not by sounding sensible:
//
//   Voice. wa_preset_text is the message the *client* sends, so it has to be in
//   the client's first person. Left unstated, the model wrote it as the owner
//   ("Привет! Хочешь попробовать мой визаж? Я приеду к тебе") in two of three
//   samples — a message that makes no sense coming from the person tapping it.
//
//   Kaspi. Unprompted, that button came back as the service name ("Ремонт
//   телефонов") rather than a payment call, which wastes the one button that
//   makes this market different.
//
//   Invention. The model volunteered prices ("От 3 000 тг"), discounts ("скидка
//   15%"), opening hours ("круглосуточно"), services nobody mentioned and a city
//   for a tutor who only said "онлайн". This is a public business page: an
//   invented discount is a false promise to a real customer.
const SYSTEM_PROMPT = `
Ты — микро-модуль маркетинговой авто-настройки для казахстанского сервиса tapni.kz.
Превращаешь описание бизнеса в готовую продающую структуру визитки.

ПРАВИЛА:
1. Отвечай ТОЛЬКО чистым JSON. Без вводных слов, пояснений и Markdown.
2. Язык контекста Казахстана: WhatsApp, Kaspi, 2ГИС, простые формулировки.
3. Каждое поле — не более 10-12 слов.
4. Всегда обращение на «вы». Не смешивай «ты» и «вы».
5. Только существующие русские слова. Не выдумывай названия профессий.

НИЧЕГО НЕ ВЫДУМЫВАЙ. Это публичная страница бизнеса — выдуманное станет ложным обещанием клиентам.
Запрещено добавлять то, чего нет во вводных: цены и суммы, скидки и проценты,
часы работы, сроки, гарантии, город, услуги. Если город не назван — не подставляй его.
Продавай выгодой и понятным призывом, а не придуманными цифрами.

НЕ ПЕРЕВОРАЧИВАЙ СМЫСЛ. Кто к кому едет — это разные услуги:
- «принимаю у себя», «работаю на дому», «свой салон», «мой кабинет» — клиент приходит к владельцу. Это НЕ выезд, писать «выезд на дом» запрещено.
- «выезжаю», «на выезд», «с доставкой», «приеду» — владелец едет к клиенту.
Если во вводных этого нет — не пиши ни то, ни другое.

ЧЕЙ ЭТО ГОЛОС — не перепутай:
- title, bio, wa_button, kaspi_button, offer_button — пишет ВЛАДЕЛЕЦ бизнеса для своих клиентов.
- wa_preset_text — пишет КЛИЕНТ владельцу. Это текст, который подставится в WhatsApp клиенту, когда он нажмёт кнопку. Всегда от первого лица клиента: «Здравствуйте! Хочу...». НИКОГДА не от лица бизнеса.

bio — конкретная выгода для клиента, а не общие слова.
Слова «качественно», «профессионально», «надёжно» запрещены: они ничего не сообщают.
Пиши, что человек получит и чем это удобно.

ОБЯЗАТЕЛЬНО:
- kaspi_button — всегда про оплату или предоплату через Kaspi, а не название услуги.
- offer_button — прайс, каталог, портфолио или меню. Выбери что уместнее бизнесу.
- title — профессия или услуга. Если город назван во вводных, он ОБЯЗАН быть в title.

ФОРМАТ:
{"title":"...","bio":"...","wa_button":"...","wa_preset_text":"...","kaspi_button":"...","offer_button":"..."}

ЭТАЛОННЫЙ ПРИМЕР.
Вход: «Я визажист в Астане, делаю макияж на выезд»
Выход: {"title":"Визажист Астана | Выезд на дом","bio":"Стойкий макияж и причёски с выездом к вам","wa_button":"Записаться на макияж (WhatsApp)","wa_preset_text":"Здравствуйте! Хочу узнать свободные даты и записаться на макияж.","kaspi_button":"Внести предоплату через Kaspi","offer_button":"Посмотреть прайс и портфолио"}
`.trim()

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    let body: { prompt?: unknown }
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (prompt.length < 3) {
      return NextResponse.json({ error: 'prompt_too_short' }, { status: 400 })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      console.error('[generate] GROQ_API_KEY missing')
      return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    }

    // Landing-page latency budget: the visitor is watching a spinner, so a slow
    // generation is worse than none.
    const controller = new AbortController()
    const abortTimer = setTimeout(() => controller.abort(), 12_000)

    recordGeneration(ip)

    let groqRes: Response
    try {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          // 8b-instant was tried first and could not hold the rules: it invented
          // guarantees the business never offered, coined non-words ("Власико"
          // as a hairdresser's tagline), and inverted the service — a barber who
          // said "принимаю у себя дома" was advertised as "Выезд на дом", which
          // earns him calls he cannot serve. 70b holds all of it and answers in
          // ~600ms, comfortably inside a landing page's budget.
          model: 'llama-3.3-70b-versatile',
          // 0.6 padded pages with invented prices and discounts; 0.4 on the
          // larger model went flat ("Качественный ремонт обуви"). 0.5 keeps the
          // copy concrete without it starting to make things up.
          temperature: 0.5,
          max_tokens: 400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Описание бизнеса: ${prompt.slice(0, 300)}` },
          ],
        }),
      })
    } catch {
      refundGeneration(ip)
      return NextResponse.json({ error: 'timeout' }, { status: 504 })
    } finally {
      clearTimeout(abortTimer)
    }

    if (!groqRes.ok) {
      console.error('[generate] GROQ', groqRes.status)
      refundGeneration(ip)
      // GROQ's own 429 means the shared account is briefly saturated, not that
      // this visitor did anything wrong — worth saying so, because "try again"
      // is genuinely the right advice here and wrong for a real fault.
      return groqRes.status === 429
        ? NextResponse.json({ error: 'busy' }, { status: 503 })
        : NextResponse.json({ error: 'upstream' }, { status: 502 })
    }

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content ?? '{}'

    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch {
      refundGeneration(ip)
      return NextResponse.json({ error: 'parse_error' }, { status: 502 })
    }

    // All six fields or nothing: a half-filled page is worse than the form the
    // visitor already had, and the caller would have to special-case each gap.
    const copy = sanitizeCopy(parsed)
    if (!copy) {
      console.error('[generate] incomplete copy', raw.slice(0, 200))
      refundGeneration(ip)
      return NextResponse.json({ error: 'incomplete' }, { status: 502 })
    }

    return NextResponse.json(copy)
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
