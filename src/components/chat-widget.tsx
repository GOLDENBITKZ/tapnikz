'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { MessageCircle, X, ChevronLeft, Send } from 'lucide-react'

interface Msg {
  role: 'assistant' | 'user'
  content: string
}

const LS_GUIDE_STEP = 'tapni_guide_dashboard_step'

// Scripted guide content — 0 Groq calls. Shown only once the panel is opened
// by hand; nothing here triggers it.
function getGuideContent(pathname: string, search: string, step: number) {
  if (pathname === '/') {
    return {
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
    return s
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
  const messagesEnd = useRef<HTMLDivElement>(null)

  // The assistant never opens itself. It used to pop up the moment
  // /auth?tab=register or /dashboard loaded, which on a phone means a panel
  // landing on top of the form the person is trying to fill in. The tips are
  // still here — they just wait to be asked for, which is the only time help
  // is actually help.
  //
  // Everything it needs is set up on open rather than in mount effects: the
  // stored step is read here instead of on every page load, and each opening
  // starts from the guide with a clean history. Nothing touches state until
  // someone actually taps the button.
  function openPanel() {
    try {
      const stored = localStorage.getItem(LS_GUIDE_STEP)
      setStep(stored ? parseInt(stored, 10) || 0 : 0)
    } catch { setStep(0) }
    setMode('guide')
    setMessages([])
    setOpen(true)
  }

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const guide = getGuideContent(pathname, search, step)

  function nextStep() {
    const next = step + 1
    setStep(next)
    try { localStorage.setItem(LS_GUIDE_STEP, String(next)) } catch {}
  }

  // Nothing opens on its own any more, so there is no longer a "never show me
  // this again" to remember — closing is just closing.
  function dismiss() {
    setOpen(false)
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

  // Only on pages that belong to the service itself. The old check claimed to
  // exclude public profile pages but did the opposite — pathname.startsWith('/')
  // is always true, and the single-segment test then let /{username} through
  // while blocking everything else. So a visitor reading someone's business card
  // got a tapni assistant button that had nothing to do with them.
  const SERVICE_PAGES = ['/', '/auth', '/dashboard', '/pay', '/help', '/partners', '/manager']
  if (!SERVICE_PAGES.includes(pathname)) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? 'Закрыть помощника' : 'Открыть помощника'}
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
          // Was a hard 340px, which on a 360px phone is the whole screen with
          // 20px to spare. Now it fills the width it has, up to 340px.
          className="fixed bottom-20 left-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl sm:left-auto sm:right-5 sm:w-[340px]"
          style={{
            maxHeight: 'min(480px, calc(100dvh - 7rem))',
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
