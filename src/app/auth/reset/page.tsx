'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Phone, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react'

export default function ResetPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: boolean; hasTelegram?: boolean } | null>(null)
  const [error, setError] = useState('')

  function normalizePhone(raw: string) {
    let digits = raw.replace(/\D/g, '')
    if (digits.startsWith('8') && digits.length >= 10) digits = '7' + digits.slice(1)
    if (digits.startsWith('77') && digits.length === 12) digits = digits.slice(1)
    return digits.slice(0, 11)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(phone)
    if (!/^7\d{10}$/.test(normalized)) {
      setError('Введите корректный казахстанский номер (11 цифр)')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      // FIX #10: check res.ok before reading body
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      setResult({ sent: true, hasTelegram: data.hasTelegram })
    } catch {
      setError('Ошибка сети. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#08080f] px-5 py-12 text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-800/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3">
          <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20 shadow-xl shadow-violet-900/40" />
          <span className="text-lg font-extrabold tracking-tight text-white">tapni.kz</span>
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
          <h1 className="mb-1 text-base font-bold text-white">Восстановление пароля</h1>
          <p className="mb-5 text-xs text-gray-400">
            Введите номер телефона — отправим ссылку для сброса
          </p>

          {result ? (
            <div className="space-y-4">
              {result.hasTelegram ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Ссылка отправлена в Telegram</p>
                    <p className="mt-1 text-xs text-emerald-400/80">
                      Проверьте наш бот в Telegram — там будет кнопка для задания нового пароля.
                      Ссылка действует <b>1 час</b> и одноразовая.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
                  <Send className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Запрос принят</p>
                    <p className="mt-1 text-xs text-amber-400/80">
                      Ваш Telegram не привязан к аккаунту. Наша поддержка вышлет ссылку в WhatsApp
                      на ваш номер в течение 15 минут (в рабочее время).
                    </p>
                  </div>
                </div>
              )}
              <a
                href="https://wa.me/77755696531"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Написать в поддержку
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-300">
                  Номер телефона <span className="text-red-400">*</span>
                </label>
                <div className={`flex items-center overflow-hidden rounded-xl border bg-white/[0.06] transition-colors ${
                  error ? 'border-red-500/60' : 'border-white/10 focus-within:border-violet-500/60'
                }`}>
                  <Phone className="ml-3 h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span className="pl-1.5 text-sm text-gray-500">+7</span>
                  <input
                    type="tel"
                    value={phone.replace(/^7/, '')}
                    onChange={(e) => {
                      setError('')
                      setPhone(normalizePhone('7' + e.target.value))
                    }}
                    placeholder="700 123 4567"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="flex-1 bg-transparent py-3 pl-1 pr-3 text-base text-white placeholder-gray-600 outline-none"
                  />
                </div>
                {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <p className="text-xs leading-relaxed text-blue-300/80">
                  🔒 Ссылка для сброса будет отправлена только на ваш Telegram или WhatsApp — никто другой её не получит.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Отправить ссылку
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center">
          <Link href="/auth" className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-300">
            <ArrowLeft className="h-3.5 w-3.5" />
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </main>
  )
}
