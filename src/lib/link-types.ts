/**
 * One definition of what a link type is and how it behaves.
 *
 * These lists used to exist in five places — two API routes, the single-link
 * route, the dashboard and the public profile page — each written out by hand.
 * They happened to agree when this was written, which is the dangerous state
 * to be in: adding an eighth Premium type meant editing five files, and a
 * missed one would only surface when a user hit it.
 *
 * The RLS policies on public.links repeat PREMIUM_ONLY_TYPES, because SQL
 * cannot import this file. That copy is the one to remember: see the comment
 * on links_insert_owner in SUPABASE_SCHEMA.sql.
 */

/** Every type the service accepts. IconType is derived from it, so a type
 *  cannot exist in the union without being valid at runtime, or the reverse. */
export const ALL_ICON_TYPES = [
  'whatsapp', 'telegram', 'instagram', 'tiktok', 'youtube',
  'kaspi', 'kaspi_pay', 'kaspi_shop', 'kaspi_qr', 'smart_qr',
  'twogis', 'website', 'phone', 'email', 'kolesa', 'krisha',
  'vk', 'facebook', 'twitter', 'link',
  'text_block', 'product', 'lead_form', 'android', 'ios', 'menu', 'paypal',
  'instagram_dm', 'instagram_reel', 'follow_gate', 'milestone', 'instagram_keyword',
  'countdown', 'pricelist', 'image', 'video', 'faq',
  'twitch', 'crypto_wallet', 'binance_pay',
] as const

export type IconType = (typeof ALL_ICON_TYPES)[number]

const ALL = new Set<string>(ALL_ICON_TYPES)

export function isValidIconType(value: unknown): value is IconType {
  return typeof value === 'string' && ALL.has(value)
}

/** Paid types. Enforced in /api/links, /api/links/batch and both RLS policies —
 *  a free account must be refused on every one of those paths. */
export const PREMIUM_ONLY_TYPES = new Set<IconType>([
  'product', 'smart_qr', 'countdown', 'pricelist', 'image', 'video', 'faq',
  // twitch is deliberately absent: it is an ordinary social link like youtube
  // or tiktok, and charging for one of those would be arbitrary.
  'crypto_wallet', 'binance_pay',
])

/** The url column holds JSON describing the block, not an address, so URL
 *  scheme validation must not run on it. */
export const JSON_URL_TYPES = new Set<IconType>([
  'text_block', 'product', 'follow_gate', 'milestone', 'instagram_keyword',
  'countdown', 'pricelist', 'image', 'video', 'faq', 'smart_qr',
  // A wallet block holds a list of chains and addresses, not one destination.
  'crypto_wallet',
])

/** May be created without a url: their content lives elsewhere in the row, or
 *  they render a form rather than linking anywhere. */
export const EMPTY_URL_OK_TYPES = new Set<IconType>([
  'lead_form', 'text_block', 'follow_gate', 'milestone', 'instagram_keyword',
  'countdown', 'pricelist', 'faq', 'video',
])

/** Types for which an empty url is normal rather than unfinished. The public
 *  page hides anything else with no destination — a button that goes nowhere
 *  should never be handed to a visitor. Derived, so it cannot drift from the
 *  two sets it is built from. */
export const NO_URL_NEEDED_TYPES = new Set<IconType>([
  ...JSON_URL_TYPES, ...EMPTY_URL_OK_TYPES,
])

/** Types the dashboard must not show a plain URL field for. Same as
 *  JSON_URL_TYPES plus lead_form, which collects a submission instead of
 *  pointing anywhere. */
export const NO_URL_INPUT_TYPES = new Set<IconType>([
  ...JSON_URL_TYPES, 'lead_form',
])
