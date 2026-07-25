// Alias validation, pricing-tier classification and hex-encoding for the
// alias-reservation feature (tapni.kz/{alias} and tapni.kz/tapni.kz/{alias},
// one reservation, two access URLs).
//
// Runs in three environments: the /api/aliases Route Handler (Node), the
// [username]/page.tsx and tapni.kz/[slug]/page.tsx redirect lookups (Node),
// and the AliasChecker 'use client' debounce check (browser). All of them
// must derive the same alias_hex and the same tier from the same input, so
// this file stays dependency-free and avoids Node-only APIs — no `Buffer`,
// which is not polyfilled in client bundles; TextEncoder is the Web-standard
// equivalent and behaves identically in both.

export type AliasCategory = 'single_emoji' | 'double_emoji' | 'custom'

export type AliasRejection =
  | 'empty'
  | 'too_long'
  | 'too_many_bytes'
  | 'non_ascii_letter'
  | 'mixed_script'
  | 'invalid_char'

export type AliasClassification =
  | { ok: true; category: AliasCategory; normalized: string; hex: string; graphemes: number }
  | { ok: false; reason: AliasRejection }

// Matches the 32-character ceiling on usernames, so an alias can be a
// readable name and not only a symbol.
export const MAX_ALIAS_GRAPHEMES = 32

// Graphemes alone are not a safe storage bound: one grapheme can be many
// bytes (🚀 is 4, 🇰🇿 is 8, a ZWJ family like 👨‍👩‍👧‍👦 is 25), so 32 of the last
// would be 800 bytes and a 1 600-character index key. This ceiling mirrors
// the DB CHECK on alias_hex (510 hex chars = 255 bytes). It is generous for
// every realistic alias — all 32 ASCII characters, or 63 simple emoji — and
// only binds on long chains of composite emoji.
export const MAX_ALIAS_BYTES = 255

export const CATEGORY_LABELS: Record<AliasCategory, { label: string; blurb: string }> = {
  single_emoji: { label: 'VIP Single Emoji', blurb: 'Один символ — самый редкий формат, около 1 800 на весь сервис' },
  double_emoji: { label: 'Double Emoji', blurb: 'Два символа — примерно 3,2 млн сочетаний' },
  custom: { label: 'Combo / Custom', blurb: 'Текст, эмодзи или их сочетание — до 32 символов' },
}

// UTF-8 hex of the string — exact-byte lookup key, immune to normalization
// drift between environments. Works unmodified for multi-codepoint emoji
// (ZWJ sequences, flags, skin-tone modifiers) since it just encodes bytes.
export function toAliasHex(s: string): string {
  const bytes = new TextEncoder().encode(s)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Next.js hands non-ASCII dynamic route params to the page STILL
// percent-encoded — /tapni.kz/🚀 arrives as the literal 12-char string
// "%F0%9F%9A%80", not "🚀" (verified against production: an alias stored
// under hex("%F0%9F%9A%80") resolved while hex("🚀") 404'd). So the two
// redirect routes must decode before hashing, or every emoji alias misses.
//
// Only for route params. Input typed into AliasChecker and posted to
// /api/aliases as JSON is never percent-encoded and must NOT be run through
// this — decoding there would corrupt an alias containing a literal '%'.
// The try/catch covers exactly that case here too: a raw '%' that isn't
// valid percent-encoding makes decodeURIComponent throw URIError, and the
// raw value is the correct answer then.
export function decodeAliasParam(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}

const PRINTABLE_ASCII_CHAR = /^[\x21-\x7E]$/
// Anything in the Unicode Letter or Number categories. Emoji and symbols are
// categories So/Sk/Cf and never match, so this cleanly separates "writing"
// from "pictograph".
const LETTER_OR_NUMBER = /\p{L}|\p{N}/u
// Keycap sequences (0️⃣-9️⃣, #️⃣, *️⃣) are legitimate, widely-used emoji whose
// base character is a digit, # or * — they'd otherwise trip the Number check.
const KEYCAP_SEQUENCE = /^[0-9#*]️?⃣$/

function segmentGraphemes(s: string): string[] {
  return Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s), (g) => g.segment)
}

// Homograph defence.
//
// The naive version of this check looks for *mixed* scripts, but that alone
// is not enough here: a one-grapheme alias cannot mix anything, so a lone
// Cyrillic "а" impersonating Latin "a" would sail through. Rather than
// enumerate confusable pairs (an endless list), reject every letter and
// digit that is not plain ASCII. That removes the entire class of
// look-alike-writing attacks in one rule, while leaving genuine emoji and
// symbols — the actual product here — completely untouched.
//
// The trade-off, stated plainly: aliases cannot contain Cyrillic or other
// non-Latin text. Latin text (ASCII) and any emoji/symbol are both fine, as
// are combinations of the two, e.g. "go🚀".
function hasNonAsciiLetterOrNumber(graphemes: string[]): boolean {
  for (const g of graphemes) {
    if (KEYCAP_SEQUENCE.test(g)) continue
    for (const ch of g) {
      if (PRINTABLE_ASCII_CHAR.test(ch)) continue
      if (LETTER_OR_NUMBER.test(ch)) return true
    }
  }
  return false
}

// Whitespace, control characters and invisible formatting characters would
// produce URLs that are impossible to type, verify or share reliably — and
// invisibles are a spoofing vector in their own right (two aliases that look
// identical but differ in bytes). U+200D (zero-width joiner) is explicitly
// allowed: it is what binds ZWJ emoji sequences like a family emoji together.
const ZERO_WIDTH_JOINER = /\u200D/g
const ILLEGAL_INVISIBLE = /[\s\u0000-\u001F\u007F\u00AD\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\uFEFF]/
function hasIllegalWhitespaceOrControl(s: string): boolean {
  return ILLEGAL_INVISIBLE.test(s.replace(ZERO_WIDTH_JOINER, ''))
}

function isPictographic(grapheme: string): boolean {
  if (KEYCAP_SEQUENCE.test(grapheme)) return true
  for (const ch of grapheme) {
    if (PRINTABLE_ASCII_CHAR.test(ch)) return false
    if (LETTER_OR_NUMBER.test(ch)) return false
  }
  return true
}

// Tier is derived here and only here, then trusted by the API — the client
// never gets to declare its own category, or it could claim the cheap tier
// for a VIP single emoji.
export function classifyAlias(raw: string): AliasClassification {
  const normalized = raw.normalize('NFC').trim()
  if (!normalized) return { ok: false, reason: 'empty' }
  if (hasIllegalWhitespaceOrControl(normalized)) return { ok: false, reason: 'invalid_char' }

  const graphemes = segmentGraphemes(normalized)
  if (graphemes.length > MAX_ALIAS_GRAPHEMES) return { ok: false, reason: 'too_long' }

  if (hasNonAsciiLetterOrNumber(graphemes)) return { ok: false, reason: 'non_ascii_letter' }

  // Lowercase only the ASCII half, so "GO🚀" and "go🚀" are the same
  // reservation while emoji are left byte-identical.
  const folded = normalized.replace(/[A-Z]/g, (c) => c.toLowerCase())
  const foldedGraphemes = segmentGraphemes(folded)

  // Checked after folding, against the same string that gets hex-encoded and
  // stored, so this can never disagree with the DB CHECK on alias_hex.
  const hex = toAliasHex(folded)
  if (hex.length > MAX_ALIAS_BYTES * 2) return { ok: false, reason: 'too_many_bytes' }

  const allPictographic = foldedGraphemes.every(isPictographic)
  let category: AliasCategory = 'custom'
  if (allPictographic && foldedGraphemes.length === 1) category = 'single_emoji'
  else if (allPictographic && foldedGraphemes.length === 2) category = 'double_emoji'

  return {
    ok: true,
    category,
    normalized: folded,
    hex,
    graphemes: foldedGraphemes.length,
  }
}

export function isReservedWord(normalized: string): boolean {
  return RESERVED_ROUTE_WORDS.has(normalized)
}

// Consolidated from the two previously-duplicated, out-of-sync copies at
// src/app/auth/page.tsx and src/app/dashboard/page.tsx, merged with every
// real top-level route folder/file under src/app (confirmed via
// `find src/app -maxdepth 1 -mindepth 1`) — both call sites import this
// instead of keeping their own list. Also guards brand/payment terms that
// would be misleading in a redirect URL.
export const RESERVED_ROUTE_WORDS: ReadonlySet<string> = new Set([
  // system / auth / infra
  'auth', 'dashboard', 'pay', 'api', 'admin', 'tapni', 'tapni.kz', 'home', 'root',
  'login', 'register', 'signup', 'signin', 'logout', 'about', 'settings', 'account',
  'profile', 'user', 'users', 'static', 'public', 'assets', 'www', 'mail', 'support',
  // Next.js file-convention routes
  'sitemap.xml', 'robots.txt', 'favicon.ico', 'icon.svg', 'opengraph-image',
  'terms', 'privacy', 'oferta',
  // payment / bank terms — must never be impersonated by a redirect
  'kaspi', 'kaspi-pay', 'kaspipay', 'kaspi-magazin', 'halyk', 'bank', 'jusan',
  'forte', 'freedom', 'bereke', 'egov', '2gis', 'twogis',
  // niche/landing pages
  'kaspi-prodavets', 'instagram-bloger', 'kafe-restoran', 'master-uslugi',
  'salon-krasoty', 'fotografy', 'fitness', 'nedvizhimost', 'avto', 'dostavka',
  'biznes-instagram', 'kak-privlech-klientov',
  'prodazhi-instagram', 'prodazhi-kaspi', 'ssylka-v-bio',
  // city pages
  'almaty', 'astana', 'shymkent', 'aktobe', 'karaganda', 'atyrau',
  'kostanay', 'pavlodar', 'semey', 'taraz',
  // service/utility routes
  'discover', 'help', 'partners', 'go', 'qr', 'manager',
])
