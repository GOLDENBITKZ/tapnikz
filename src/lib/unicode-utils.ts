// Alias validation + hex-encoding for the alias-reservation feature
// (tapni.kz/{alias} and tapni.kz/tapni.kz/{alias}, same reservation).
//
// Runs in three environments: the /api/aliases Route Handler (Node),
// the [username]/page.tsx and tapni.kz/[slug]/page.tsx redirect lookups
// (Node), and the AliasChecker 'use client' debounce check (browser).
// Every one of them must compute the exact same alias_hex from the same
// input, so this file must stay dependency-free and avoid Node-only APIs
// (no `Buffer` — it's not polyfilled in client bundles; TextEncoder is
// the Web-standard equivalent and works identically in both places).

export type AliasKind = 'ascii' | 'symbol'

export type AliasClassification =
  | { ok: true; kind: AliasKind; normalized: string; hex: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'not_single_grapheme' | 'mixed_script' }

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
// /api/aliases as JSON is never percent-encoded, so it must NOT be run
// through this — decoding there would corrupt an alias containing a literal
// '%'. The try/catch covers exactly that case here too: a raw '%' that
// isn't valid percent-encoding makes decodeURIComponent throw URIError,
// and the raw value is the correct answer then.
export function decodeAliasParam(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}

const PRINTABLE_ASCII = /^[\x21-\x7E]+$/

// Homograph guard for the 'symbol' branch: a single grapheme cluster can
// never "mix scripts" (mixing requires 2+ characters, and this branch is
// only reached for exactly one), so checking for script-mixing here would
// never fire — verified empirically, "аpple" (Cyrillic а + Latin pple)
// never reaches this function at all because it's 5 graphemes and gets
// rejected by the not_single_grapheme check below first. The actual risk
// at 1-grapheme length is a single foreign LETTER that LOOKS like a Latin
// one — e.g. reserving tapni.kz/а (Cyrillic U+0430) to visually impersonate
// tapni.kz/a. Banning any codepoint in the Unicode Letter (\p{L}) or
// Number (\p{N}) category eliminates that whole class outright: genuine
// emoji/symbols (rocket, flags, ZWJ sequences, skin-tone modifiers) are
// category So/Sk/Cf, never L or N, so none of them are affected.
// Explicit exception: keycap sequences (0️⃣-9️⃣, #️⃣, *️⃣) are legitimate,
// common emoji whose base character (a digit, # or *) would otherwise be
// caught by the Number check.
const KEYCAP_SEQUENCE = /^[0-9#*]️?⃣$/
const LETTER_OR_NUMBER = /\p{L}|\p{N}/u

function looksLikeLetterOrDigit(normalized: string): boolean {
  if (KEYCAP_SEQUENCE.test(normalized)) return false
  return LETTER_OR_NUMBER.test(normalized)
}

// An alias is either a short pure-ASCII word, or exactly one emoji/symbol
// grapheme cluster — never a mix (e.g. "go🚀" is rejected: not pure-ASCII
// AND more than one grapheme). This keeps every alias visually unambiguous
// at a glance, which matters more here than for regular usernames since
// aliases are meant to be typed/recognized instantly.
export function classifyAlias(raw: string): AliasClassification {
  const normalized = raw.normalize('NFC').trim()
  if (!normalized) return { ok: false, reason: 'empty' }

  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
  const graphemes = Array.from(segmenter.segment(normalized), (s) => s.segment)

  if (PRINTABLE_ASCII.test(normalized)) {
    // Pure ASCII (\x21-\x7E) can only ever contain Latin letters/digits/
    // punctuation — no other script's characters fall in this byte range,
    // so there is no homograph risk to check for here at all.
    if (graphemes.length > 24) return { ok: false, reason: 'too_long' }
    const lower = normalized.toLowerCase()
    return { ok: true, kind: 'ascii', normalized: lower, hex: toAliasHex(lower) }
  }

  if (graphemes.length !== 1) return { ok: false, reason: 'not_single_grapheme' }
  if (looksLikeLetterOrDigit(normalized)) return { ok: false, reason: 'mixed_script' }
  return { ok: true, kind: 'symbol', normalized, hex: toAliasHex(normalized) }
}

export function isReservedWord(normalized: string): boolean {
  return RESERVED_ROUTE_WORDS.has(normalized)
}

// Consolidated from the two previously-duplicated, out-of-sync copies at
// src/app/auth/page.tsx and src/app/dashboard/page.tsx, merged with every
// real top-level route folder/file under src/app (confirmed via
// `find src/app -maxdepth 1 -mindepth 1`) — both call sites now import
// this instead of keeping their own list.
export const RESERVED_ROUTE_WORDS: ReadonlySet<string> = new Set([
  // system / auth / infra
  'auth', 'dashboard', 'pay', 'api', 'admin', 'tapni', 'tapni.kz', 'home', 'root',
  'login', 'register', 'about',
  // Next.js file-convention routes
  'sitemap.xml', 'robots.txt', 'favicon.ico', 'icon.svg', 'opengraph-image',
  'terms', 'privacy', 'oferta',
  // niche/landing pages
  'kaspi-prodavets', 'instagram-bloger', 'kafe-restoran', 'master-uslugi',
  'salon-krasoty', 'fotografy', 'fitness', 'nedvizhimost', 'avto', 'dostavka',
  'biznes-instagram', 'kaspi-magazin', 'kak-privlech-klientov',
  'prodazhi-instagram', 'prodazhi-kaspi', 'ssylka-v-bio',
  // city pages
  'almaty', 'astana', 'shymkent', 'aktobe', 'karaganda', 'atyrau',
  'kostanay', 'pavlodar', 'semey', 'taraz',
  // service/utility routes
  'discover', 'help', 'partners', 'go', 'qr', 'manager',
])
