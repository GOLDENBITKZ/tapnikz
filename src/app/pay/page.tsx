'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, Building2, Send } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { KASPI_PAY_URL, SUPPORT_PHONE } from '@/lib/payment-config'

const KASPI_PAY = KASPI_PAY_URL
const HALYK_PHONE = SUPPORT_PHONE
const TG_BOT = '/go/tg?u=Tapnikzbot'

const TG_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
)

const WA_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const FEATURES = [
  'Безлимитное число кнопок',
  'Все типы: Kaspi Pay, 2ГИС, видео, FAQ, прайс, форма заявок',
  'Аналитика: просмотры и CTR по каждой кнопке',
  'Свой логотип и 6 тем оформления',
  'QR-код для визиток и рекламных материалов',
  'Смена адреса tapni.kz/ник',
  'Без водяного знака tapni.kz',
]

type Plan = 'monthly' | 'annual'

export default function PayPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan>('annual')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [refCopied, setRefCopied] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ company: '', bin: '' })
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceMsg, setInvoiceMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Auto-fill username and premium status for logged-in users
  useEffect(() => {
    const sb = getSupabase()
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      sb.from('profiles').select('username, is_premium, subscription_expires_at').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.username) setUsername(data.username)
          if (data?.is_premium) {
            setIsPremium(true)
            setExpiresAt(data.subscription_expires_at ?? null)
          }
        })
    })
  }, [])

  const price = plan === 'annual' ? '10 000' : '1 000'
  const days = plan === 'annual' ? 365 : 30
  const u = username.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  const refCode = u ? `TAP-${u}` : 'TAP-ваш-ник'
  const tgReceiptLink = u ? `${TG_BOT}?start=receipt_${u}` : TG_BOT
  const waText = encodeURIComponent(`Оплатил Premium ${refCode}`)
  const WA_AFTER = `https://wa.me/77755696531?text=${waText}`

  function copyRef() {
    if (!u) return
    navigator.clipboard.writeText(refCode).then(() => {
      setRefCopied(true)
      setTimeout(() => setRefCopied(false), 2000)
    })
  }

  async function handlePaid() {
    if (!u) { setMsg({ type: 'err', text: 'Введите ваш username на tapni.kz' }); return }
    setLoading(true)
    setMsg(null)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) {
        setMsg({ type: 'err', text: 'Войдите в личный кабинет, затем вернитесь сюда' })
        return
      }
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: 'payment_request', username: u, plan }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json().catch(() => ({}))
      if (json.provisioned) {
        router.push('/dashboard?premium=1')
        return
      }
      setMsg({ type: 'ok', text: `Запрос отправлен. Активируем Premium в ближайшее время.` })
    } catch {
      setMsg({ type: 'err', text: 'Ошибка. Напишите нам напрямую в WhatsApp.' })
    } finally {
      setLoading(false)
    }
  }

  async function sendInvoice() {
    if (!u) { setInvoiceMsg({ type: 'err', text: 'Сначала введите ваш username выше' }); return }
    if (!invoiceForm.company.trim()) { setInvoiceMsg({ type: 'err', text: 'Введите название компании' }); return }
    const binClean = invoiceForm.bin.replace(/\s/g, '')
    if (!/^\d{12}$/.test(binClean)) { setInvoiceMsg({ type: 'err', text: 'БИН — 12 цифр' }); return }
    setInvoiceLoading(true)
    setInvoiceMsg(null)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) {
        setInvoiceMsg({ type: 'err', text: 'Войдите в личный кабинет, затем вернитесь сюда' })
        return
      }
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: 'invoice_request', username: u, company: invoiceForm.company.trim(), bin: binClean }),
      })
      if (!res.ok) throw new Error()
      setInvoiceMsg({ type: 'ok', text: 'Запрос принят! Вышлем счёт в WhatsApp в течение 2 часов.' })
    } catch {
      setInvoiceMsg({ type: 'err', text: 'Ошибка. Напишите нам в WhatsApp.' })
    } finally {
      setInvoiceLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-5 py-12 text-gray-900 selection:bg-violet-200/60">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute right-0 bottom-1/4 h-[300px] w-[300px] rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-5">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-3">
          <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-200 shadow-xl shadow-violet-100" />
          <span className="text-lg font-extrabold tracking-tight text-gray-900">tapni.kz Premium</span>
        </Link>

        {/* Already premium banner */}
        {isPremium && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
            <p className="text-sm font-bold text-green-700">✅ Ваш Premium активен</p>
            {expiresAt && (
              <p className="mt-1 text-xs text-gray-500">
                Действует до {new Date(expiresAt).toLocaleDateString('ru-KZ', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            <Link href="/dashboard" className="mt-3 block rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white">
              Открыть кабинет →
            </Link>
            <p className="mt-2 text-[11px] text-gray-400">Ниже можно продлить подписку досрочно</p>
          </div>
        )}

        {/* Plan toggle */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'monthly' as Plan, price: '1 000 ₸', period: 'в месяц' },
            { id: 'annual' as Plan, price: '10 000 ₸', period: 'в год', badge: 'ВЫГОДНО', save: 'экономия 2 000 ₸' },
          ]).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPlan(p.id); setMsg(null) }}
              className={`relative rounded-2xl border p-4 text-center transition-all duration-200 ${
                plan === p.id
                  ? p.id === 'annual'
                    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/30 shadow-sm shadow-amber-100'
                    : 'border-violet-400 bg-violet-50 ring-2 ring-violet-400/30'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">{p.badge}</span>
                </div>
              )}
              <p className="text-xl font-extrabold text-gray-900">{p.price}</p>
              <p className="text-xs text-gray-500">{p.period}</p>
              {p.save && <p className="mt-0.5 text-[10px] font-semibold text-amber-600">{p.save}</p>}
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-600">⚡ Что входит в Premium</p>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Username input */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-gray-900">Ваш адрес на tapni.kz</p>
          <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-colors">
            <span className="pl-3 pr-1 text-sm text-gray-400 flex-shrink-0">tapni.kz/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setMsg(null)
              }}
              placeholder="ваш-ник"
              autoCapitalize="none"
              autoCorrect="off"
              className="flex-1 bg-transparent py-3 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">Указывайте при любом способе оплаты</p>
        </div>

        {/* Reference code */}
        {u && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Код платежа — укажите в назначении перевода</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white border border-amber-200 px-3 py-2 font-mono text-sm font-bold tracking-wider text-gray-900">
                {refCode}
              </code>
              <button
                type="button"
                onClick={copyRef}
                className="flex-shrink-0 rounded-lg bg-amber-100 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
              >
                {refCopied ? '✓' : 'Копировать'}
              </button>
            </div>
          </div>
        )}

        {/* Kaspi Pay */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">💳 Оплата через Kaspi</p>
          <a
            href={KASPI_PAY}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F14635] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#d93b2b] active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3h3v7.5l6-7.5h3.5L11 11l7 10h-3.5L9 13.5 8 14.8V21H5V3z" />
            </svg>
            Оплатить {price} ₸ через Kaspi
          </a>
        </div>

        {/* Halyk Bank */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">🏦 Перевод через Halyk Bank</p>
          <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="mb-0.5 text-[11px] text-gray-400">Номер для перевода</p>
            <p className="text-lg font-extrabold tracking-widest text-gray-900">{HALYK_PHONE}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Получатель: Голденбит Казахстан</p>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-400">Сумма</p>
              <p className="text-sm font-bold text-gray-900">{price} ₸</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-xs text-gray-400">Назначение</p>
              <p className="font-mono text-sm font-bold text-amber-700 truncate">{refCode}</p>
            </div>
          </div>
        </div>

        {/* === AFTER PAYMENT: Telegram receipt (PRIMARY) === */}
        <div className="rounded-2xl border-2 border-[#229ED9]/30 bg-[#229ED9]/5 p-4">
          <p className="mb-1 text-sm font-bold text-gray-900">✅ После оплаты — отправьте чек в Telegram</p>
          <p className="mb-3 text-xs text-gray-500">
            Бот автоматически проверит чек и активирует Premium без ожидания
          </p>
          <a
            href={tgReceiptLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#1a8bbf] active:scale-[0.98]"
          >
            {TG_ICON}
            Отправить чек в @Tapnikzbot
          </a>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#229ED9]/20 bg-white/60 px-3 py-2.5">
            <span className="text-base">📋</span>
            <p className="text-[11px] leading-relaxed text-gray-500">
              Откройте бот → отправьте скриншот или PDF чека → Premium активируется автоматически.
              Принимаются чеки Kaspi Pay и Halyk Bank.
            </p>
          </div>

          {/* Alternative: WhatsApp */}
          <a
            href={WA_AFTER}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
          >
            {WA_ICON}
            Или написать в WhatsApp с чеком
          </a>
        </div>

        {/* Manual fallback (collapsed) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="flex w-full items-center justify-between text-sm text-gray-500"
          >
            <span>Нет Telegram? Отметьте оплату вручную</span>
            <span className="text-xs">{showManual ? '▲' : '▼'}</span>
          </button>

          {showManual && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-400">
                Активация вручную — до 6 часов в рабочее время. Для мгновенной активации используйте Telegram бот выше.
              </p>
              {msg && (
                <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                  msg.type === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-600'
                }`}>
                  {msg.type === 'ok'
                    ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    : <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
                  {msg.text}
                </div>
              )}
              <button
                onClick={handlePaid}
                disabled={loading || msg?.type === 'ok'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 text-sm font-bold text-white transition-all hover:bg-gray-700 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Я оплатил — запрос на активацию
              </button>
              {msg?.type === 'ok' && (
                <Link
                  href="/dashboard"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-100"
                >
                  Открыть личный кабинет →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Invoice for legal entities */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <button
            type="button"
            onClick={() => setShowInvoice((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Building2 className="h-4 w-4" />
              Счёт для юридического лица
            </span>
            <span className="text-xs text-gray-400">{showInvoice ? '▲' : '▼'}</span>
          </button>

          {showInvoice && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-500">
                Только годовой тариф — <span className="font-semibold text-gray-700">10 000 ₸/год</span>.
                Счёт вышлем в WhatsApp в течение 2 часов.
              </p>
              <input
                type="text"
                value={invoiceForm.company}
                onChange={(e) => { setInvoiceForm((p) => ({ ...p, company: e.target.value })); setInvoiceMsg(null) }}
                placeholder="Название компании (ТОО, ИП...)"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                value={invoiceForm.bin}
                onChange={(e) => { setInvoiceForm((p) => ({ ...p, bin: e.target.value.replace(/\D/g, '').slice(0, 12) })); setInvoiceMsg(null) }}
                placeholder="БИН — 12 цифр"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {invoiceMsg && (
                <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                  invoiceMsg.type === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-600'
                }`}>
                  {invoiceMsg.type === 'ok'
                    ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    : <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
                  {invoiceMsg.text}
                </div>
              )}
              <button
                type="button"
                onClick={sendInvoice}
                disabled={invoiceLoading || invoiceMsg?.type === 'ok'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60"
              >
                {invoiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Запросить счёт на оплату
              </button>
            </div>
          )}
        </div>

        <p className="text-center">
          <Link href="/" className="text-xs text-gray-400 transition-colors hover:text-gray-700">
            ← На главную
          </Link>
        </p>
      </div>
    </main>
  )
}
