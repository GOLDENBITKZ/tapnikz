import { classifyAlias } from '../src/lib/unicode-utils.ts'
import { writeFileSync } from 'node:fs'

const VS16 = '️'
const seen = new Set()
const items = []

function add(ch) {
  if (seen.has(ch)) return
  seen.add(ch)
  items.push(ch)
}

// Property tests must run on the whole codepoint: ch[0] of a surrogate pair
// is only the high surrogate and matches nothing.
const firstCp = (s) => String.fromCodePoint(s.codePointAt(0))

// Assigned AND Emoji together are what separate a real, renderable emoji from
// the two things that otherwise slip through:
//   • unassigned codepoints inside ranges Unicode reserves for future emoji
//     (🣵 🩘 🫇) — these draw as tofu boxes;
//   • assigned pictographs that are not emoji at all, like the alchemical
//     symbols block (🜀).
const isRealEmoji = (ch) => {
  const c = firstCp(ch)
  return /\p{Assigned}/u.test(c) && /\p{Emoji}/u.test(c)
}

// Skin-tone modifiers render as bare colour swatches on their own.
const isModifier = (cp) => cp >= 0x1F3FB && cp <= 0x1F3FF

// 1. Default-colour emoji (no variation selector needed).
for (let cp = 0x20; cp <= 0x1FBFF; cp++) {
  if (cp >= 0x1F1E6 && cp <= 0x1F1FF) continue // regional indicators: only useful in pairs
  if (isModifier(cp)) continue
  const ch = String.fromCodePoint(cp)
  if (/\p{Emoji_Presentation}/u.test(ch) && isRealEmoji(ch)) add(ch)
}

// 2. Text-default emoji need VS16 to render in colour (❤️ ☀️ ⚠️ …).
for (let cp = 0x20; cp <= 0x1FBFF; cp++) {
  if (isModifier(cp)) continue
  const ch = String.fromCodePoint(cp)
  if (/\p{Emoji}/u.test(ch) && !/\p{Emoji_Presentation}/u.test(ch) && isRealEmoji(ch)) {
    add(ch + VS16)
  }
}

// 3. Keycaps.
for (const base of ['0','1','2','3','4','5','6','7','8','9','#','*']) add(base + VS16 + '\u20E3')

// 4. Country flags, built from regional-indicator pairs. Kazakhstan first —
//    this is a Kazakhstan-market product.
const RI = (c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
const FLAG_CODES = ['KZ','RU','UZ','KG','TJ','TM','AZ','GE','AM','BY','UA','TR','CN','US','GB','DE','FR','IT','ES','AE','SA','KR','JP','IN','PL','CZ','NL','CA','BR','EG']
for (const code of FLAG_CODES) add(RI(code[0]) + RI(code[1]))

// Group by codepoint of the first character — approximates the official
// Unicode emoji groups closely enough for browsing.
function groupOf(ch) {
  const cp = ch.codePointAt(0)
  // Flags are two regional indicators (U+1F1E6..U+1F1FF).
  if (cp >= 0x1F1E6 && cp <= 0x1F1FF) return 'Флаги'
  if (ch.includes('\u20E3')) return 'Символы'

  // Ranges follow the official Unicode emoji groups closely enough to browse.
  const inAny = (...pairs) => pairs.some(([a, b]) => cp >= a && cp <= b)

  if (inAny([0x1F600, 0x1F64F], [0x1F910, 0x1F93A], [0x1F970, 0x1F97A],
            [0x1FAE0, 0x1FAE8], [0x2639, 0x263B])) return 'Смайлы'

  if (inAny([0x1F440, 0x1F450], [0x1F464, 0x1F487], [0x1F574, 0x1F596],
            [0x1F645, 0x1F64F], [0x1F926, 0x1F937], [0x1F9B0, 0x1F9DF],
            [0x1FAC0, 0x1FAC5], [0x1F90F, 0x1F918])) return 'Люди'

  if (inAny([0x1F400, 0x1F43F], [0x1F980, 0x1F9AE], [0x1F330, 0x1F344],
            [0x1F300, 0x1F32C], [0x1F31A, 0x1F32C], [0x1FAB0, 0x1FABF],
            [0x2600, 0x2604], [0x1F340, 0x1F343])) return 'Природа'

  if (inAny([0x1F345, 0x1F37F], [0x1F950, 0x1F96F], [0x1F9C0, 0x1F9CB],
            [0x1FAD0, 0x1FADF], [0x1F32D, 0x1F32F])) return 'Еда'

  if (inAny([0x1F680, 0x1F6FF], [0x1F3E0, 0x1F3F0], [0x1F5FA, 0x1F5FF],
            [0x2708, 0x2708], [0x26F4, 0x26FD])) return 'Места'

  if (inAny([0x1F380, 0x1F3C4], [0x1F3C5, 0x1F3CF], [0x1F93C, 0x1F94F],
            [0x26BD, 0x26BE], [0x1F947, 0x1F94F])) return 'Занятия'

  if (inAny([0x1F4A0, 0x1F4FF], [0x1F526, 0x1F5FF], [0x1F9F0, 0x1F9FF],
            [0x1F484, 0x1F4AF], [0x1FA70, 0x1FA7F])) return 'Вещи'

  if (inAny([0x2190, 0x27BF], [0x2B00, 0x2BFF], [0x1F500, 0x1F525],
            [0x00A9, 0x00AE], [0x2122, 0x2139], [0x3030, 0x303D],
            [0x1F19A, 0x1F251])) return 'Символы'

  return 'Прочее'
}

// Only keep what can actually be reserved — the picker must never offer a
// symbol the server would then refuse.
const valid = []
const rejected = []
for (const ch of items) {
  const r = classifyAlias(ch)
  if (r.ok && r.category === 'single_emoji') valid.push(ch)
  else rejected.push({ ch, why: r.ok ? r.category : r.reason })
}

const groups = {}
for (const ch of valid) {
  const g = groupOf(ch)
  ;(groups[g] ||= []).push(ch)
}

console.log('всего собрано :', items.length)
console.log('прошло проверку:', valid.length)
console.log('отклонено     :', rejected.length)
console.log('\nпо группам:')
for (const [g, list] of Object.entries(groups).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`  ${g.padEnd(14)} ${list.length}`)
}
console.log('\nпримеры отклонённых:', rejected.slice(0, 8).map(r => `${r.ch}(${r.why})`).join(' '))
const size = JSON.stringify(groups).length
console.log('\nразмер данных:', (size/1024).toFixed(1), 'KB')

// Writes src/lib/emoji-data.ts — run with: npx tsx scripts/gen-emoji.mjs
writeFileSync(new URL('../src/lib/emoji-data.generated.json', import.meta.url), JSON.stringify(groups, null, 0))
