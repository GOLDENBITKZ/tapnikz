'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

type State = 'waiting' | 'ready' | 'done' | 'error'

export default function SetPasswordPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // If PASSWORD_RECOVERY never fires (expired/used link), show error after 8s
    const timeout = setTimeout(() => setState('error'), 8000)
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout)
        setState('ready')
      }
    })
    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setErrorMsg('Минимум 8 символов'); return }
    if (password !== confirm) { setErrorMsg('Пароли не совпадают'); return }
    setErrorMsg('')
    setSaving(true)
    try {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw error
      setState('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения'
      setErrorMsg(msg.includes('same password') ? 'Новый пароль должен отличаться от старого' : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5 py-12 text-gray-900 selection:bg-violet-200/60">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3">
          <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-200 shadow-xl shadow-violet-100" />
          <span className="text-lg font-extrabold tracking-tight text-gray-900">tapni.kz</span>
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-100">
          {state === 'waiting' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm text-gray-500">Проверяем ссылку...</p>
              <p className="text-center text-xs text-gray-400">
                Если страница зависла — ссылка устарела или уже использована.{' '}
                <Link href="/auth/reset" className="text-violet-600 hover:underline">Запросить новую</Link>
              </p>
            </div>
          )}

          {state === 'ready' && (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
                  <Lock className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Задайте новый пароль</p>
                  <p className="text-xs text-gray-500">Минимум 8 символов</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg('') }}
                    placeholder="Новый пароль"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 pr-10 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrorMsg('') }}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Сохранить пароль
                </button>
              </form>
            </>
          )}

          {state === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-base font-bold text-gray-900">Пароль обновлён!</p>
              <p className="text-xs text-gray-500">Переходим в кабинет...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm font-semibold text-gray-900">Ссылка недействительна</p>
              <p className="text-xs text-gray-500">Возможно, ссылка устарела или уже использована.</p>
              <Link
                href="/auth/reset"
                className="mt-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
              >
                Запросить новую ссылку
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
