// Turns what a person actually types into a URL we can store.
//
// Nobody types "https://" — they type "instagram.com/myshop". The rest of the
// app already accounts for that (see normalizeUrl in the dashboard's link
// form); the alias form did not, so a bare domain was rejected with a generic
// error and no hint about what was wrong.
//
// Returns null for anything that cannot be a safe http(s) destination, so the
// caller can report a specific reason rather than a blanket failure.

// A scheme is letters/digits/+/-/. followed by a colon, per RFC 3986.
const EXPLICIT_SCHEME = /^([a-z][a-z0-9+.-]*):/i

export function normalizeTargetUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (s.length > 2048) return null

  const scheme = s.match(EXPLICIT_SCHEME)
  let candidate: string
  if (scheme) {
    // An explicit scheme is honoured only if it's http(s). This is what keeps
    // javascript:, data: and file: out — prefixing them with https:// instead
    // would produce a URL that parses but means something else entirely.
    if (!/^https?$/i.test(scheme[1])) return null
    candidate = s
  } else {
    candidate = `https://${s}`
  }

  try {
    const u = new URL(candidate)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    // Requires a dot in the host, so a stray word like "shop" isn't silently
    // turned into https://shop — that would be a dead link, not a fix.
    if (!u.hostname.includes('.') || u.hostname.endsWith('.')) return null
    return u.toString()
  } catch {
    return null
  }
}
