'use client'

import { useState } from 'react'
import { Check, Copy, Smile } from 'lucide-react'
import dynamic from 'next/dynamic'

// Same reasoning as in AliasChecker: the emoji catalogue is only fetched once
// someone actually opens the picker, not on every signup page view.
const EmojiPicker = dynamic(() => import('@/components/emoji-picker').then((m) => m.EmojiPicker), {
  ssr: false,
  loading: () => <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-[11px] text-gray-400">Загрузка символов…</div>,
})

// Ready-made openers. Business names on tapni.kz already lead with an emoji
// in practice (the brand profiles do, e.g. "🚗 Kolesa.kz"), and it is the
// first thing a visitor sees on the profile page — so making it one tap
// instead of "go find an emoji keyboard" removes real friction at signup.
const NAME_IDEAS = [
  '☕ Кофейня',
  '🌸 Цветы',
  '🚗 Автоуслуги',
  '💇 Салон красоты',
  '🍰 Кондитерская',
  '🛍️ Магазин',
  '📷 Фотограф',
  '🏋️ Фитнес',
]

export function BusinessNameField({
  value,
  onChange,
  hasError = false,
  inputClassName,
  labelClassName = 'mb-1.5 block text-xs font-medium text-gray-600',
  required = true,
}: {
  value: string
  onChange: (next: string) => void
  hasError?: boolean
  inputClassName?: string
  labelClassName?: string
  required?: boolean
}) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const baseInput =
    inputClassName ??
    `w-full rounded-xl border bg-gray-50 px-3 py-3 pr-10 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors ${
      hasError ? 'border-red-400' : 'border-gray-200 focus:border-violet-500/60'
    }`

  async function copyIdea(idea: string) {
    try {
      await navigator.clipboard.writeText(idea)
      setCopied(idea)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* clipboard blocked — tapping the chip still fills the field */ }
  }

  return (
    <div>
      <label className={labelClassName}>
        Название бизнеса / Имя {required && <span className="text-red-400">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="☕ Кофейня Алматы"
          className={baseInput}
        />
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-violet-500"
          aria-label="Вставить эмодзи"
        >
          <Smile className="h-4 w-4" />
        </button>
      </div>

      {showEmoji && (
        <div className="mt-2">
          <EmojiPicker onClose={() => setShowEmoji(false)} onPick={(e) => onChange(value ? `${value}${e}` : `${e} `)} />
        </div>
      )}

      <div className="mt-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Готовые варианты — нажмите, чтобы подставить
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NAME_IDEAS.map((idea) => (
            <span key={idea} className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => onChange(idea)}
                className="px-2 py-1 text-[11px] text-gray-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                {idea}
              </button>
              <button
                type="button"
                onClick={() => copyIdea(idea)}
                className="border-l border-gray-200 px-1.5 py-1 text-gray-400 transition-colors hover:text-violet-600"
                aria-label={`Скопировать ${idea}`}
              >
                {copied === idea ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
