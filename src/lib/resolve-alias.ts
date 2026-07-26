import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { decodeAliasParam, toAliasHex } from '@/lib/unicode-utils'

// Used by [username]/page.tsx's profile-miss fallback.
//
// An alias with target_url = NULL points at its owner's own profile page.
// The username is read at redirect time rather than baked in at creation, so
// renaming a profile carries its aliases along instead of breaking them.
export async function resolveAliasTarget(rawParam: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data } = await db
    .from('aliases')
    .select('target_url, profiles!aliases_user_id_fkey(username)')
    .eq('alias_hex', toAliasHex(decodeAliasParam(rawParam)))
    .maybeSingle()

  if (!data) return null
  if (data.target_url) return data.target_url as string

  // Supabase returns an embedded one-to-one relation as an object, but types
  // it loosely enough that an array can come back — handle both.
  const rel = data.profiles
  const username: string | undefined = Array.isArray(rel) ? rel[0]?.username : rel?.username
  return username ? `/${username}` : null
}
