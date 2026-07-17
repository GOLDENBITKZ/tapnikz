'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { MessageCircle, X, ChevronLeft, Send } from 'lucide-react'

interface Msg {
  role: 'assistant' | 'user'
  content: string
}

const LS_GUIDE_STEP = 'tapni_guide_dashboard_step'
const LS_DISMISSED  = 'tapni_guide_dismissed'

// Scripted guide content — 0 Groq calls
function getGuideContent(pathname: string, search: string, step: number) {
  if (pathname === '/') {
    return {
      autoDelay: 8000,
      message: 'Привет! 👋 tapni.kz — ваша личная страница с кнопками для Инстаграм, WhatsApp и Kaspi. Создаётся бесплатно за 2 минуты.',
      actions: [
        { label: 'Создать страницу →', href: '/auth?tab=register', primary: true },
        { label: 'Закрыть', dismiss: true },
      ],
    }
  }
  if (pathname === '/auth') {
    const isRegister = search.includes('tab=register')
    return {
      autoDelay: 0,
      message: isRegister
        ? 'Введите номер телефона 📱, придумайте ник — он станет вашим адресом tapni.kz/ник, и пароль от 8 символов.'
        : 'Вводите номер телефона в формате 7XXXXXXXXXX (11 цифр).',
      actions: [{ label: 'Понятно', next: true }],
    }
  }
  if (pathname === '/dashboard') {
    const steps = [
      {
        message: 'Добро пожаловать! 🎉 Начнём с кнопок. Нажмите «+ Добавить ссылку» и выберите тип.',
        actions: [{ label: 'Добавляю →', next: true }],
      },
      {
        message: 'Отлично! Выберите тип: WhatsApp, Kaspi Pay, 2ГИС, Instagram, Telegram и другие. Заполните ссылку или номер.',
        actions: [{ label: 'Понятно →', next: true }],
      },
      {
        message: 'Теперь оформите профиль 🖼 — вкладка «Профиль»: добавьте описание, адрес и аватар.',
        actions: [{ label: 'Иду →', next: true }],
      },
      {
        message: 'Готово! 🚀 Скопируйте tapni.kz/ваш_ник и добавьте в bio Инстаграм или WhatsApp-статус.',
        actions: [
          { label: 'Завершить', dismiss: true },
        ],
      },
    ]
    const s = steps[Math.min(step, steps.length - 1)]
    return { autoDelay: step <= 1 ? 0 : -1, ...s }
  }
  return null
}

export function ChatWidget() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ?? ''

  const [open, setOpen]         = useState(false)
  const [mode, setMode]         = useState<'guide' | 'chat'>('guide')
  const [step, setStep]         = useState(0)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  // Load stored step on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_GUIDE_STEP)
      if (stored) setStep(parseInt(stored, 10) || 0)
      if (localStorage.getItem(LS_DISMISSED)) setDismissed(true)
    } catch {}
  }, [])

  // Reset guide on page change
  useEffect(() => {
    setMode('guide')
    setMessages([])
  }, [pathname])

  // Auto-open logic
  useEffect(() => {
    if (dismissed) return
    const guide = getGuideContent(pathname, search, step)
    if (!guide) return
    if (guide.autoDelay === 0) {
      setOpen(true)
    } else if (guide.autoDelay > 0) {
      const t = setTimeout(() => setOpen(true), guide.autoDelay)
      return () => clearTimeout(t)
    }
  }, [pathname, search, step, dismissed])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const guide = getGuideContent(pathname, search, step)

  function nextStep() {
    const next = step + 1
    setStep(next)
    try { localStorage.setItem(LS_GUIDE_STEP, String(next)) } catch {}
  }

  function dismiss() {
    setOpen(false)
    setDismissed(true)
    try { localStorage.setItem(LS_DISMISSED, '1') } catch {}
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || text.length < 3 || loading) return
    const userMsg: Msg = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setMode('chat')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, page: pathname }),
      })
      const data = await res.json()
      if (data.rateLimited) {
        setRateLimited(true)
        setMessages(h => [...h, { role: 'assistant', content: 'Помощник сейчас занят — слишком много запросов. Попробуйте через минуту.' }])
      } else if (data.reply) {
        setMessages(h => [...h, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(h => [...h, { role: 'assistant', content: data.error ?? 'Что-то пошло не так. Попробуйте ещё раз.' }])
      }
    } catch {
      setMessages(h => [...h, { role: 'assistant', content: 'Ошибка соединения. Попробуйте ещё раз.' }])
    } finally {
      setLoading(false)
    }
  }

  // Don't render on public profile pages or if no guide content and no chat
  if (!guide && mode !== 'chat' && messages.length === 0) {
    // Still show the button so user can chat
    if (pathname.startsWith('/') && !pathname.match(/^\/[^/]+$/)) return null
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Открыть помощника"
        className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', width: 52, height: 52 }}
      >
        {open
          ? <X className="h-5 w-5 text-white" />
          : <MessageCircle className="h-5 w-5 text-white" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: 340,
            maxHeight: 480,
            background: '#130d2e',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
            {mode === 'chat' && (
              <button
                onClick={() => setMode('guide')}
                className="mr-1 text-white/50 hover:text-white/80 transition-colors"
                aria-label="Назад к советам"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="h-7 w-7 flex items-center justify-center rounded-full text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              ✨
            </div>
            <span className="flex-1 text-sm font-semibold text-white">Помощник tapni.kz</span>
            <button onClick={() => setOpen(false)} aria-label="Закрыть" className="text-white/40 hover:text-white/70">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {mode === 'guide' && guide ? (
              <>
                <div className="rounded-xl bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-white/90">
                  {guide.message}
                </div>
                <div className="flex flex-wrap gap-2">
                  {guide.actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if ('href' in a && a.href) {
                          window.location.href = a.href as string
                        } else if ('next' in a && a.next) {
                          nextStep()
                          if (step >= 3) dismiss()
                        } else if ('dismiss' in a && a.dismiss) {
                          dismiss()
                        }
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                      style={
                        i === 0
                          ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }
                      }
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setMode('chat')}
                  className="mt-1 text-xs text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors"
                >
                  Задать вопрос →
                </button>
              </>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="rounded-xl bg-white/[0.07] px-4 py-3 text-sm text-white/80">
                    Спрашивайте — отвечу про tapni.kz!
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'ml-6 text-right text-white/90'
                        : 'mr-6 text-white/85'
                    }`}
                    style={{
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(79,70,229,0.4))'
                        : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="mr-6 rounded-xl bg-white/[0.07] px-4 py-3 text-sm text-white/50">
                    Думаю…
                  </div>
                )}
                <div ref={messagesEnd} />
              </>
            )}
          </div>

          {/* Input */}
          {mode === 'chat' && (
            <div className="border-t border-white/[0.08] px-3 py-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={loading || rateLimited}
                placeholder={rateLimited ? 'Лимит исчерпан...' : 'Ваш вопрос...'}
                className="flex-1 rounded-xl bg-white/[0.07] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-violet-500/50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || rateLimited}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
