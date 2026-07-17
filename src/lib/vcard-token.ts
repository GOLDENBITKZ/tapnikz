import { createHmac } from 'crypto'

function hash(username: string, w: number): string {
  const key = process.env.VCARD_SECRET
  if (!key) throw new Error('VCARD_SECRET env var is not set')
  return createHmac('sha256', key).update(`vcard:${username}:${w}`).digest('hex').slice(0, 16)
}

// 30-minute rolling windows
const WINDOW_MS = 30 * 60 * 1000

export function makeVcardToken(username: string): string {
  try {
    return hash(username, Math.floor(Date.now() / WINDOW_MS))
  } catch {
    return ''
  }
}

export function verifyVcardToken(username: string, token: string): boolean {
  try {
    const w = Math.floor(Date.now() / WINDOW_MS)
    return token === hash(username, w) || token === hash(username, w - 1)
  } catch {
    return false
  }
}
