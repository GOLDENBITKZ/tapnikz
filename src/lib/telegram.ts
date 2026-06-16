const BOT_URL = () =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return
  try {
    await fetch(`${BOT_URL()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch {
    // non-fatal
  }
}

export async function sendTelegramWithButtons(
  chatId: string,
  text: string,
  buttons: { text: string; url?: string; callback_data?: string }[][]
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return
  try {
    await fetch(`${BOT_URL()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }),
    })
  } catch {
    // non-fatal
  }
}

export function adminChatId(): string {
  return process.env.TELEGRAM_ADMIN_CHAT_ID ?? ''
}
