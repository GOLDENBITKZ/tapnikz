import { activatePremium } from '@/lib/activate-premium'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return await request.json()
  const form = await request.formData()
  return Object.fromEntries(form.entries())
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>
  try {
    payload = await readPayload(request)
  } catch {
    return new Response('Invalid payload', { status: 400 })
  }

  const invoiceId = String(payload.invoiceId ?? payload.invoiceID ?? '')
  const code = String(payload.code ?? '').toLowerCase()
  const secretHash = String(payload.secret_hash ?? '')
  const amount = Number(payload.amount)
  if (!invoiceId || code !== 'ok' || !secretHash || !Number.isFinite(amount)) {
    return new Response('Invalid payment', { status: 400 })
  }

  const statusName = String(payload.statusName ?? '').toUpperCase()
  if (statusName && statusName !== 'CHARGE') return new Response('Payment is not charged', { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: payment, error } = await db.from('payments')
    .select('id, username, plan, amount, status, notes')
    .eq('provider', 'epay')
    .eq('transaction_id', invoiceId)
    .maybeSingle()

  if (error || !payment) return new Response('Payment not found', { status: 404 })
  if (payment.status === 'confirmed') return new Response('OK')
  if (payment.status !== 'pending') return new Response('Payment is not pending', { status: 400 })
  if (payment.amount !== amount || payment.notes !== `epay_secret:${secretHash}`) {
    return new Response('Payment verification failed', { status: 403 })
  }

  const result = await activatePremium({
    username: payment.username,
    plan: payment.plan,
    pendingPaymentId: payment.id,
    provider: 'epay',
    note: `EPAY invoice ${invoiceId}`,
  })
  if (!result.success) return new Response('Activation failed', { status: 500 })
  return new Response('OK')
}