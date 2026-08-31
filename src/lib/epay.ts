// EPAY (Halyk Bank) — серверные хелперы: получение токена, ссылки на окружение.
// Документация: https://epayment.kz/ru/docs

const IS_PROD = process.env.EPAY_ENV === 'prod'

export const EPAY_URLS = IS_PROD
  ? {
      oauth: 'https://epay-oauth.homebank.kz/oauth2/token',
      api: 'https://epay-api.homebank.kz',
      formScript: 'https://epay.homebank.kz/payform/payment-api.js',
    }
  : {
      oauth: 'https://test-epay-oauth.epayment.kz/oauth2/token',
      api: 'https://test-epay-api.epayment.kz',
      formScript: 'https://test-epay.epayment.kz/payform/payment-api.js',
    }

function epayCreds() {
  const clientId = process.env.EPAY_CLIENT_ID
  const clientSecret = process.env.EPAY_CLIENT_SECRET
  const terminal = process.env.EPAY_TERMINAL_ID
  if (!clientId || !clientSecret || !terminal) {
    throw new Error('EPAY_CLIENT_ID / EPAY_CLIENT_SECRET / EPAY_TERMINAL_ID не настроены')
  }
  return { clientId, clientSecret, terminal }
}

export type EpayTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  token_type: string
}

/**
 * Токен для проведения оплаты — привязан к конкретному инвойсу.
 * EPAY требует новый токен под каждую операцию.
 */
export async function getEpayPaymentToken(opts: {
  invoiceId: string
  secretHash: string
  amount: number
  postLink: string
  failurePostLink?: string
}): Promise<EpayTokenResponse> {
  const { clientId, clientSecret, terminal } = epayCreds()
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'webapi usermanagement email_send verification statement statistics payment',
    client_id: clientId,
    client_secret: clientSecret,
    invoiceID: opts.invoiceId,
    secret_hash: opts.secretHash,
    amount: String(opts.amount),
    currency: 'KZT',
    terminal,
    postLink: opts.postLink,
    failurePostLink: opts.failurePostLink ?? opts.postLink,
  })

  const res = await fetch(EPAY_URLS.oauth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`EPAY token request failed: ${res.status} ${await res.text().catch(() => '')}`)
  }
  return res.json()
}

/**
 * Токен для сервисных запросов (например, проверки статуса транзакции) —
 * без привязки к конкретному инвойсу.
 */
export async function getEpayServiceToken(): Promise<EpayTokenResponse> {
  const { clientId, clientSecret, terminal } = epayCreds()
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'webapi usermanagement email_send verification statement statistics payment',
    client_id: clientId,
    client_secret: clientSecret,
    terminal,
  })

  const res = await fetch(EPAY_URLS.oauth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`EPAY service token request failed: ${res.status} ${await res.text().catch(() => '')}`)
  }
  return res.json()
}

export type EpayTransactionStatus = {
  resultCode: string
  resultMessage: string
  transaction: {
    invoiceID: string
    amount: number
    statusName: string
    cardMask: string
    reference: string
    approvalCode: string
  } | null
}

/** Проверка статуса транзакции по invoiceId — подстраховка, если postLink не дошёл. */
export async function checkEpayTransactionStatus(invoiceId: string): Promise<EpayTransactionStatus> {
  const { access_token } = await getEpayServiceToken()
  const res = await fetch(`${EPAY_URLS.api}/check-status/payment/transaction/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  return res.json()
}

/** Генерирует numeric invoiceId 6-15 цифр, достаточно уникальный для наших объёмов. */
export function generateEpayInvoiceId(): string {
  // 13 цифр: миллисекунды с эпохи (обрезаны) + 3 случайные цифры
  const ts = Date.now().toString().slice(-10)
  const rnd = Math.floor(Math.random() * 900 + 100) // 3 цифры
  return `${ts}${rnd}`
}

export function generateEpaySecretHash(): string {
  // crypto доступен в Node runtime Vercel по умолчанию
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
