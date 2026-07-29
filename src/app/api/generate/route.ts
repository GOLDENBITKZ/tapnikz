import { NextRequest, NextResponse } from 'next/server'
import { sanitizeCopy, type PageCopy } from '@/lib/page-copy'
import { clientIp, consumeRate, refundRate } from '@/lib/rate-limit'

// This route previously generated page *structure* — a theme and a list of
// buttons, every one with url: "". Nothing ever called it, and the reason is
// visible in that contract: it produced a page of dead buttons the owner still
// had to fill in by hand. It now generates the part a model can actually
// supply — the words — while URLs stay with the person who knows them.

// Per-IP cap on generations/hour. This endpoint is reachable from the landing
// page without an account, so it is the only thing between a bored visitor and
// the GROQ bill.
//
// Counted when GROQ is actually called, not on arrival. Charging for rejected
// requests looked reasonable until it was tested: a typo returning
// prompt_too_short, and a malformed body, each burned quota before anything was
// generated — five fumbles and a visitor is locked out for an hour having never
// seen the feature work.
const GENERATE_LIMIT = 10
const GENERATE_WINDOW = 3600

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

// The prompt asks for these; the model complies most of the time, which is not
// the same as complying. Production returned "Срочный и качественный ремонт
// обуви у вас дома" for the bare input "Ремонт обуви Павлодар" — a banned word
// and a home-visit service invented out of nothing — while the identical input
// had passed minutes earlier. A rule that holds only sometimes needs enforcing
// where it cannot be argued with.

// Claims that the owner travels to the customer, or the customer is served at
// home. Publishing one of these unasked hands a business promises it never made.
const TRAVEL_CLAIM = /(на дом|на дому|у вас дома|выезд|выезжа|с доставкой|доставка|приеду|приедем)/i
// Licences the above: if the description mentions any of it, the claim is the
// owner's own and the prompt's direction rules decide how it is phrased.
// Stems, not whole words: "выезжаю" in a description has to licence "выезд" in
// the output, and an earlier version listing only "выезд" flagged a masseur who
// had said plainly that he travels.
const TRAVEL_HINT = /(дом|выезж|выезд|достав|приед|приезж|прием|принима|салон|кабинет|офис|студи)/i
// Filler that occupies a bio without telling anyone anything.
const EMPTY_PRAISE = /(качественн|профессиональн|надёжн|надежн)/i

/** Reason the copy is unusable, or null when it passes. */
function copyViolation(copy: PageCopy, prompt: string): string | null {
  const prose = `${copy.title} ${copy.bio}`
  if (TRAVEL_CLAIM.test(prose) && !TRAVEL_HINT.test(prompt)) return 'travel_claim'
  if (EMPTY_PRAISE.test(copy.bio)) return 'empty_praise'
  return null
}

type AttemptResult =
  | { ok: true; copy: PageCopy }
  | { ok: false; error: string; status: number }

/** One GROQ round trip. `correction` is appended on a retry to name the rule
 *  that was broken — a generic "try again" reliably breaks it the same way. */
async function attempt(groqKey: string, prompt: string, correction?: string): Promise<AttemptResult> {
  // Landing-page latency budget: the visitor is watching a spinner, so a slow
  // generation is worse than none. Halved for the retry so a correction cannot
  // push the total past what the first call was allowed on its own.
  const controller = new AbortController()
  const abortTimer = setTimeout(() => controller.abort(), correction ? 6_000 : 12_000)

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
          {
            role: 'user',
            content: `Описание бизнеса: ${prompt.slice(0, 300)}${correction ? `\n\n${correction}` : ''}`,
          },
        ],
      }),
    })
  } catch {
    return { ok: false, error: 'timeout', status: 504 }
  } finally {
    clearTimeout(abortTimer)
  }

  if (!res.ok) {
    console.error('[generate] GROQ', res.status)
    // GROQ's own 429 means the shared account is briefly saturated, not that
    // this visitor did anything wrong — worth saying so, because "try again"
    // is genuinely the right advice here and wrong for a real fault.
    return res.status === 429
      ? { ok: false, error: 'busy', status: 503 }
      : { ok: false, error: 'upstream', status: 502 }
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? '{}'

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch {
    return { ok: false, error: 'parse_error', status: 502 }
  }

  // All six fields or nothing: a half-filled page is worse than the form the
  // visitor already had, and the caller would have to special-case each gap.
  const copy = sanitizeCopy(parsed)
  if (!copy) {
    console.error('[generate] incomplete copy', raw.slice(0, 200))
    return { ok: false, error: 'incomplete', status: 502 }
  }

  return { ok: true, copy }
}

// Quoting the rejected line back is the part that works. A correction that only
// restates the rule gets ignored about as often as the rule itself did — the
// model has to see which of its own words was the problem.
const CORRECTIONS: Record<string, (bad: string) => string> = {
  travel_claim: (bad) =>
    `Твой прошлый ответ отклонён. Ты написал: «${bad}». В описании бизнеса нет ни выезда, ни доставки, ни работы на дому — ты это выдумал. Перепиши bio и title, не упоминая выезд, доставку и дом.`,
  empty_praise: (bad) =>
    `Твой прошлый ответ отклонён. Ты написал: «${bad}». Слова «качественный», «профессиональный», «надёжный» запрещены — они ничего не сообщают клиенту. Перепиши bio: что человек получит и чем это удобно.`,
}

// Two corrections, then take what we get. One was not enough: "качественный" is
// a strong enough habit in Russian ad copy to survive a single reminder, and it
// came back in one run out of five. A third round would cost more latency than
// the difference is worth on text the visitor edits anyway.
const MAX_CORRECTIONS = 2

export async function POST(req: NextRequest) {
  try {
    const rateKey = `generate:${clientIp(req)}`

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

    if (!(await consumeRate(rateKey, GENERATE_LIMIT, GENERATE_WINDOW))) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    let result = await attempt(groqKey, prompt)
    if (!result.ok) {
      await refundRate(rateKey)
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Corrections never fail the request: if the model will not comply, copy
    // the visitor can edit still beats making them stare at an error.
    for (let i = 0; i < MAX_CORRECTIONS; i++) {
      const violation = copyViolation(result.copy, prompt)
      if (!violation) break
      console.warn('[generate] retrying —', violation)
      const retry = await attempt(groqKey, prompt, CORRECTIONS[violation](result.copy.bio))
      if (!retry.ok) break
      result = retry
    }

    return NextResponse.json(result.copy)
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
