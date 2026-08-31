import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { consumeRate } from '@/lib/rate-limit'
import { getEpayPaymentToken, generateEpayInvoiceId, generateEpaySecretHash, EPAY_URLS } from '@/lib/epay'

const SITE_URL = 'https://tapni.kz'

// 5 попыток создать платёж в час на пользователя — защищает от перебора/DoS
// на EPAY oauth и от мусора в таблице payments.
const CREATE_LIMIT = 5

type Body = { plan?: 'monthly' | 'annual' }

export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error: authErr } = await adminDb.auth.getUser(token)
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await adminDb.from('profiles').select('username').eq('id', user.id).maybeSingle()
  const username: string | undefined = prof?.username
  if (!username) return Response.json({ error: 'Profile not found' }, { status: 404 })

  if (!(await consumeRate(`epay_create:${username}`, CREATE_LIMIT, 3600))) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 })
  }

  let body: Body
  try { body = await request.json() } catch { body = {} }
  const plan: 'monthly' | 'annual' = body.plan === 'annual' ? 'annual' : 'monthly'
  const days = plan === 'annual' ? 365 : 30
  const amount = plan === 'annual' ? 10000 : 1000

  const invoiceId = generateEpayInvoiceId()
  const secretHash = generateEpaySecretHash()
  const postLink = `${SITE_URL}/api/payments/epay/webhook`

  // 1. Создаём pending-запись ДО обращения в EPAY, чтобы webhook нашёл её,
  //    даже если он придёт быстрее, чем мы вернём ответ клиенту.
  const { data: pmt, error: insertErr } = await adminDb.from('payments').insert({
    username,
    plan,
    amount,
    days,
    method: 'card',
    status: 'pending',
    provider: 'epay',
    epay_invoice_id: invoiceId,
    epay_secret_hash: secretHash,
  }).select('id').maybeSingle()

  if (insertErr || !pmt) {
    return Response.json({ error: 'Failed to create payment record' }, { status: 500 })
  }

  // 2. Получаем токен EPAY под этот инвойс
  try {
    const auth = await getEpayPaymentToken({
      invoiceId,
      secretHash,
      amount,
      postLink,
    })

    return Response.json({
      auth,
      invoiceId,
      amount,
      currency: 'KZT',
      terminal: process.env.EPAY_TERMINAL_ID,
      description: `Premium tapni.kz — ${plan === 'annual' ? 'год' : 'месяц'}`,
      scriptUrl: EPAY_URLS.formScript,
      postLink,
      backLink: `${SITE_URL}/pay?epay=success&invoiceId=${invoiceId}`,
      failureBackLink: `${SITE_URL}/pay?epay=fail&invoiceId=${invoiceId}`,
    })
  } catch (err) {
    // Токен не получен — откатываем pending-запись, чтобы не копить мусор
    await adminDb.from('payments').delete().eq('id', pmt.id).catch(() => {})
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[epay/create] token error', msg)
    return Response.json({ error: 'epay_unavailable' }, { status: 502 })
  }
}
