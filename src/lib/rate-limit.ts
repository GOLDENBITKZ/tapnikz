import { getSupabaseAdmin } from './supabase-admin'

// Rate limits used to live in a Map inside the lambda process. On Vercel that
// is per-instance and lost on recycle, so a cap of 10 was really 10 × however
// many instances happened to be warm. Measured against production before this
// existed: 21 successful /api/generate calls from one IP inside the hour.
//
// The counter now lives in Postgres, which every one of these routes already
// talks to, so it is shared by all instances and survives recycling.

/** Caller's IP, or a constant when it cannot be determined. Everyone without a
 *  forwarded address shares one bucket, which is the safe direction to err. */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/**
 * Count one use against `key` and report whether it is within `limit`.
 *
 * Fails open. A denial on a database blip would break signup, lead capture and
 * password reset for real users, while exploiting the gap needs Postgres to be
 * down at that exact moment — the wrong trade in the other direction.
 */
export async function consumeRate(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window: `${windowSeconds} seconds`,
    })
    if (error) {
      console.error('[rate-limit] consume failed', key, error.message)
      return true
    }
    return data !== false
  } catch (err) {
    console.error('[rate-limit] consume threw', key, err)
    return true
  }
}

/** Give a slot back when the work it paid for never happened. */
export async function refundRate(key: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getSupabaseAdmin() as any
    await admin.rpc('refund_rate_limit', { p_key: key })
  } catch (err) {
    console.error('[rate-limit] refund threw', key, err)
  }
}
