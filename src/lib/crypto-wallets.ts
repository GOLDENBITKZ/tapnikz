/**
 * Crypto donation addresses shown on a public profile.
 *
 * Two things here are money-safety features, not conveniences:
 *
 *   Network is part of the identity of a coin, never an afterthought. "USDT" on
 *   its own is not an address anyone can use — the same ticker lives on Tron,
 *   Ethereum and TON with mutually incompatible addresses, and a donor who
 *   sends TRC-20 to an ERC-20 address loses the money permanently. Every entry
 *   therefore names its chain, and the UI shows the chain wherever it shows the
 *   address.
 *
 *   Memo is never dropped where the chain has one. On TON and the XRP Ledger a
 *   transfer to an *exchange deposit* address without its memo or destination
 *   tag is credited to nobody and is normally unrecoverable. It is not required
 *   though — a personal wallet on either chain needs no memo at all, and
 *   demanding one would block the ordinary case. So the field is offered
 *   wherever it applies, and when it is filled in the block treats it as part
 *   of the address rather than a footnote.
 */

export type ChainId =
  | 'btc' | 'eth' | 'usdt_trc20' | 'usdt_erc20' | 'usdt_ton'
  | 'ton' | 'bnb' | 'sol' | 'trx' | 'xrp' | 'ltc' | 'doge'

export type CoinSpec = {
  id: ChainId
  /** Shown as the main label, e.g. "USDT". */
  ticker: string
  /** Full name for the expanded row. */
  name: string
  /** The chain, shown next to the address. Never omitted. */
  network: string
  /** Single character used as the icon; the set has no official marks. */
  symbol: string
  /** Brand-ish accent, kept muted so ten rows do not turn into a rainbow. */
  color: string
  /** The chain has a memo / destination tag. Optional for personal wallets,
   *  mandatory for exchange deposit addresses — which the owner knows and we
   *  cannot detect, so the field is offered and never forced. */
  supportsMemo: boolean
  /** BIP-21 style scheme for the QR payload, when the chain has one. */
  uriScheme?: string
  placeholder: string
}

/**
 * Ordered by what a Kazakh audience actually holds, most likely first. USDT
 * appears three times on purpose: it is the default unit of account across the
 * CIS, and collapsing its chains into one row is exactly the mistake that loses
 * money.
 */
export const COINS: CoinSpec[] = [
  { id: 'usdt_trc20', ticker: 'USDT', name: 'Tether',    network: 'TRC-20 (Tron)',  symbol: '₮', color: '#26A17B', supportsMemo: false, placeholder: 'T…' },
  { id: 'btc',        ticker: 'BTC',  name: 'Bitcoin',   network: 'Bitcoin',        symbol: '₿', color: '#F7931A', supportsMemo: false, uriScheme: 'bitcoin', placeholder: 'bc1… или 1…' },
  { id: 'usdt_ton',   ticker: 'USDT', name: 'Tether',    network: 'TON (jetton)',   symbol: '₮', color: '#0098EA', supportsMemo: true,  placeholder: 'UQ… или EQ…' },
  { id: 'ton',        ticker: 'TON',  name: 'Toncoin',   network: 'TON',            symbol: '◇', color: '#0098EA', supportsMemo: true,  uriScheme: 'ton',      placeholder: 'UQ… или EQ…' },
  { id: 'eth',        ticker: 'ETH',  name: 'Ethereum',  network: 'ERC-20 (Ethereum)', symbol: '◈', color: '#627EEA', supportsMemo: false, uriScheme: 'ethereum', placeholder: '0x…' },
  { id: 'usdt_erc20', ticker: 'USDT', name: 'Tether',    network: 'ERC-20 (Ethereum)', symbol: '₮', color: '#26A17B', supportsMemo: false, placeholder: '0x…' },
  { id: 'bnb',        ticker: 'BNB',  name: 'BNB',       network: 'BEP-20 (BSC)',   symbol: '◆', color: '#F3BA2F', supportsMemo: false, placeholder: '0x…' },
  { id: 'sol',        ticker: 'SOL',  name: 'Solana',    network: 'Solana',         symbol: '◎', color: '#9945FF', supportsMemo: false, uriScheme: 'solana',   placeholder: 'базовый адрес' },
  { id: 'trx',        ticker: 'TRX',  name: 'Tron',      network: 'Tron',           symbol: '▲', color: '#EF0027', supportsMemo: false, placeholder: 'T…' },
  { id: 'xrp',        ticker: 'XRP',  name: 'XRP',       network: 'XRP Ledger',     symbol: '✕', color: '#23292F', supportsMemo: true,  uriScheme: 'ripple',   placeholder: 'r…' },
  { id: 'ltc',        ticker: 'LTC',  name: 'Litecoin',  network: 'Litecoin',       symbol: 'Ł', color: '#345D9D', supportsMemo: false, uriScheme: 'litecoin', placeholder: 'ltc1… или L…' },
  { id: 'doge',       ticker: 'DOGE', name: 'Dogecoin',  network: 'Dogecoin',       symbol: 'Ð', color: '#C2A633', supportsMemo: false, uriScheme: 'dogecoin', placeholder: 'D…' },
]

export const COIN_BY_ID = new Map<ChainId, CoinSpec>(COINS.map((c) => [c.id, c]))

export function isChainId(value: unknown): value is ChainId {
  return typeof value === 'string' && COIN_BY_ID.has(value as ChainId)
}

export type WalletEntry = { id: ChainId; address: string; memo?: string }
export type CryptoWalletData = { coins: WalletEntry[] }

export const MAX_WALLET_COINS = COINS.length
export const MAX_ADDRESS_LEN = 128
export const MAX_MEMO_LEN = 64

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/
const HEX40 = /^0x[0-9a-fA-F]{40}$/

/**
 * Shape and charset checks only — no hashing, so this runs identically in the
 * browser for instant feedback. It catches a wrong-chain paste, which is the
 * expensive mistake. It cannot catch a single mistyped character: that needs
 * the address checksum, which is verified server-side in crypto-checksum.ts.
 */
export function isPlausibleAddress(id: ChainId, address: string): boolean {
  const a = address.trim()
  if (!a || a.length > MAX_ADDRESS_LEN) return false

  switch (id) {
    case 'btc':
      if (/^(bc1)[02-9ac-hj-np-z]{11,71}$/.test(a)) return true
      return /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)
    case 'ltc':
      if (/^(ltc1)[02-9ac-hj-np-z]{11,71}$/.test(a)) return true
      return /^[LM3][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)
    case 'doge':
      return /^D[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)
    case 'eth':
    case 'bnb':
    case 'usdt_erc20':
      return HEX40.test(a)
    case 'trx':
    case 'usdt_trc20':
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)
    case 'ton':
    case 'usdt_ton':
      // User-friendly form: 48 chars of base64url decoding to 36 bytes.
      return /^[EU]Q[A-Za-z0-9_-]{46}$/.test(a)
    case 'sol':
      return a.length >= 32 && a.length <= 44 && BASE58.test(a)
    case 'xrp':
      return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a)
  }
}

/** Payload encoded into the QR. Wallets that understand the scheme prefill the
 *  recipient; everything else still scans as the plain address. */
export function qrPayload(id: ChainId, address: string, memo?: string): string {
  const spec = COIN_BY_ID.get(id)
  if (!spec?.uriScheme) return address
  const tag = memo?.trim()
  // The tag parameter is chain-specific; only the two that need one are mapped.
  if (tag && id === 'xrp') return `${spec.uriScheme}:${address}?dt=${encodeURIComponent(tag)}`
  if (tag && (id === 'ton' || id === 'usdt_ton')) return `${spec.uriScheme}://transfer/${address}?text=${encodeURIComponent(tag)}`
  return `${spec.uriScheme}:${address}`
}

/** Shortened for display: an address is verified by its ends, and the full
 *  string is available through the copy button either way. */
export function shortenAddress(address: string): string {
  return address.length <= 20 ? address : `${address.slice(0, 8)}…${address.slice(-6)}`
}

export type WalletProblem = { index: number; reason: 'unknown_chain' | 'bad_address' | 'duplicate' }

/** Validates the stored JSON. Returns every problem rather than the first, so
 *  the dashboard can mark all the offending rows at once. */
export function validateWallets(data: unknown): { coins: WalletEntry[]; problems: WalletProblem[] } {
  const problems: WalletProblem[] = []
  const raw = (data && typeof data === 'object' && Array.isArray((data as CryptoWalletData).coins))
    ? (data as CryptoWalletData).coins
    : []

  const coins: WalletEntry[] = []
  const seen = new Set<string>()

  raw.slice(0, MAX_WALLET_COINS).forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') { problems.push({ index, reason: 'unknown_chain' }); return }
    const { id } = entry
    if (!isChainId(id)) { problems.push({ index, reason: 'unknown_chain' }); return }

    const address = String(entry.address ?? '').trim().slice(0, MAX_ADDRESS_LEN)
    if (!isPlausibleAddress(id, address)) { problems.push({ index, reason: 'bad_address' }); return }

    if (seen.has(id)) { problems.push({ index, reason: 'duplicate' }); return }
    seen.add(id)

    // A memo on a chain that has no concept of one would be shown to donors as
    // an instruction they cannot follow, so it is dropped rather than stored.
    const rawMemo = String(entry.memo ?? '').trim().slice(0, MAX_MEMO_LEN)
    const memo = COIN_BY_ID.get(id)!.supportsMemo ? rawMemo : ''

    coins.push(memo ? { id, address, memo } : { id, address })
  })

  return { coins, problems }
}
