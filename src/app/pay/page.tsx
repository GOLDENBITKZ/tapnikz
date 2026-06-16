'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, AlertCircle, Building2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const KASPI_PAY = 'https://pay.kaspi.kz/pay/fugemta0'
const HALYK_PHONE = '+77755696531'

const WA_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const FEATURES = [
  'Безлимитное число кнопок',
  'Свой логотип на странице',
  'Все типы ссылок (Telegram, YouTube, TikTok, Facebook…)',
  'Темы: 💄 Блогер, 💼 Бизнес, 🛒 Селлер',
  'Без водяного знака tapni.kz',
  'QR-код для печати на визитках',
  'Смена адреса tapni.kz/ник',
]

type Plan = 'monthly' | 'annual'

export default function PayPage() {
  const [plan, setPlan] = useState<Plan>('annual')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [refCopied, setRefCopied] = useState(false)

  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ company: '', bin: '' })
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceMsg, setInvoiceMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const price = plan === 'annual' ? '10 000' : '1 000'
  const days = plan === 'annual' ? 365 : 30
  const refCode = username.trim() ? `TAP-${username.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')}` : 'TAP-ваш-ник'
  const waText = encodeURIComponent(`Оплатил Premium ${refCode}`)
  const WA_AFTER = `https://wa.me/77755696531?text=${waText}`

  function copyRef() {
    const u = username.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!u) return
    navigator.clipboard.writeText(`TAP-${u}`).then(() => {
      setRefCopied(true)
      setTimeout(() => setRefCopied(false), 2000)
    })
  }

  async function handlePaid() {
    const u = username.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!u) { setMsg({ type: 'err', text: 'Введите ваш username на tapni.kz' }); return }
    setLoading(true)
    setMsg(null)
    try {
      // FIX #1: require auth so only the account owner can claim payment
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
      setMsg({
        type: 'ok',
        text: json.provisioned
          ? `✅ Premium активирован! Зайдите в личный кабинет — все функции уже доступны.`
          : `Запрос отправлен. Активируем Premium в ближайшее время.`,
      })
    } catch {
      setMsg({ type: 'err', text: 'Ошибка. Напишите нам напрямую в WhatsApp.' })
    } finally {
      setLoading(false)
    }
  }

  async function sendInvoice() {
    const u = username.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!u) { setInvoiceMsg({ type: 'err', text: 'Сначала введите ваш username выше' }); return }
    if (!invoiceForm.company.trim()) { setInvoiceMsg({ type: 'err', text: 'Введите название компании' }); return }
    const binClean = invoiceForm.bin.replace(/\s/g, '')
    if (!/^\d{12}$/.test(binClean)) { setInvoiceMsg({ type: 'err', text: 'БИН — 12 цифр' }); return }
    setInvoiceLoading(true)
    setInvoiceMsg(null)
    try {
      // FIX #1: require auth for invoice requests too
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) {
        setInvoiceMsg({ type: 'err', text: 'Войдите в личный кабинет, затем вернитесь сюда' })
        return
      }
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          type: 'invoice_request',
          username: u,
          company: invoiceForm.company.trim(),
          bin: binClean,
        }),
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#08080f] px-5 py-12 text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-800/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-5">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-3">
          <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20 shadow-xl shadow-violet-900/40" />
          <span className="text-lg font-extrabold tracking-tight text-white">tapni.kz</span>
        </Link>

        {/* Plan toggle */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'monthly' as Plan, price: '1 000 ₸', period: 'в месяц' },
            { id: 'annual' as Plan, price: '10 000 ₸', period: 'в год', badge: 'ЛУЧШЕЕ', save: 'экономия 2 000 ₸' },
          ]).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPlan(p.id); setMsg(null) }}
              className={`relative rounded-2xl border p-4 text-center transition-all duration-200 ${
                plan === p.id
                  ? p.id === 'annual'
                    ? 'border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/30'
                    : 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-black">{p.badge}</span>
                </div>
              )}
              <p className="text-xl font-extrabold text-white">{p.price}</p>
              <p className="text-xs text-gray-400">{p.period}</p>
              {p.save && <p className="mt-0.5 text-[10px] font-medium text-yellow-400">{p.save}</p>}
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-300">⚡ Что входит в Premium</p>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Username input (shared for all payment methods) */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="mb-2 text-sm font-semibold text-white">Ваш адрес на tapni.kz</p>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] focus-within:border-violet-500/60 transition-colors">
            <span className="pl-3 pr-1 text-sm text-gray-500 flex-shrink-0">tapni.kz/</span>
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
              className="flex-1 bg-transparent py-3 pr-3 text-sm text-white placeholder-gray-600 outline-none"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-600">Указывайте при любом способе оплаты</p>
        </div>

        {/* Reference code */}
        {username.trim() && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">Код платежа — укажите в назначении</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-black/30 px-3 py-2 font-mono text-sm font-bold tracking-wider text-white">
                {refCode}
              </code>
              <button
                type="button"
                onClick={copyRef}
                className="flex-shrink-0 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/30"
              >
                {refCopied ? '✓' : 'Копировать'}
              </button>
            </div>
          </div>
        )}

        {/* Kaspi Pay */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="mb-3 text-sm font-semibold text-white">💳 Оплата через Kaspi</p>
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
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="mb-3 text-sm font-semibold text-white">🏦 Перевод через Halyk Bank</p>
          <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="mb-0.5 text-[11px] text-gray-500">Номер для перевода</p>
            <p className="text-lg font-extrabold tracking-widest text-white">{HALYK_PHONE}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">Получатель: Голденбит Казахстан</p>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white/[0.04] px-3 py-2">
              <p className="text-xs text-gray-400">Сумма</p>
              <p className="text-sm font-bold text-white">{price} ₸</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] px-3 py-2">
              <p className="text-xs text-gray-400">Назначение</p>
              <p className="font-mono text-sm font-bold text-amber-400 truncate">{refCode}</p>
            </div>
          </div>
          <a
            href={WA_AFTER}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] transition-all hover:bg-[#25D366]/20 active:scale-[0.98]"
          >
            {WA_ICON}
            Написать в WhatsApp после перевода
          </a>
        </div>

        {/* Confirm after payment */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="mb-1 text-sm font-semibold text-white">✅ Уже оплатили?</p>
          <p className="mb-3 text-xs text-gray-400">
            Нажмите кнопку — Premium активируется мгновенно ({days} дней доступа)
          </p>
          {msg && (
            <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
              msg.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Я оплатил — активировать Premium
          </button>
        </div>

        {/* Invoice for legal entities */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
          <button
            type="button"
            onClick={() => setShowInvoice((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-300">
              <Building2 className="h-4 w-4" />
              Выставить счёт для юридического лица
            </span>
            <span className="text-xs text-gray-500">{showInvoice ? '▲' : '▼'}</span>
          </button>

          {showInvoice && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-400">
                Только годовой тариф — <span className="font-semibold text-white">10 000 ₸/год</span>.
                Счёт вышлем в WhatsApp в течение 2 часов.
              </p>
              <input
                type="text"
                value={invoiceForm.company}
                onChange={(e) => { setInvoiceForm((p) => ({ ...p, company: e.target.value })); setInvoiceMsg(null) }}
                placeholder="Название компании (ТОО, ИП...)"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-blue-500/60"
              />
              <input
                type="text"
                value={invoiceForm.bin}
                onChange={(e) => { setInvoiceForm((p) => ({ ...p, bin: e.target.value.replace(/\D/g, '').slice(0, 12) })); setInvoiceMsg(null) }}
                placeholder="БИН — 12 цифр"
                inputMode="numeric"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-blue-500/60"
              />
              {invoiceMsg && (
                <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                  invoiceMsg.type === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
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
                {invoiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Запросить счёт на оплату
              </button>
            </div>
          )}
        </div>

        <p className="text-center">
          <Link href="/" className="text-xs text-gray-500 transition-colors hover:text-gray-300">
            ← На главную
          </Link>
        </p>
      </div>
    </main>
  )
}
