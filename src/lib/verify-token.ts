import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Deep-link token carrying "which account is being verified" from the website
 * into a Telegram chat.
 *
 * The bot could match on the shared phone number alone — it does today — but
 * that only works while the two numbers agree. The whole point of this flow is
 * the case where they do not: Telegram hands over a number verified by SMS, and
 * to offer the owner a correction we have to know which profile they were
 * sitting in front of when they started.
 *
 * Signed rather than random so nothing has to be stored: the token proves the
 * site issued it, and Telegram start payloads are limited to 64 characters,
 * which a signed id fits and a UUID plus signature does not.
 */

const WINDOW_MS = 60 * 60 * 1000  // rolling hour
const PREFIX = 'v'

function sign(profileId: string, w: number): string {
  const key = process.env.VCARD_SECRET
  if (!key) throw new Error('VCARD_SECRET env var is not set')
  return createHmac('sha256', key).update(`verify:${profileId}:${w}`).digest('base64url').slice(0, 12)
}

/** Compact id: the profile UUID without dashes, plus a signature. */
export function makeVerifyToken(profileId: string): string {
  try {
    const w = Math.floor(Date.now() / WINDOW_MS)
    return `${PREFIX}${profileId.replace(/-/g, '')}${sign(profileId, w)}`
  } catch {
    return ''
  }
}

/** Returns the profile id when the token is genuine and still inside its
 *  window, otherwise null. Accepts the previous window so a token issued at
 *  59 minutes past does not expire while the user is switching apps. */
export function readVerifyToken(token: string): string | null {
  if (!token.startsWith(PREFIX)) return null
  const body = token.slice(PREFIX.length)
  if (body.length !== 32 + 12) return null

  const hex = body.slice(0, 32)
  if (!/^[0-9a-f]{32}$/i.test(hex)) return null
  const supplied = body.slice(32)

  const profileId = [
    hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20),
  ].join('-')

  try {
    const w = Math.floor(Date.now() / WINDOW_MS)
    for (const candidate of [sign(profileId, w), sign(profileId, w - 1)]) {
      const a = Buffer.from(candidate)
      const b = Buffer.from(supplied)
      if (a.length === b.length && timingSafeEqual(a, b)) return profileId
    }
  } catch { /* secret missing — treated as an invalid token */ }

  return null
}
