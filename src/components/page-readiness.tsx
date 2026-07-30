'use client'

import { Check } from 'lucide-react'
import type { Profile, Link as LinkRow } from '@/lib/supabase'

type Step = { key: string; label: string; why: string; done: boolean; tab: 'profile' | 'links' }

/**
 * What is still missing from the page, and why it matters.
 *
 * Built because the database says people stop halfway: of 28 profiles, 19 have
 * no address, 7 no description and 6 no logo. Nothing ever told them. The
 * address is the worst of those to skip — 2ГИС and the map link are among the
 * strongest reasons this service exists in this market, and they need it.
 *
 * Each row says what the visitor loses, not what the form wants. "Заполните
 * адрес" is a chore; "клиенты не построят маршрут" is a reason.
 */
export function PageReadiness({
  profile,
  links,
  onGo,
}: {
  profile: Profile
  links: LinkRow[]
  onGo: (tab: 'profile' | 'links') => void
}) {
  const hasContact = links.some((l) => ['whatsapp', 'phone', 'telegram'].includes(l.icon_type))

  const steps: Step[] = [
    {
      key: 'avatar', tab: 'profile',
      label: 'Логотип или фото',
      why: 'Страница без картинки выглядит незаконченной, и её реже сохраняют',
      done: Boolean(profile.avatar_url),
    },
    {
      key: 'bio', tab: 'profile',
      label: 'Описание',
      why: 'Его показывает Google в поиске и превью при отправке ссылки',
      done: Boolean(profile.bio?.trim()),
    },
    {
      key: 'address', tab: 'profile',
      label: 'Адрес',
      why: 'Без него не работает маршрут в 2ГИС и вас не найдут по городу',
      done: Boolean(profile.address?.trim()),
    },
    {
      key: 'contact', tab: 'links',
      label: 'Кнопка связи',
      why: 'WhatsApp, Telegram или телефон — иначе клиенту некуда написать',
      done: hasContact,
    },
    {
      key: 'links', tab: 'links',
      label: 'Хотя бы три кнопки',
      why: 'Одна кнопка — это просто ссылка, ради этого страница не нужна',
      done: links.length >= 3,
    },
  ]

  const done = steps.filter((s) => s.done).length
  if (done === steps.length) return null

  const pct = Math.round((done / steps.length) * 100)
  const missing = steps.filter((s) => !s.done)

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-bold text-gray-900">Страница готова на {pct}%</p>
        <p className="text-xs text-gray-400">{done} из {steps.length}</p>
      </div>

      <div className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {missing.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onGo(s.tab)}
            className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gray-50"
          >
            <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-gray-800">{s.label}</span>
              <span className="block text-[11px] leading-snug text-gray-500">{s.why}</span>
            </span>
          </button>
        ))}
      </div>

      {done > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-2.5">
          {steps.filter((s) => s.done).map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-[11px] text-gray-400">
              <Check className="h-3 w-3 text-emerald-500" />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
