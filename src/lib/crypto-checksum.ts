import { createHash } from 'node:crypto'
import { COIN_BY_ID, validateWallets, type ChainId, type WalletEntry } from './crypto-wallets'

/**
 * Address checksum verification. Server-only — it needs node:crypto, and it is
 * the authoritative check either way.
 *
 * The format checks in crypto-wallets.ts catch the expensive mistake (an address
 * from the wrong chain). They cannot catch a single mistyped or dropped
 * character, because a typo'd address is still the right shape. Every format
 * here carries a checksum designed for exactly that, and a donation sent to a
 * mistyped address is gone as surely as one sent to the wrong chain.
 *
 * Not covered: EVM chains (ETH, BNB, USDT-ERC20) and Solana. EIP-55 is a
 * keccak-256 checksum and node:crypto ships sha3-256, which is a different
 * padding — verifying it properly needs a dependency, and a lowercase EVM
 * address is valid with no checksum at all, so a partial check would reject
 * legitimate addresses. Solana addresses are a raw public key with no checksum
 * to verify. Both keep their format checks.
 */

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
// The XRP Ledger uses base58 with its own dictionary. Decoding an XRP address
// against the Bitcoin alphabet yields the wrong bytes and fails every checksum,
// so valid addresses would have been rejected.
const XRP_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'

const B58_MAP = new Map<string, number>([...B58_ALPHABET].map((c, i) => [c, i]))
const XRP_MAP = new Map<string, number>([...XRP_ALPHABET].map((c, i) => [c, i]))

function base58Decode(input: string, map: Map<string, number> = B58_MAP): Uint8Array | null {
  const zeroChar = map === XRP_MAP ? 'r' : '1'
  const bytes: number[] = [0]
  for (const ch of input) {
    const value = map.get(ch)
    if (value === undefined) return null
    let carry = value
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8 }
  }
  // Leading zero-value characters are leading zero bytes and carry no value
  // through the maths above.
  for (const ch of input) { if (ch !== zeroChar) break; bytes.push(0) }
  return new Uint8Array(bytes.reverse())
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest())
}

/** Base58Check: last 4 bytes are the first 4 of sha256(sha256(payload)). */
function base58CheckValid(address: string, expectedLength: number, map = B58_MAP): boolean {
  const decoded = base58Decode(address, map)
  if (!decoded || decoded.length !== expectedLength) return false
  const payload = decoded.subarray(0, decoded.length - 4)
  const checksum = decoded.subarray(decoded.length - 4)
  const digest = sha256(sha256(payload))
  for (let i = 0; i < 4; i++) if (digest[i] !== checksum[i]) return false
  return true
}

/** CRC16-CCITT (XModem), used by TON's user-friendly address form. */
function crc16(data: Uint8Array): number {
  let crc = 0
  for (const byte of data) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc
}

function tonAddressValid(address: string): boolean {
  // base64url → 36 bytes: tag, workchain, 32-byte hash, 2-byte CRC.
  const raw = Buffer.from(address.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  if (raw.length !== 36) return false
  const body = new Uint8Array(raw.subarray(0, 34))
  const expected = (raw[34] << 8) | raw[35]
  return crc16(body) === expected
}

/**
 * True when the address passes its chain's checksum, or when the chain has no
 * checksum this can verify. Assumes the format check has already run.
 */
export function hasValidChecksum(id: ChainId, address: string): boolean {
  if (!COIN_BY_ID.has(id)) return false
  const a = address.trim()

  switch (id) {
    case 'btc':
    case 'ltc':
      // bech32 has its own scheme; the format check covers its charset, and a
      // second implementation here would be more risk than it removes.
      if (/^(bc1|ltc1)/i.test(a)) return true
      return base58CheckValid(a, 25)
    case 'doge':
      return base58CheckValid(a, 25)
    case 'xrp':
      return base58CheckValid(a, 25, XRP_MAP)
    case 'trx':
    case 'usdt_trc20':
      return base58CheckValid(a, 25)
    case 'ton':
    case 'usdt_ton':
      return tonAddressValid(a)
    case 'eth':
    case 'bnb':
    case 'usdt_erc20':
    case 'sol':
      return true
  }
}

/**
 * The single entry point for accepting a crypto_wallet payload on write.
 *
 * Format and checksum are checked together because either one alone leaves a
 * way to lose money: the format check misses a mistyped character, and the
 * checksum cannot tell a valid Tron address from a valid Ethereum one. Every
 * write path — POST /api/links, the batch route and PATCH /api/links/[id] —
 * goes through here, so a wallet can never reach the database unverified.
 */
export function parseWalletPayload(rawJson: string):
  | { ok: true; coins: WalletEntry[] }
  | { ok: false; error: 'invalid_json' | 'no_coins' | 'bad_address' } {
  let parsed: unknown
  try { parsed = JSON.parse(rawJson) } catch { return { ok: false, error: 'invalid_json' } }

  const { coins, problems } = validateWallets(parsed)
  if (problems.length > 0) return { ok: false, error: 'bad_address' }
  if (coins.length === 0) return { ok: false, error: 'no_coins' }

  for (const coin of coins) {
    if (!hasValidChecksum(coin.id, coin.address)) return { ok: false, error: 'bad_address' }
  }

  return { ok: true, coins }
}
