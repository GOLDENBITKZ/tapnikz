'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react'

interface Props {
  linkId: string
  title: string
  username: string
  themeCard: string
  themeText: string
  themeSubtext: string
  themeBg: string
}

export function LeadFormButton({ linkId, title, username, themeCard, themeText, themeSubtext, themeBg }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<'ok' | 'err' | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, link_id: linkId, name: name.trim(), phone: phone.trim(), message: message.trim() }),
      })
      setResult(res.ok ? 'ok' : 'err')
    } catch {
      setResult('err')
    } finally {
      setLoading(false)
    }
  }

  function closeModal() {
    setOpen(false)
    setTimeout(() => { setName(''); setPhone(''); setMessage(''); setResult(null) }, 300)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-4 rounded-2xl border border-violet-500/30 bg-violet-600/15 px-5 py-4 text-violet-300 transition-all duration-150 active:scale-[0.98] hover:scale-[1.01] hover:bg-violet-600/25"
        style={{ boxShadow: '0 6px 24px rgba(124,58,237,0.25)' }}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600/30">
          <ClipboardList className="h-5 w-5 text-violet-300" />
        </div>
        <span className="flex-1 text-left text-sm font-bold leading-tight">{title || 'Оставить заявку'}</span>
        <svg className="h-4 w-4 opacity-40" viewBox="0 0 16 16" fill="none">
          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 backdrop-blur-sm sm:items-center"
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border border-white/[0.08] ${themeBg} p-6 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`text-base font-bold ${themeText}`}>{title || 'Оставить заявку'}</p>
                <p className={`text-xs ${themeSubtext} opacity-70`}>Мы свяжемся с вами в ближайшее время</p>
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {result === 'ok' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
                  <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                </div>
                <p className={`text-base font-bold ${themeText}`}>Заявка отправлена!</p>
                <p className={`text-xs ${themeSubtext} opacity-70`}>Мы получили вашу заявку и свяжемся с вами скоро.</p>
                <button
                  onClick={closeModal}
                  className="mt-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${themeSubtext}`}>
                    Ваше имя <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Алибек"
                    autoComplete="name"
                    className={`w-full rounded-xl border border-white/10 ${themeCard} px-3 py-3 text-base ${themeText} placeholder-gray-500 outline-none transition-colors focus:border-violet-500/60`}
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>

                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${themeSubtext}`}>
                    Телефон <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 700 123 4567"
                    autoComplete="tel"
                    inputMode="tel"
                    className={`w-full rounded-xl border border-white/10 ${themeCard} px-3 py-3 text-base ${themeText} placeholder-gray-500 outline-none transition-colors focus:border-violet-500/60`}
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>

                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${themeSubtext}`}>
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Укажите удобное время или дополнительные детали..."
                    rows={2}
                    className={`w-full resize-none rounded-xl border border-white/10 ${themeCard} px-3 py-3 text-sm ${themeText} placeholder-gray-500 outline-none transition-colors focus:border-violet-500/60`}
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>

                {result === 'err' && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Ошибка. Попробуйте снова или напишите напрямую.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !phone.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  Отправить заявку
                </button>

                <p className={`text-center text-[11px] ${themeSubtext} opacity-50`}>
                  Ваши данные будут переданы только владельцу страницы
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
