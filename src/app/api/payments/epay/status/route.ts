import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { activatePremium } from '@/lib/activate-premium'
import { checkEpayTransactionStatus } from '@/lib/epay'
import { consumeRate } from '@/lib/rate-limit'

// Фронтенд поллит этот эндпоинт максимум несколько раз после возврата с
// платёжной страницы — 20/час с запасом на повторные вкладки/ретраи сети.
const STATUS_LIMIT = 20

export async function GET(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('invoiceId')
  if (!invoiceId) return Response.json({ error: 'invoiceId required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error: authErr } = await adminDb.auth.getUser(token)
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await adminDb.from('profiles').select('username').eq('id', user.id).maybeSingle()
  const username: string | undefined = prof?.username
  if (!username) return Response.json({ error: 'Profile not found' }, { status: 404 })

  if (!(await consumeRate(`epay_status:${username}`, STATUS_LIMIT, 3600))) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 })
  }

  const { data: pmt } = await adminDb
    .from('payments')
    .select('id, status, plan, username')
    .eq('epay_invoice_id', invoiceId)
    .maybeSingle()

  if (!pmt || pmt.username !== username) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  if (pmt.status === 'confirmed') return Response.json({ status: 'confirmed' })
  if (pmt.status === 'cancelled') return Response.json({ status: 'cancelled' })

  // Всё ещё pending — вебхук мог не дойти. Спрашиваем EPAY напрямую.
  try {
    const check = await checkEpayTransactionStatus(invoiceId)
    const statusName = check.transaction?.statusName

    if (check.resultCode === '100' && statusName === 'CHARGE') {
      const plan: 'monthly' | 'annual' = pmt.plan === 'annual' ? 'annual' : 'monthly'
      const result = await activatePremium({
        username,
        plan,
        pendingPaymentId: pmt.id,
        provider: 'epay',
        note: `EPAY подтверждён через check-status (ref ${check.transaction?.reference ?? ''})`,
      })
      return Response.json({ status: result.success ? 'confirmed' : 'pending' })
    }

    if (statusName === 'FAILED' || statusName === 'REJECT' || check.resultCode === '101') {
      await adminDb.from('payments').update({
        status: 'cancelled',
        notes: `EPAY check-status: ${statusName ?? check.resultMessage}`,
      }).eq('id', pmt.id).eq('status', 'pending')
      return Response.json({ status: 'cancelled' })
    }

    return Response.json({ status: 'pending' })
  } catch (err) {
    console.error('[epay/status] check-status failed', err)
    return Response.json({ status: 'pending' })
  }
}
