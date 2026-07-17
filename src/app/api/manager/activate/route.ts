import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegram, sendTelegramWithButtons } from '@/lib/telegram'

const SITE_URL = 'https://tapni.kz'

async function getAuthProfile(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getSupabaseAdmin() as any
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null
  const { data: prof } = await adminDb
    .from('profiles')
    .select('id, username, is_manager, telegram_chat_id')
    .eq('id', user.id)
    .maybeSingle()
  return prof ? { prof, adminDb } : null
}

export async function POST(request: Request) {
  const auth = await getAuthProfile(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { prof, adminDb } = auth

  // Already a manager → no-op
  if (prof.is_manager) {
    return Response.json({ ok: true, already: true })
  }

  // Self-activation is disabled for security. Send application to admin for approval.
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (adminChatId) {
    await sendTelegramWithButtons(
      adminChatId,
      `📩 <b>Заявка на партнёрство</b>\n\n` +
      `Пользователь <b>@${prof.username}</b> хочет стать менеджером.\n\n` +
      `Для активации: /manager add ${prof.username}`,
      [[{ text: '✅ Одобрить', callback_data: `manager_approve:${prof.username}` }]]
    )
  }

  return Response.json({ ok: true, pending: true })
}
