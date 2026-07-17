'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, Eye, EyeOff, Phone } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

type Tab = 'login' | 'register'

type LoginForm = { phone: string; password: string }
type RegisterForm = {
  phone: string
  username: string
  business_name: string
  password: string
}
type FieldErrors = Record<string, string>

const EMPTY_LOGIN: LoginForm = { phone: '', password: '' }
const EMPTY_REGISTER: RegisterForm = {
  phone: '',
  username: '',
  business_name: '',
  password: '',
}

// Supabase Auth requires an email — we derive one from the phone number
// internally so the user only ever sees and enters their phone.
function phoneToEmail(phone: string) {
  return `${phone}@users.tapni.kz`
}

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillName = searchParams.get('name') ?? ''
  const [tab, setTab] = useState<Tab>('login')
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState<LoginForm>(EMPTY_LOGIN)
  const [regForm, setRegForm] = useState<RegisterForm>({ ...EMPTY_REGISTER, business_name: prefillName })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    const tabParam = searchParams.get('tab')
    const nameParam = searchParams.get('name')
    const usernameParam = searchParams.get('username')
    if (ref) {
      // Sanitize: only allow valid username characters, matching DB CHECK constraint
      const clean = ref.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '').slice(0, 40)
      if (clean.length >= 2) {
        setReferredBy(clean)
        setTab('register')
      }
    }
    if (usernameParam) {
      // Pre-fill username from 404 CTA (?username=some-slug)
      const cleanUsername = usernameParam.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '').slice(0, 40)
      if (cleanUsername.length >= 2) {
        setRegForm((f) => ({ ...f, username: cleanUsername }))
        setTab('register')
      }
    }
    if (nameParam || tabParam === 'register') {
      setTab('register')
    }
  }, [searchParams])

  function clearErrors() {
    setError('')
    setFieldErrors({})
  }

  function normalizePhone(raw: string) {
    let digits = raw.replace(/\D/g, '')
    // 87001234567 (Russian/KZ style starting with 8) → 77001234567
    if (digits.startsWith('8') && digits.length >= 10) {
      digits = '7' + digits.slice(1)
    }
    // +7 77001234567 or extra leading 7 → trim
    if (digits.startsWith('77') && digits.length === 12) {
      digits = digits.slice(1)
    }
    return digits.slice(0, 11)
  }

  function handleLoginChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const processed = name === 'phone' ? normalizePhone(value) : value
    setLoginForm((p) => ({ ...p, [name]: processed }))
    clearErrors()
  }

  function handleRegChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    let processed = value
    if (name === 'phone') processed = normalizePhone(value)
    if (name === 'username')
      processed = value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    setRegForm((p) => ({ ...p, [name]: processed }))
    clearErrors()
  }

  function validatePhone(phone: string) {
    return /^7\d{10}$/.test(phone)
  }

  function validateRegister(): FieldErrors {
    const e: FieldErrors = {}
    if (!regForm.phone) e.phone = 'Обязательное поле'
    else if (!validatePhone(regForm.phone))
      e.phone = 'Формат: 7XXXXXXXXXX (11 цифр)'
    if (!regForm.username) e.username = 'Обязательное поле'
    else if (regForm.username.length < 3) e.username = 'Минимум 3 символа'
    else if (regForm.username.length > 32) e.username = 'Максимум 32 символа'
    if (!regForm.business_name) e.business_name = 'Обязательное поле'
    if (!regForm.password) e.password = 'Обязательное поле'
    else if (regForm.password.length < 8) e.password = 'Минимум 8 символов'
    return e
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginForm.phone || !loginForm.password) {
      setError('Заполните все поля')
      return
    }
    if (!validatePhone(loginForm.phone)) {
      setFieldErrors({ phone: 'Формат: 7XXXXXXXXXX (11 цифр)' })
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await getSupabase().auth.signInWithPassword({
        email: phoneToEmail(loginForm.phone),
        password: loginForm.password,
      })
      if (authError) throw authError
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа'
      setError(
        msg.includes('Invalid login credentials')
          ? 'Неверный номер или пароль'
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateRegister()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    setError('')
    try {
      // FIX #4: block reserved slugs at registration (dashboard checks it on rename)
      const RESERVED_SLUGS = new Set([
        'auth', 'dashboard', 'pay', 'api', 'admin', 'tapni', 'home', 'root',
        'sitemap.xml', 'robots.txt', 'about', 'privacy', 'terms', 'login', 'register',
        'kaspi-prodavets', 'instagram-bloger', 'kafe-restoran', 'master-uslugi',
        'salon-krasoty', 'fotografy', 'fitness', 'nedvizhimost', 'avto', 'dostavka',
        'almaty', 'astana', 'shymkent', 'aktobe', 'karaganda', 'atyrau',
        'kostanay', 'pavlodar', 'semey', 'taraz',
        'discover', 'help', 'partners',
      ])
      if (RESERVED_SLUGS.has(regForm.username)) {
        setFieldErrors({ username: `Имя «${regForm.username}» зарезервировано` })
        setLoading(false)
        return
      }

      // Check username availability
      const { data: existing } = await getSupabase()
        .from('profiles')
        .select('username')
        .eq('username', regForm.username)
        .maybeSingle()

      if (existing) {
        setFieldErrors({ username: `Имя «${regForm.username}» уже занято` })
        setLoading(false)
        return
      }

      // Check phone not already registered
      const { data: existingPhone } = await getSupabase()
        .from('profiles')
        .select('phone')
        .eq('phone', regForm.phone)
        .maybeSingle()

      if (existingPhone) {
        setFieldErrors({ phone: 'Этот номер уже зарегистрирован' })
        setLoading(false)
        return
      }

      // Create Supabase auth user (email derived from phone)
      const { data: authData, error: signUpError } =
        await getSupabase().auth.signUp({
          email: phoneToEmail(regForm.phone),
          password: regForm.password,
        })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Не удалось создать аккаунт')

      // Create profile
      const { error: profileError } = await getSupabase()
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            username: regForm.username,
            business_name: regForm.business_name,
            phone: regForm.phone,
            bio: null,
            theme: 'dark',
            is_premium: false,
            // Prevent self-referral: manager cannot earn commission from their own account
            ...(referredBy && referredBy !== regForm.username.toLowerCase() ? { referred_by: referredBy } : {}),
          },
        ])

      if (profileError) throw profileError

      // Notify admin about new registration (non-blocking)
      const token = authData.session?.access_token
      fetch('/api/notify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'new_user',
          username: regForm.username,
          phone: regForm.phone,
          business_name: regForm.business_name,
        }),
      }).catch(() => {})

      router.push('/dashboard?welcome=1')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка регистрации'
      setError(
        msg.includes('already registered') || msg.includes('already been registered')
          ? 'Этот номер уже зарегистрирован — войдите'
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[#FAFAF8] text-gray-900 selection:bg-violet-200/60">

      {/* ── Left brand panel (desktop only) ──────────────────── */}
      <div className="relative hidden md:flex md:w-[44%] flex-col items-center justify-center overflow-hidden bg-[#0D0B1A] px-10 py-16">
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-0 h-[200px] w-[200px] rounded-full bg-amber-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <Link href="/">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="mx-auto mb-8 h-20 w-20 rounded-full object-cover ring-2 ring-violet-400/40 shadow-2xl shadow-violet-900/60" />
          </Link>
          <h1 className="mb-4 text-3xl font-black leading-[1.1] text-white lg:text-4xl">
            Ваш бизнес —<br />в одной ссылке
          </h1>
          <p className="mb-10 max-w-xs text-sm leading-relaxed text-violet-300/75">
            WhatsApp, Kaspi, 2ГИС и Instagram — всё в одном месте. Создайте за 30 секунд.
          </p>
          {/* Mini platform pills */}
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {[
              { label: 'WhatsApp', color: '#25D366' },
              { label: 'Kaspi Pay', color: '#F14635' },
              { label: '2ГИС', color: '#1DB256' },
              { label: 'Telegram', color: '#2AABEE' },
              { label: 'Instagram', color: '#E1306C' },
            ].map((p) => (
              <span key={p.label} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ color: p.color, borderColor: `${p.color}30`, backgroundColor: `${p.color}10` }}>
                {p.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-violet-400/50">Бизнесы по всему Казахстану</p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-12">
        {/* Ambient glow — mobile only */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden md:hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Logo — shown only on mobile (desktop panel has it) */}
          <Link href="/" className="mb-8 flex flex-col items-center gap-3 md:hidden">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-200 shadow-xl shadow-violet-100" />
            <span className="text-lg font-extrabold tracking-tight text-gray-900">tapni.kz</span>
          </Link>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-100/80">
            {/* Tabs */}
            <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
              {(
                [
                  ['login', 'Войти'],
                  ['register', 'Регистрация'],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id)
                    clearErrors()
                  }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                    tab === id
                      ? 'bg-white text-violet-700 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ─── Login ─── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <PhoneField
                  value={loginForm.phone}
                  name="phone"
                  onChange={handleLoginChange}
                  error={fieldErrors.phone}
                />
                <PasswordField
                  value={loginForm.password}
                  name="password"
                  onChange={handleLoginChange}
                  show={showPassword}
                  onToggle={() => setShowPassword((p) => !p)}
                  placeholder="Пароль"
                  autoComplete="current-password"
                />
                {error && <ErrorBanner message={error} />}
                <SubmitButton loading={loading} label="Войти" />
                <p className="text-center">
                  <Link href="/auth/reset" className="text-xs text-gray-400 transition-colors hover:text-violet-600">
                    Забыли пароль?
                  </Link>
                </p>
              </form>
            )}

            {/* ─── Register ─── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4" noValidate>
                {referredBy && (
                  <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
                    <span className="text-base">🎁</span>
                    <span>Вас пригласил <b>@{referredBy}</b> — добро пожаловать в tapni.kz!</span>
                  </div>
                )}
                <PhoneField
                  value={regForm.phone}
                  name="phone"
                  onChange={handleRegChange}
                  error={fieldErrors.phone}
                  hint="Используется для WhatsApp и поддержки"
                />

                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Адрес страницы <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`flex items-center overflow-hidden rounded-xl border bg-gray-50 transition-colors ${
                      fieldErrors.username
                        ? 'border-red-400'
                        : 'border-gray-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20'
                    }`}
                  >
                    <span className="select-none whitespace-nowrap pl-3 pr-1 text-sm text-gray-400">
                      tapni.kz/
                    </span>
                    <input
                      type="text"
                      name="username"
                      value={regForm.username}
                      onChange={handleRegChange}
                      placeholder="shop"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 bg-transparent py-3 pr-3 text-base text-gray-900 placeholder-gray-400 outline-none"
                    />
                  </div>
                  {fieldErrors.username && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                {/* Business name */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Название бизнеса / Имя{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    value={regForm.business_name}
                    onChange={handleRegChange}
                    placeholder="Цветы Алматы"
                    className={`w-full rounded-xl border bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors ${
                      fieldErrors.business_name
                        ? 'border-red-400'
                        : 'border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                    }`}
                  />
                  {fieldErrors.business_name && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldErrors.business_name}
                    </p>
                  )}
                </div>

                <PasswordField
                  value={regForm.password}
                  name="password"
                  onChange={handleRegChange}
                  show={showPassword}
                  onToggle={() => setShowPassword((p) => !p)}
                  placeholder="Пароль (минимум 8 символов)"
                  autoComplete="new-password"
                  error={fieldErrors.password}
                />

                {error && <ErrorBanner message={error} />}
                <SubmitButton loading={loading} label="Создать аккаунт" />

                <p className="text-center text-[10px] leading-relaxed text-gray-400">
                  Регистрируясь, вы соглашаетесь с условиями использования
                </p>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs">
            <Link href="/" className="text-gray-400 transition-colors hover:text-gray-700">
              ← На главную
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function PhoneField({
  value,
  name,
  onChange,
  error,
  hint,
}: {
  value: string
  name: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Phone className="h-3.5 w-3.5 text-emerald-500" />
        Номер телефона <span className="text-red-500">*</span>
      </label>
      <div
        className={`flex items-center overflow-hidden rounded-xl border bg-gray-50 transition-colors ${
          error
            ? 'border-red-400'
            : 'border-gray-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20'
        }`}
      >
        <span className="select-none pl-3 pr-1 text-sm font-medium text-gray-400">
          +
        </span>
        <input
          type="tel"
          name={name}
          value={value}
          onChange={onChange}
          placeholder="77001234567"
          inputMode="numeric"
          autoComplete="tel"
          className="flex-1 bg-transparent py-3 pr-3 text-base text-gray-900 placeholder-gray-400 outline-none"
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">
          Формат: 77001234567 или 87001234567
        </p>
      )}
    </div>
  )
}

function PasswordField({
  value,
  name,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
  error,
}: {
  value: string
  name: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean
  onToggle: () => void
  placeholder: string
  autoComplete: string
  error?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">
        Пароль <span className="text-red-500">*</span>
      </label>
      <div
        className={`flex items-center overflow-hidden rounded-xl border bg-gray-50 transition-colors ${
          error
            ? 'border-red-400'
            : 'border-gray-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20'
        }`}
      >
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent py-3 pl-3 pr-2 text-base text-gray-900 placeholder-gray-400 outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="px-3 text-gray-400 hover:text-gray-600"
        >
          {show ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  )
}

function SubmitButton({
  loading,
  label,
}: {
  loading: boolean
  label: string
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Подождите…
        </>
      ) : (
        label
      )}
    </button>
  )
}
