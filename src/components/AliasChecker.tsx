'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Pencil, X, Zap } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { classifyAlias, isReservedWord } from '@/lib/unicode-utils'

type CheckStatus = 'idle' | 'checking' | 'free' | 'taken' | 'reserved' | 'invalid' | 'mixed_script'

type AliasItem = {
  id: string
  aliasRaw: string
  targetUrl: string
  urls: [string, string]
}

const STATUS_TEXT: Record<Exclude<CheckStatus, 'idle' | 'checking'>, { text: string; className: string }> = {
  free: { text: 'Свободно', className: 'text-emerald-600' },
  taken: { text: 'Уже занято', className: 'text-red-500' },
  reserved: { text: 'Это системный адрес — недоступно', className: 'text-red-500' },
  invalid: { text: 'Одно короткое слово или один эмодзи', className: 'text-amber-600' },
  mixed_script: { text: 'Только эмодзи или символ — не буква и не цифра', className: 'text-red-500' },
}

// Debounced availability check — mirrors how username availability is
// already checked directly from the client elsewhere in this app
// (auth/page.tsx registration, dashboard/page.tsx changeUsername): a plain
// anon-client Supabase read, not a dedicated API route. Safe here because
// both `profiles` and `aliases` have `SELECT USING (true)` RLS.
function useDebouncedAliasCheck(rawInput: string, delayMs = 300) {
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [normalized, setNormalized] = useState('')

  useEffect(() => {
    if (!rawInput.trim()) { setStatus('idle'); setNormalized(''); return }

    const cls = classifyAlias(rawInput)
    if (!cls.ok) {
      setStatus(cls.reason === 'mixed_script' ? 'mixed_script' : 'invalid')
      setNormalized('')
      return
    }
    if (isReservedWord(cls.normalized)) {
      setStatus('reserved')
      setNormalized(cls.normalized)
      return
    }

    // clearTimeout alone isn't enough: once the timer has fired the DB query
    // is already in flight, and its setStatus would land even though the
    // input has since changed. Two queries can also resolve out of order,
    // which would leave the box showing a verdict for a different alias —
    // e.g. "Свободно" for one that is actually taken. This flag drops any
    // result belonging to a superseded input.
    let cancelled = false

    setStatus('checking')
    const timer = setTimeout(async () => {
      const db = getSupabase()
      const aliasCheck = db.from('aliases').select('id').eq('alias_hex', cls.hex).maybeSingle()
      const profileCheck = cls.kind === 'ascii'
        ? db.from('profiles').select('id').eq('username', cls.normalized).maybeSingle()
        : null
      const [aliasResult, profileResult] = await Promise.all([aliasCheck, profileCheck])
      if (cancelled) return
      const isTaken = !!aliasResult.data || !!profileResult?.data
      setStatus(isTaken ? 'taken' : 'free')
      setNormalized(cls.normalized)
    }, delayMs)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [rawInput, delayMs])

  return { status, normalized }
}

export function AliasChecker({ accessToken, isPremium }: { accessToken: string; isPremium: boolean }) {
  const [aliasInput, setAliasInput] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [myAliases, setMyAliases] = useState<AliasItem[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const loadedRef = useRef(false)

  const { status, normalized } = useDebouncedAliasCheck(aliasInput)

  // Load the user's existing aliases once, only for Premium users (the
  // section below the divider — "use this even if you already have one" —
  // only makes sense once we know what they already own).
  useEffect(() => {
    if (!isPremium || loadedRef.current) return
    loadedRef.current = true
    fetch('/api/aliases', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) setMyAliases(body.aliases) })
      .catch(() => {})
  }, [isPremium, accessToken])

  async function reserve() {
    if (status !== 'free' || !targetUrl.trim()) return
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('/api/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ alias_raw: aliasInput, target_url: targetUrl.trim() }),
      })
      const body = await res.json()
      if (!body.ok) {
        setSubmitMsg({ type: 'err', text: errorMessage(body.error) })
        return
      }
      setMyAliases((prev) => [{ id: body.alias.id, aliasRaw: body.alias.aliasRaw, targetUrl: targetUrl.trim(), urls: body.alias.urls }, ...(prev ?? [])])
      setAliasInput('')
      setTargetUrl('')
      setSubmitMsg({ type: 'ok', text: `Забронировано: ${body.alias.urls[0].replace('https://', '')}` })
    } catch {
      setSubmitMsg({ type: 'err', text: 'Ошибка сети. Попробуйте снова.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEdit(id: string) {
    if (!editUrl.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/aliases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ target_url: editUrl.trim() }),
      })
      const body = await res.json()
      if (!body.ok) {
        setSubmitMsg({ type: 'err', text: errorMessage(body.error) })
        return
      }
      setMyAliases((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, targetUrl: editUrl.trim() } : a)))
      setEditingId(null)
    } catch {
      setSubmitMsg({ type: 'err', text: 'Ошибка сети. Попробуйте снова.' })
    } finally {
      setEditSaving(false)
    }
  }

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700">
          <Zap className="h-4 w-4" />
          Забронировать эмодзи-ссылку
        </p>
        <p className="text-xs text-gray-500">
          Доступно только в Premium: tapni.kz/🚀 и tapni.kz/tapni.kz/🚀 ведут туда, куда вы укажете.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700">
        <Zap className="h-4 w-4" />
        Забронировать эмодзи-ссылку
      </p>
      <p className="mb-3 text-xs text-gray-400">
        Одно короткое слово или один эмодзи — например tapni.kz/🚀
      </p>

      <div className="mb-2 flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
        <span className="flex-shrink-0 pl-3 text-xs text-gray-500">tapni.kz/</span>
        <input
          type="text"
          value={aliasInput}
          onChange={(e) => setAliasInput(e.target.value)}
          placeholder="🚀"
          className="flex-1 bg-transparent px-1 py-3 text-base text-gray-900 placeholder-gray-400 outline-none"
        />
        {status === 'checking' && <Loader2 className="mr-3 h-3.5 w-3.5 flex-shrink-0 animate-spin text-gray-400" />}
      </div>
      {status !== 'idle' && status !== 'checking' && (
        <p className={`mb-2 text-xs ${STATUS_TEXT[status].className}`}>{STATUS_TEXT[status].text}</p>
      )}

      <input
        type="text"
        value={targetUrl}
        onChange={(e) => setTargetUrl(e.target.value)}
        placeholder="https://example.com — куда вести"
        className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
      />

      <button
        type="button"
        onClick={reserve}
        disabled={submitting || status !== 'free' || !targetUrl.trim()}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-100 px-4 py-3 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-40"
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Забронировать'}
      </button>

      {submitMsg && (
        <p className={`mt-2 text-xs ${submitMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
          {submitMsg.text}
        </p>
      )}

      {normalized && aliasInput && targetUrl.trim() && status === 'free' && (
        <p className="mt-2 text-[11px] text-gray-400">
          После брони будет доступно и как tapni.kz/{normalized}, и как tapni.kz/tapni.kz/{normalized}
        </p>
      )}

      {/* Existing reservations — reserving a new alias never requires giving
          up or replacing an old one; every alias the user already owns can
          also be repointed to a new target_url here. */}
      {myAliases !== null && myAliases.length > 0 && (
        <div className="mt-4 border-t border-amber-200 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Ваши ссылки</p>
          <div className="space-y-2">
            {myAliases.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-gray-900">tapni.kz/{a.aliasRaw}</span>
                  {editingId === a.id ? (
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingId(a.id); setEditUrl(a.targetUrl) }}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800"
                    >
                      <Pencil className="h-3 w-3" />
                      Изменить
                    </button>
                  )}
                </div>
                {editingId === a.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(a.id)}
                      disabled={editSaving || !editUrl.trim()}
                      className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700 disabled:opacity-40"
                    >
                      {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </button>
                  </div>
                ) : (
                  <p className="truncate text-xs text-gray-400">→ {a.targetUrl}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'premium_required': return 'Доступно только в Premium'
    case 'reserved_route': return 'Это системный адрес — недоступно'
    case 'mixed_script': return 'Только эмодзи или символ — не буква и не цифра'
    case 'already_taken_alias': return 'Уже занято'
    case 'already_taken_username': return 'Это имя занято пользователем'
    case 'not_found': return 'Не найдено'
    default: return 'Ошибка. Попробуйте снова.'
  }
}
