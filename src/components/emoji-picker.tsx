'use client'

import { useState } from 'react'

// Curated rather than exhaustive. A full Unicode emoji set would be a large
// client bundle for a field where the user picks one or two symbols; these are
// grouped around what a Kazakhstan small business actually reaches for — a
// shop, a car, food, a heart — plus the flag.
export const EMOJI_GROUPS: { name: string; emojis: string[] }[] = [
  { name: 'Популярные', emojis: ['🚀', '🔥', '⭐', '💎', '⚡', '✨', '🎯', '💯', '🏆', '👑', '❤️', '🇰🇿'] },
  { name: 'Бизнес', emojis: ['🛍️', '🏪', '🛒', '💼', '📦', '🏷️', '💰', '💳', '📈', '🤝', '🔑', '📱'] },
  { name: 'Еда', emojis: ['☕', '🍰', '🍕', '🍔', '🍣', '🥗', '🍜', '🧁', '🍫', '🥐', '🍎', '🍾'] },
  { name: 'Услуги', emojis: ['💇', '💅', '💄', '🏋️', '🧘', '🚗', '🔧', '🏠', '📷', '🎓', '🩺', '🐾'] },
  { name: 'Символы', emojis: ['✅', '☑️', '➡️', '🔗', '📍', '🕐', '🎁', '🌟', '🌈', '🎉', '🎨', '🎵'] },
]

export function EmojiPicker({
  onPick,
  onClose,
  theme = 'light',
}: {
  onPick: (emoji: string) => void
  onClose?: () => void
  theme?: 'light' | 'dark'
}) {
  const [group, setGroup] = useState(0)
  const dark = theme === 'dark'

  return (
    <div
      className={`rounded-xl border p-3 ${
        dark ? 'border-white/10 bg-black/60 backdrop-blur-md' : 'border-gray-200 bg-white shadow-lg'
      }`}
    >
      <div className="mb-2 flex flex-wrap gap-1">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.name}
            type="button"
            onClick={() => setGroup(i)}
            className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
              i === group
                ? dark ? 'bg-violet-500/25 text-violet-200' : 'bg-violet-100 text-violet-700'
                : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {g.name}
          </button>
        ))}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`ml-auto rounded-lg px-2 py-1 text-[10px] ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Закрыть
          </button>
        )}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {EMOJI_GROUPS[group].emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className={`rounded-lg py-2 text-xl transition-transform hover:scale-110 active:scale-95 ${
              dark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            }`}
            aria-label={`Вставить ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
