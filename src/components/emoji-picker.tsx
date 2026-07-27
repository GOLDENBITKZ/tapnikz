'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { EMOJI_GROUPS, TOTAL_EMOJI } from '@/lib/emoji-data'

// Shown first, before the full catalogue — what a Kazakhstan small business
// actually reaches for. Saves scrolling 1 400 symbols for the obvious pick.
const QUICK = ['🚀', '🔥', '⭐', '💎', '⚡', '✨', '🎯', '💯', '🏆', '👑', '❤️', '🇰🇿']

// Rendering every group at once would mount 1 400+ buttons. Only the active
// tab renders, and long groups are capped until the user asks for the rest.
const INITIAL_VISIBLE = 96

export function EmojiPicker({
  onPick,
  onClose,
  theme = 'light',
}: {
  onPick: (emoji: string) => void
  onClose?: () => void
  theme?: 'light' | 'dark'
}) {
  const [groupIdx, setGroupIdx] = useState(-1) // -1 = quick picks
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const dark = theme === 'dark'

  // Deferred so typing stays responsive while a large result set re-renders.
  const deferredQuery = useDeferredValue(query)

  const shown = useMemo(() => {
    const q = deferredQuery.trim()
    if (q) {
      // Search is by symbol, not name: no emoji-name dataset ships with this,
      // and pasting a symbol to check it is the realistic use here.
      const all = EMOJI_GROUPS.flatMap((g) => g.emojis)
      return all.filter((e) => e.includes(q)).slice(0, 200)
    }
    if (groupIdx === -1) return QUICK
    const list = EMOJI_GROUPS[groupIdx]?.emojis ?? []
    return expanded ? list : list.slice(0, INITIAL_VISIBLE)
  }, [deferredQuery, groupIdx, expanded])

  const activeList = groupIdx === -1 ? QUICK : (EMOJI_GROUPS[groupIdx]?.emojis ?? [])
  const hasMore = !deferredQuery.trim() && groupIdx !== -1 && !expanded && activeList.length > INITIAL_VISIBLE

  const tab = (active: boolean) =>
    `flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
      active
        ? dark ? 'bg-violet-500/25 text-violet-200' : 'bg-violet-100 text-violet-700'
        : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
    }`

  return (
    <div className={`rounded-xl border p-2.5 ${dark ? 'border-white/10 bg-black/60 backdrop-blur-md' : 'border-gray-200 bg-white shadow-lg'}`}>
      {/* Search + close */}
      <div className="mb-2 flex items-center gap-1.5">
        <div className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 ${dark ? 'bg-white/5' : 'bg-gray-100'}`}>
          <Search className={`h-3 w-3 flex-shrink-0 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Вставьте символ для поиска"
            className={`min-w-0 flex-1 bg-transparent py-1.5 text-[11px] outline-none ${dark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className={dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className={`flex-shrink-0 rounded-lg px-2 py-1 text-[10px] ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
            Закрыть
          </button>
        )}
      </div>

      {/* Category tabs. They wrap onto as many rows as they need — scrolling
          them sideways hid categories past an edge with nothing to show they
          were there, so on a phone half the catalogue was invisible. */}
      {!deferredQuery.trim() && (
        <div className="mb-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => { setGroupIdx(-1); setExpanded(false) }} className={tab(groupIdx === -1)}>
            ⚡ Частые
          </button>
          {EMOJI_GROUPS.map((g, i) => (
            <button key={g.name} type="button" onClick={() => { setGroupIdx(i); setExpanded(false) }} className={tab(groupIdx === i)}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid. auto-fill keeps cells a comfortable tap size on any width
          instead of squeezing a fixed column count onto a narrow screen. */}
      <div
        className="grid max-h-56 gap-0.5 overflow-y-auto overscroll-contain"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2rem, 1fr))' }}
      >
        {shown.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            title={e}
            className={`rounded-lg py-1.5 text-lg leading-none transition-transform hover:scale-125 active:scale-95 ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            {e}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className={`py-4 text-center text-[11px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Ничего не найдено</p>
      )}

      <div className="mt-1.5 flex items-center justify-between">
        <p className={`text-[10px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          {deferredQuery.trim() ? `Найдено: ${shown.length}` : `Всего символов: ${TOTAL_EMOJI}`}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`text-[10px] font-semibold ${dark ? 'text-violet-300 hover:text-violet-200' : 'text-violet-600 hover:text-violet-700'}`}
          >
            Показать все {activeList.length} →
          </button>
        )}
      </div>
    </div>
  )
}
