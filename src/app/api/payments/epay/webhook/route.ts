import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { activatePremium } from '@/lib/activate-premium'
import { sendTelegram, adminChatId } from '@/lib/telegram'

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Постоянное по времени сравнение — чтобы не давать возможность подобрать
// secret_hash по разнице во времени ответа.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

type EpayPostLink = {
  code?: string
  reason?: string
  reasonCode?: number
  invoiceId?: string
  amount?: number
  currency?: string
  approvalCode?: string
  cardMask?: string
  cardType?: string
  reference?: string
  secret_hash?: string
  terminal?: string
}

async function parseBody(request: Request): Promise<EpayPostLink> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try { return await request.json() } catch { return {} }
  }
  try {
    const form = await request.formData()
    const obj: Record<string, string> = {}
    for (const [k, v] of form.entries()) obj[k] = String(v)
    return obj as EpayPostLink
  } catch {
    // last resort — try JSON anyway (some providers send text/plain JSON)
    try { return JSON.parse(await request.text()) } catch { return {} }
  }
}

export async function POST(request: Request) {
  const payload = await parseBody(request)
  const invoiceId = payload.invoiceId
  const receivedHash = payload.secret_hash

  if (!invoiceId || !receivedHash) {
    // Не наш формат запроса — отвечаем 200, чтобы EPAY не долбил ретраями
    return Response.json({ ok: true })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: pmt, error: findErr } = await adminDb
    .from('payments')
    .select('id, username, plan, status, epay_secret_hash')
    .eq('epay_invoice_id', invoiceId)
    .maybeSingle()

  if (findErr) {
    // Транзиентная ошибка БД — просим EPAY повторить попытку позже
    return Response.json({ error: 'db_error' }, { status: 500 })
  }
  if (!pmt) {
    // Неизвестный invoiceId — ничего не подтверждаем
    return Response.json({ ok: true })
  }

  if (!pmt.epay_secret_hash || !safeEqual(pmt.epay_secret_hash, receivedHash)) {
    console.error('[epay/webhook] secret_hash mismatch for invoice', invoiceId)
    await sendTelegram(adminChatId(), `⚠️ EPAY webhook: неверный secret_hash для invoice ${esc(invoiceId)}`)
    return Response.json({ ok: true })
  }

  // Уже обработан ранее (EPAY может слать postLink повторно) — идемпотентно ок
  if (pmt.status !== 'pending') {
    return Response.json({ ok: true })
  }

  if (payload.code === 'ok') {
    const plan: 'monthly' | 'annual' = pmt.plan === 'annual' ? 'annual' : 'monthly'
    const result = await activatePremium({
      username: pmt.username,
      plan,
      pendingPaymentId: pmt.id,
      provider: 'epay',
      note: `EPAY ref ${payload.reference ?? ''} · карта ${payload.cardMask ?? ''} · approval ${payload.approvalCode ?? ''}`.trim(),
    })
    if (!result.success) {
      console.error('[epay/webhook] activatePremium failed', result.error)
      await sendTelegram(adminChatId(), `⚠️ EPAY: оплата @${esc(pmt.username)} прошла, но активация Premium не удалась: ${esc(result.error)}`)
      // Возвращаем 500, чтобы EPAY (и наш /status фолбэк) могли повторить попытку
      return Response.json({ error: 'activation_failed' }, { status: 500 })
    }
  } else {
    await adminDb.from('payments').update({
      status: 'cancelled',
      notes: `EPAY отказ: ${payload.reason ?? 'unknown'} (code ${payload.reasonCode ?? '?'})`,
    }).eq('id', pmt.id).eq('status', 'pending')
  }

  return Response.json({ ok: true })
}
