'use client'

import { useState, useEffect } from 'react'
import { Loader2, Zap, ExternalLink, ArrowLeft, ChevronRight } from 'lucide-react'

type BizType = 'blogger' | 'business' | 'seller' | 'master'

interface ButtonConfig {
  icon_type: string
  label: string
  emoji: string
  inputLabel: string
  placeholder: string
  hint: string
  buildUrl: (val: string) => string
}

const BIZ_BUTTONS: Record<BizType, ButtonConfig[]> = {
  blogger: [
    {
      icon_type: 'instagram_dm', emoji: '📸', label: 'Instagram Direct',
      inputLabel: 'Ваш @ник в Instagram', placeholder: 'username', hint: 'Просто ник без @',
      buildUrl: (v) => `https://ig.me/m/${v.replace('@', '').trim()}`,
    },
    {
      icon_type: 'telegram', emoji: '✈️', label: 'Telegram-канал',
      inputLabel: 'Ваш Telegram @ник или ссылка', placeholder: 'username', hint: 'Ник без @ или полная ссылка',
      buildUrl: (v) => v.startsWith('http') ? v : `https://t.me/${v.replace('@', '').trim()}`,
    },
    {
      icon_type: 'tiktok', emoji: '🎵', label: 'TikTok',
      inputLabel: 'Ваш @ник в TikTok', placeholder: 'username', hint: 'Ник без @, или полная ссылка',
      buildUrl: (v) => v.startsWith('http') ? v : `https://tiktok.com/@${v.replace('@', '').trim()}`,
    },
    {
      icon_type: 'whatsapp', emoji: '💬', label: 'WhatsApp',
      inputLabel: 'Номер телефона', placeholder: '77001234567', hint: 'Казахстанский номер без + и пробелов',
      buildUrl: (v) => `https://wa.me/${v.replace(/\D/g, '')}`,
    },
  ],
  business: [
    {
      icon_type: 'whatsapp', emoji: '💬', label: 'WhatsApp',
      inputLabel: 'Номер телефона', placeholder: '77001234567', hint: 'Казахстанский номер без + и пробелов',
      buildUrl: (v) => `https://wa.me/${v.replace(/\D/g, '')}`,
    },
    {
      icon_type: 'kaspi_pay', emoji: '💸', label: 'Kaspi Pay',
      inputLabel: 'Ссылка для оплаты', placeholder: 'https://pay.kaspi.kz/pay/...', hint: 'Kaspi.kz → Платежи → Мой QR-код → Поделиться',
      buildUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    },
    {
      icon_type: 'twogis', emoji: '📍', label: '2ГИС — маршрут',
      inputLabel: 'Ссылка на 2ГИС', placeholder: 'https://2gis.kz/...', hint: 'Найдите точку в 2ГИС → Поделиться',
      buildUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    },
    {
      icon_type: 'phone', emoji: '📞', label: 'Позвонить',
      inputLabel: 'Номер телефона', placeholder: '77001234567', hint: 'Казахстанский номер',
      buildUrl: (v) => `tel:${v.replace(/\D/g, '')}`,
    },
  ],
  seller: [
    {
      icon_type: 'kaspi', emoji: '🛒', label: 'Kaspi магазин',
      inputLabel: 'Ссылка на ваш магазин', placeholder: 'https://kaspi.kz/shop/info/...', hint: 'Главная страница вашего Kaspi магазина',
      buildUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    },
    {
      icon_type: 'kaspi_pay', emoji: '💸', label: 'Kaspi Pay',
      inputLabel: 'Ссылка для оплаты', placeholder: 'https://pay.kaspi.kz/pay/...', hint: 'Kaspi.kz → Платежи → Мой QR-код → Поделиться',
      buildUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    },
    {
      icon_type: 'whatsapp', emoji: '💬', label: 'WhatsApp для вопросов',
      inputLabel: 'Номер телефона', placeholder: '77001234567', hint: 'Казахстанский номер без + и пробелов',
      buildUrl: (v) => `https://wa.me/${v.replace(/\D/g, '')}`,
    },
    {
      icon_type: 'twogis', emoji: '📍', label: '2ГИС — маршрут',
      inputLabel: 'Ссылка на 2ГИС', placeholder: 'https://2gis.kz/...', hint: 'Найдите точку в 2ГИС → Поделиться',
      buildUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    },
  ],
  master: [
    {
      icon_type: 'whatsapp', emoji: '💬', label: 'WhatsApp — записаться',
      inputLabel: 'Номер телефона', placeholder: '77001234567', hint: 'Казахстанский номер без + и пробелов',
      buildUrl: (v) => `https://wa.me/${v.replace(/\D/g, '')}`,
    },
    {
      icon_type: 'instagram_dm', emoji: '📸', label: 'Instagram',
      inputLabel: 'Ваш @ник в Instagram', placeholder: 'username', hint: 'Просто ник без @',
      buildUrl: (v) => `https://ig.me/m/${v.replace('@', '').trim()}`,
    },
    {
      icon_type: 'phone', emoji: '📞', label: 'Позвонить',
      inputLabel: 'Номер телефона', placeholder: '77001234567', hint: 'Казахстанский номер',
      buildUrl: (v) => `tel:${v.replace(/\D/g, '')}`,
    },
    {
      icon_type: 'twogis', emoji: '📍', label: '2ГИС — адрес',
      inputLabel: 'Ссылка на 2ГИС', placeholder: 'https://2gis.kz/...', hint: 'Найдите точку в 2ГИС → Поделиться',
      buildUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    },
  ],
}

const STORAGE_KEY = (username: string) => `tapni-wizard-done-${username}`

export function OnboardingWizard({
  username,
  accessToken,
  linksCount,
  onComplete,
}: {
  username: string
  accessToken: string
  linksCount: number
  onComplete: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<'type' | 'buttons' | 'done'>('type')
  const [bizType, setBizType] = useState<BizType | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (linksCount > 0) {
      setVisible(false)
      return
    }
    try {
      if (!localStorage.getItem(STORAGE_KEY(username))) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [linksCount, username])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY(username), '1') } catch {}
    setVisible(false)
    onComplete()
  }

  async function saveButtons() {
    if (!bizType) { setStep('done'); return }
    const EMPTY_URL_SUFFIXES = ['https://wa.me/', 'https://ig.me/m/', 'https://t.me/', 'https://tiktok.com/@', 'tel:']
    const buttons = BIZ_BUTTONS[bizType].filter((b) => {
      const raw = values[b.icon_type]?.trim()
      if (!raw) return false
      const built = b.buildUrl(raw)
      // reject URLs that are just a prefix with no meaningful path
      if (EMPTY_URL_SUFFIXES.some((s) => built === s)) return false
      return true
    })
    if (buttons.length === 0) {
      try { localStorage.setItem(STORAGE_KEY(username), '1') } catch {}
      onComplete(); setStep('done'); return
    }
    setSaving(true)
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i]
      try {
        const url = b.buildUrl(values[b.icon_type].trim())
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ icon_type: b.icon_type, url, title: b.label, sort_order: i }),
        })
        if (res.status === 403) break // free tier limit reached
      } catch {
        // network error on this link, continue with others
      }
    }
    setSaving(false)
    try { localStorage.setItem(STORAGE_KEY(username), '1') } catch {}
    onComplete()
    setStep('done')
  }

  function copyUrl() {
    navigator.clipboard.writeText(`https://tapni.kz/${username}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center backdrop-blur-sm">

      {/* STEP 1: type selection */}
      {step === 'type' && (
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#13131f] p-6 animate-fade-up">
          <div className="mb-5 text-center">
            <div className="mb-3 text-4xl">👋</div>
            <p className="text-lg font-bold text-white">Настроим страницу за 60 секунд</p>
            <p className="mt-1 text-xs text-gray-400">Выберите тип — подберём нужные кнопки</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {([
              { type: 'blogger' as BizType,  emoji: '💄', label: 'Блогер',         sub: 'Instagram, TikTok, Telegram' },
              { type: 'business' as BizType, emoji: '💼', label: 'Бизнес / магазин', sub: 'WhatsApp, Kaspi Pay, 2ГИС' },
              { type: 'seller' as BizType,   emoji: '🛒', label: 'Kaspi-селлер',   sub: 'Магазин, оплата, вопросы' },
              { type: 'master' as BizType,   emoji: '✂️', label: 'Мастер / Услуги', sub: 'Запись, Instagram, адрес' },
            ] as const).map(({ type, emoji, label, sub }) => (
              <button
                key={type}
                type="button"
                onClick={() => { setBizType(type); setStep('buttons') }}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-all hover:border-violet-500/40 hover:bg-violet-500/10 active:scale-[0.96]"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[11px] font-bold text-white leading-tight">{label}</span>
                <span className="text-[9px] text-gray-500 leading-tight">{sub}</span>
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className="mb-4 flex justify-center gap-1.5">
            <div className="h-1.5 w-6 rounded-full bg-violet-500" />
            <div className="h-1.5 w-6 rounded-full bg-white/20" />
            <div className="h-1.5 w-6 rounded-full bg-white/20" />
          </div>

          <button type="button" onClick={dismiss} className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Пропустить — настрою сам →
          </button>
        </div>
      )}

      {/* STEP 2: button configuration */}
      {step === 'buttons' && bizType && (
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#13131f] p-6 my-4 animate-fade-up overflow-y-auto max-h-[90vh]">
          <div className="mb-4 flex items-center gap-3">
            <button type="button" onClick={() => setStep('type')} className="rounded-full p-1.5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Добавьте ваши контакты</p>
              <p className="text-[10px] text-gray-500">Заполните нужные — остальные пропустите</p>
            </div>
            <div className="flex gap-1.5">
              <div className="h-1.5 w-6 rounded-full bg-violet-500/40" />
              <div className="h-1.5 w-6 rounded-full bg-violet-500" />
              <div className="h-1.5 w-6 rounded-full bg-white/20" />
            </div>
          </div>

          <div className="space-y-3 mb-5">
            {BIZ_BUTTONS[bizType].map((b) => (
              <div key={b.icon_type} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{b.emoji}</span>
                  <span className="text-xs font-semibold text-white">{b.label}</span>
                </div>
                <input
                  type="text"
                  value={values[b.icon_type] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [b.icon_type]: e.target.value }))}
                  placeholder={b.placeholder}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
                />
                <p className="mt-1 text-[10px] text-gray-600">{b.hint}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={saveButtons}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-60 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {saving ? 'Сохраняем...' : 'Сохранить и открыть страницу'}
          </button>

          <button type="button" onClick={() => { try { localStorage.setItem(STORAGE_KEY(username), '1') } catch {} setStep('done'); onComplete() }} className="mt-2 w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Пропустить →
          </button>
        </div>
      )}

      {/* STEP 3: done */}
      {step === 'done' && (
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#13131f] p-6 animate-fade-up text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <p className="mb-1 text-xl font-bold text-white">Страница готова!</p>
          <p className="mb-6 text-xs text-gray-400">
            Вставьте ссылку в Instagram bio, TikTok, WhatsApp
          </p>

          {/* Progress */}
          <div className="mb-5 flex justify-center gap-1.5">
            <div className="h-1.5 w-6 rounded-full bg-violet-500/40" />
            <div className="h-1.5 w-6 rounded-full bg-violet-500/40" />
            <div className="h-1.5 w-6 rounded-full bg-violet-500" />
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
            <span className="flex-1 truncate text-left text-sm font-bold text-violet-300">
              tapni.kz/{username}
            </span>
            <button
              type="button"
              onClick={copyUrl}
              className="flex-shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-500"
            >
              {copied ? '✓' : 'Копировать'}
            </button>
          </div>

          <div className="space-y-2">
            <a
              href={`/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white transition-all hover:from-violet-500 hover:to-indigo-500"
            >
              <ExternalLink className="h-4 w-4" />
              Посмотреть мою страницу
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/[0.08]"
            >
              Перейти в личный кабинет
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
