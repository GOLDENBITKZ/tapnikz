'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Loader2, Pencil, Smile, Sparkles, X, Zap } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import {
  classifyAlias,
  isReservedWord,
  CATEGORY_LABELS,
  MAX_ALIAS_GRAPHEMES,
  type AliasCategory,
} from '@/lib/unicode-utils'
import { EmojiPicker } from '@/components/emoji-picker'

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'free'; category: AliasCategory; normalized: string }
  | { kind: 'taken' }
  | { kind: 'reserved' }
  | { kind: 'rejected'; reason: string }

type AliasItem = {
  id: string
  aliasRaw: string
  category: AliasCategory
  targetUrl: string | null
  urls: [string, string]
}

const TIER_STYLE: Record<AliasCategory, { badge: string; glow: string; icon: string }> = {
  single_emoji: { badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30', glow: 'shadow-[0_0_24px_-6px_rgba(251,191,36,0.5)]', icon: '👑' },
  double_emoji: { badge: 'bg-violet-400/15 text-violet-300 border-violet-400/30', glow: 'shadow-[0_0_24px_-6px_rgba(167,139,250,0.5)]', icon: '⚡' },
  custom: { badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30', glow: 'shadow-[0_0_24px_-6px_rgba(52,211,153,0.4)]', icon: '🟢' },
}

const REJECT_TEXT: Record<string, string> = {
  empty: '',
  too_long: `Максимум ${MAX_ALIAS_GRAPHEMES} символов`,
  too_many_bytes: 'Слишком длинная комбинация эмодзи — сократите',
  non_ascii_letter: 'Только латиница и эмодзи — кириллица недоступна',
  invalid_char: 'Без пробелов и невидимых символов',
  mixed_script: 'Смешение алфавитов запрещено',
}

function useDebouncedAliasCheck(rawInput: string, delayMs = 300) {
  const [state, setState] = useState<CheckState>({ kind: 'idle' })

  useEffect(() => {
    if (!rawInput.trim()) { setState({ kind: 'idle' }); return }

    const cls = classifyAlias(rawInput)
    if (!cls.ok) {
      if (cls.reason === 'empty') { setState({ kind: 'idle' }); return }
      setState({ kind: 'rejected', reason: REJECT_TEXT[cls.reason] ?? 'Недопустимый символ' })
      return
    }
    if (isReservedWord(cls.normalized)) { setState({ kind: 'reserved' }); return }

    // clearTimeout alone isn't enough: once the timer has fired the DB query
    // is already in flight and its result would land even though the input
    // has since changed. Two queries can also resolve out of order, leaving a
    // verdict for a different alias on screen. This flag drops superseded results.
    let cancelled = false
    setState({ kind: 'checking' })

    const timer = setTimeout(async () => {
      const db = getSupabase()
      const aliasCheck = db.from('aliases').select('id').eq('alias_hex', cls.hex).maybeSingle()
      const profileCheck = /^[a-z0-9][a-z0-9._-]{2,31}$/.test(cls.normalized)
        ? db.from('profiles').select('id').eq('username', cls.normalized).maybeSingle()
        : null
      const [aliasResult, profileResult] = await Promise.all([aliasCheck, profileCheck])
      if (cancelled) return
      if (aliasResult.data || profileResult?.data) setState({ kind: 'taken' })
      else setState({ kind: 'free', category: cls.category, normalized: cls.normalized })
    }, delayMs)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [rawInput, delayMs])

  return state
}

export function AliasChecker({ accessToken, isPremium }: { accessToken: string; isPremium: boolean }) {
  const [aliasInput, setAliasInput] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [branded, setBranded] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [myAliases, setMyAliases] = useState<AliasItem[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const state = useDebouncedAliasCheck(aliasInput)
  const prefix = branded ? 'tapni.kz/tapni.kz/' : 'tapni.kz/'

  useEffect(() => {
    if (!isPremium || loadedRef.current || !accessToken) return
    loadedRef.current = true
    fetch('/api/aliases', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) setMyAliases(body.aliases) })
      .catch(() => {})
  }, [isPremium, accessToken])

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* clipboard blocked — the text is visible and selectable anyway */ }
  }

  async function reserve() {
    if (state.kind !== 'free') return
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('/api/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ alias_raw: aliasInput, target_url: targetUrl.trim() }),
      })
      const body = await res.json()
      if (!body.ok) { setSubmitMsg({ type: 'err', text: errorMessage(body.error) }); return }
      setMyAliases((prev) => [
        { id: body.alias.id, aliasRaw: body.alias.aliasRaw, category: body.alias.category, targetUrl: targetUrl.trim() || null, urls: body.alias.urls },
        ...(prev ?? []),
      ])
      setAliasInput('')
      setTargetUrl('')
      setSubmitMsg({ type: 'ok', text: `Символ ${body.alias.aliasRaw} закреплён за вами` })
    } catch {
      setSubmitMsg({ type: 'err', text: 'Ошибка сети. Попробуйте снова.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/aliases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ target_url: editUrl.trim() }),
      })
      const body = await res.json()
      if (!body.ok) { setSubmitMsg({ type: 'err', text: errorMessage(body.error) }); return }
      setMyAliases((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, targetUrl: editUrl.trim() || null } : a)))
      setEditingId(null)
    } catch {
      setSubmitMsg({ type: 'err', text: 'Ошибка сети. Попробуйте снова.' })
    } finally {
      setEditSaving(false)
    }
  }

  if (!isPremium) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-violet-950/70 to-black p-5">
        <p className="mb-1.5 flex items-center gap-2 text-sm font-bold text-white">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Застолбить эмодзи-ссылку
        </p>
        <p className="mb-3 text-xs leading-relaxed text-gray-400">
          Короткий адрес вроде <span className="font-mono text-violet-300">tapni.kz/🚀</span> — ведёт куда вы укажете.
          Один символ, два или сочетание с текстом.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TIER_STYLE) as AliasCategory[]).map((c) => (
            <span key={c} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${TIER_STYLE[c].badge}`}>
              {TIER_STYLE[c].icon} {CATEGORY_LABELS[c].label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-gray-500">Доступно на Premium</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-violet-950/70 to-black p-5">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
        <Sparkles className="h-4 w-4 text-violet-400" />
        Застолбить эмодзи-ссылку
      </p>
      <p className="mb-4 text-xs text-gray-400">
        Один эмодзи, два или целое слово — до {MAX_ALIAS_GRAPHEMES} символов. Чем короче, тем ценнее.
      </p>

      {/* Format toggle — the reservation is the same either way, this only
          switches which of its two URLs is shown while typing. */}
      <div className="mb-3 flex flex-wrap gap-0.5 rounded-xl border border-white/10 bg-black/40 p-0.5">
        {[false, true].map((b) => (
          <button
            key={String(b)}
            type="button"
            onClick={() => setBranded(b)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${
              branded === b ? 'bg-violet-500/25 text-violet-200' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {b ? 'tapni.kz/tapni.kz/' : 'tapni.kz/'}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center overflow-hidden rounded-xl border border-white/10 bg-black/50 focus-within:border-violet-400/50">
        <span className="flex-shrink-0 pl-3 font-mono text-[11px] text-gray-500">{prefix}</span>
        <input
          type="text"
          value={aliasInput}
          onChange={(e) => setAliasInput(e.target.value)}
          placeholder="🚀"
          className="min-w-0 flex-1 bg-transparent px-1.5 py-3 text-base text-white placeholder-gray-600 outline-none"
        />
        {state.kind === 'checking' && <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-gray-500" />}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="flex-shrink-0 px-3 text-gray-500 transition-colors hover:text-violet-300"
          aria-label="Выбрать эмодзи"
        >
          <Smile className="h-4 w-4" />
        </button>
      </div>

      {showEmoji && (
        <div className="mb-3">
          <EmojiPicker
            theme="dark"
            onClose={() => setShowEmoji(false)}
            onPick={(e) => setAliasInput((v) => v + e)}
          />
        </div>
      )}

      {/* Status plate */}
      {state.kind === 'free' && (
        <div className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-2 ${TIER_STYLE[state.category].badge} ${TIER_STYLE[state.category].glow}`}>
          <span className="text-sm">{TIER_STYLE[state.category].icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold">Свободно — {CATEGORY_LABELS[state.category].label}</p>
            <p className="truncate text-[10px] opacity-70">{CATEGORY_LABELS[state.category].blurb}</p>
          </div>
        </div>
      )}
      {state.kind === 'taken' && (
        <p className="mb-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300">🔴 Занято — попробуйте другой символ</p>
      )}
      {state.kind === 'reserved' && (
        <p className="mb-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300">🔴 Системный адрес — недоступен</p>
      )}
      {state.kind === 'rejected' && (
        <p className="mb-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300">{state.reason}</p>
      )}

      <input
        type="text"
        value={targetUrl}
        onChange={(e) => setTargetUrl(e.target.value)}
        placeholder="https://example.com — необязательно"
        className="mb-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-400/50"
      />
      {!targetUrl.trim() && (
        <p className="mb-2 text-[11px] leading-relaxed text-gray-500">
          Оставьте пустым — символ будет вести на вашу страницу tapni.kz. Адрес можно изменить в любой момент.
        </p>
      )}

      <button
        type="button"
        onClick={reserve}
        disabled={submitting || state.kind !== 'free'}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-900/50 transition-colors hover:bg-violet-500 disabled:bg-white/5 disabled:text-gray-600 disabled:shadow-none"
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Zap className="h-3.5 w-3.5" /> Застолбить символ</>}
      </button>

      {submitMsg && (
        <p className={`mt-2 text-xs ${submitMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{submitMsg.text}</p>
      )}

      {state.kind === 'free' && (
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          Будет доступно сразу по двум адресам: <span className="font-mono text-gray-400">tapni.kz/{state.normalized}</span> и <span className="font-mono text-gray-400">tapni.kz/tapni.kz/{state.normalized}</span>
        </p>
      )}

      {/* Existing reservations — a new alias never replaces an old one, and
          every alias already owned can be repointed to a different target. */}
      {myAliases !== null && myAliases.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-violet-300">Ваши символы</p>
          <div className="space-y-2">
            {myAliases.map((a) => (
              <div key={a.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-sm text-white">{a.aliasRaw}</span>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${TIER_STYLE[a.category].badge}`}>
                      {CATEGORY_LABELS[a.category].label}
                    </span>
                  </div>
                  {editingId === a.id ? (
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingId(a.id); setEditUrl(a.targetUrl ?? '') }}
                      className="flex flex-shrink-0 items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
                    >
                      <Pencil className="h-3 w-3" /> Изменить
                    </button>
                  )}
                </div>

                {editingId === a.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="пусто — на вашу страницу"
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-violet-400/50"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(a.id)}
                      disabled={editSaving}
                      className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mb-2 truncate text-[11px] text-gray-500">
                      {a.targetUrl ? `→ ${a.targetUrl}` : '→ на вашу страницу tapni.kz'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.urls.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => copy(u, u)}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-mono text-[10px] text-gray-400 transition-colors hover:border-violet-400/40 hover:text-violet-200"
                        >
                          {copied === u ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                          {u.replace('https://', '')}
                        </button>
                      ))}
                    </div>
                  </>
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
    case 'premium_required': return 'Доступно только на Premium'
    case 'reserved_route': return 'Системный адрес — недоступен'
    case 'non_ascii_letter': return 'Только латиница и эмодзи — кириллица недоступна'
    case 'too_long': return `Максимум ${MAX_ALIAS_GRAPHEMES} символов`
    case 'too_many_bytes': return 'Слишком длинная комбинация эмодзи — сократите'
    case 'already_taken_alias': return 'Уже занято'
    case 'already_taken_username': return 'Занято пользователем'
    case 'not_found': return 'Не найдено'
    case 'unauthorized': return 'Войдите заново'
    default: return 'Ошибка. Попробуйте снова.'
  }
}
