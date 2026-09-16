import { randomBytes } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const EPAY_SCOPE = 'webapi usermanagement email_send verification statement statistics payment'
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tapni.kz'

type Plan = 'monthly' | 'annual'

async function getUsername(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any
    const { data: { user }, error } = await db.auth.getUser(token)
    if (error || !user) return null
    const { data: profile } = await db.from('profiles').select('username').eq('id', user.id).maybeSingle()
    return profile?.username ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const username = await getUsername(request)
  if (!username) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.EPAY_CLIENT_ID
  const clientSecret = process.env.EPAY_CLIENT_SECRET
  const terminal = process.env.EPAY_TERMINAL
  if (!clientId || !clientSecret || !terminal) {
    return Response.json({ error: 'EPAY is not configured' }, { status: 503 })
  }

  let body: { plan?: Plan }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plan: Plan = body.plan === 'annual' ? 'annual' : 'monthly'
  const amount = plan === 'annual' ? 10000 : 1000
  const days = plan === 'annual' ? 365 : 30
  const mode = process.env.EPAY_MODE === 'test' ? 'test' : 'production'
  const invoiceId = `${Date.now().toString().slice(-11)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
  const secretHash = randomBytes(24).toString('hex')
  const postLink = `${APP_URL}/api/epay/postlink`
  const backLink = `${APP_URL}/pay?payment=success`
  const failureBackLink = `${APP_URL}/pay?payment=failed`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any

  const { data: payment, error: insertError } = await db.from('payments').insert({
    username,
    plan,
    amount,
    days,
    method: 'epay',
    status: 'pending',
    provider: 'epay',
    transaction_id: invoiceId,
    notes: `epay_secret:${secretHash}`,
  }).select('id').single()

  if (insertError || !payment) {
    return Response.json({ error: 'Could not create payment' }, { status: 500 })
  }

  const tokenResponse = await fetch(
    process.env.EPAY_MODE === 'test'
      ? 'https://test-epay-oauth.epayment.kz/oauth2/token'
      : 'https://epay-oauth.homebank.kz/oauth2/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: EPAY_SCOPE,
        client_id: clientId,
        client_secret: clientSecret,
        invoiceID: invoiceId,
        secret_hash: secretHash,
        amount: String(amount),
        currency: 'KZT',
        terminal,
        postLink,
        failurePostLink: postLink,
      }),
    },
  )

  if (!tokenResponse.ok) {
    await db.from('payments').update({ status: 'cancelled', notes: 'EPAY token request failed' }).eq('id', payment.id)
    return Response.json({ error: 'EPAY token request failed' }, { status: 502 })
  }

  const auth = await tokenResponse.json()
  return Response.json({
    auth,
    mode,
    payment: {
      invoiceId,
      backLink,
      failureBackLink,
      autoBackLink: true,
      postLink,
      failurePostLink: postLink,
      language: 'rus',
      description: `Tapni Premium ${plan === 'annual' ? 'годовая' : 'месячная'} подписка`,
      terminal,
      amount,
      currency: 'KZT',
    },
  })
}