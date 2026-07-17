'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Users, CheckCircle, DollarSign, Clock, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const SITE_URL = 'https://tapni.kz'

interface ManagerStats {
  total_clients: number
  premium_clients: number
  total_earned: number
  pending_payout: number
}

interface ClientRow {
  username: string
  business_name: string | null
  is_premium: boolean
  is_promo: boolean
  created_at: string
}

interface CommissionRow {
  id: string
  client_username: string
  plan: string
  sale_amount: number
  commission_amount: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
}

interface ManagerData {
  stats: ManagerStats
  manager_since: string | null
  telegram_linked: boolean
  clients: ClientRow[]
  commissions: CommissionRow[]
}

const FAQ = [
  {
    q: 'Что такое tapni.kz?',
    a: 'tapni.kz — это мобильная визитка с кнопками WhatsApp, 2ГИС, Kaspi, Instagram и другими. Один QR-код или ссылка — и клиент сразу попадает в нужный канал. Не нужно запоминать 10 номеров и ссылок.',
  },
  {
    q: 'Кому это подходит?',
    a: 'Любому бизнесу в Казахстане: кафе, салонам красоты, мастерам, риелторам, продавцам Kaspi, блогерам, врачам. Если у человека есть телефон и клиенты — tapni.kz им поможет.',
  },
  {
    q: 'Сколько стоит и что входит в Premium?',
    a: 'Бесплатный план — 3 кнопки. Premium: месяц — 1 000 ₸, год — 10 000 ₸. Premium даёт безлимит кнопок, собственный логотип, кастомный адрес страницы, QR-код для печати, аналитику и приоритетную поддержку.',
  },
  {
    q: 'Как вы зарабатываете как менеджер?',
    a: 'Вы получаете персональную ссылку с вашим кодом. Когда клиент регистрируется по ней и впервые оплачивает подписку, вам автоматически начисляется 20% комиссии. Комиссия — только за первую оплату. Уведомление приходит в Telegram. Выплата — по запросу через бота (@Tapnikzbot).',
  },
  {
    q: 'Скрипт продажи — как представить продукт?',
    a: '"Я представляю tapni.kz — это мобильная визитка, которая заменяет все ваши ссылки и контакты. Ваши клиенты сканируют QR-код или переходят по ссылке — и сразу видят кнопки WhatsApp, 2ГИС, Kaspi. Попробуйте бесплатно, Premium — 1 000 ₸/месяц."',
  },
  {
    q: 'Частые возражения и ответы',
    a: '"У меня уже есть сайт" → tapni.kz не заменяет сайт, он дополняет: быстрый доступ с телефона без поиска. "Дорого" → 1 000 ₸/мес — это ~33 ₸ в день, меньше стоимости доставки. "Не разберусь" → настройка за 5 минут, я помогу лично.',
  },
]

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

export default function ManagerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [username, setUsername] = useState('')
  const [data, setData] = useState<ManagerData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }

      // Check if user is a manager via a quick profile fetch
      const { data: prof } = await getSupabase()
        .from('profiles')
        .select('username, is_manager')
        .eq('id', session.user.id)
        .single()

      if (!prof?.is_manager) { router.replace('/dashboard'); return }

      setUsername(prof.username)

      // Fetch manager stats
      const res = await fetch('/api/manager', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setData(await res.json())
      } else {
        setFetchError(true)
      }
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    await getSupabase().auth.signOut()
    router.replace('/')
  }

  async function copyLink() {
    const url = `${SITE_URL}/auth?ref=${username}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-700 text-center">Не удалось загрузить данные кабинета.<br />Проверьте подключение и обновите страницу.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          Обновить
        </button>
      </div>
    )
  }

  const refLink = `${SITE_URL}/auth?ref=${username}`
  const stats = data?.stats
  const clients = data?.clients ?? []
  const commissions = data?.commissions ?? []
  const managerSince = data?.manager_since
    ? new Date(data.manager_since).toLocaleDateString('ru-KZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-bold text-lg text-violet-600 tracking-tight">tapni.kz</a>
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Кабинет</a>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Привет, @{username}!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Кабинет менеджера tapni.kz
            {managerSince && <span className="ml-2 text-gray-400">· Менеджер с {managerSince}</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users className="w-5 h-5 text-violet-600" />}
            label="Всего клиентов"
            value={String(stats?.total_clients ?? 0)}
            color="bg-violet-50"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            label="Платных"
            value={String(stats?.premium_clients ?? 0)}
            color="bg-green-50"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-blue-600" />}
            label="Заработано ₸"
            value={(stats?.total_earned ?? 0).toLocaleString('ru-KZ')}
            color="bg-blue-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label="К выплате ₸"
            value={(stats?.pending_payout ?? 0).toLocaleString('ru-KZ')}
            color="bg-amber-50"
          />
        </div>

        {/* Telegram not linked warning */}
        {!data?.telegram_linked && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-blue-500 mt-0.5">💬</span>
            <div>
              <span className="font-medium text-blue-800">Привяжите Telegram чтобы получать уведомления о комиссиях.</span>
              <span className="text-blue-700">
                {' '}Откройте <a href="/go/tg?u=Tapnikzbot" className="underline font-medium">@Tapnikzbot</a> и поделитесь номером телефона.
              </span>
            </div>
          </div>
        )}

        {/* Payout hint — show only if there's pending payout */}
        {(stats?.pending_payout ?? 0) > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-500 mt-0.5">💡</span>
            <div>
              <span className="font-medium text-amber-800">У вас {(stats!.pending_payout).toLocaleString('ru-KZ')} ₸ к выплате.</span>
              <span className="text-amber-700">
                {' '}Напишите <a href="/go/tg?u=Tapnikzbot" className="underline font-medium">/paid в @Tapnikzbot</a> для запроса.
                Минимум для выплаты: 2 000 ₸.
              </span>
            </div>
          </div>
        )}

        {/* Referral link */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ваша реферальная ссылка</h2>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={refLink}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-3 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Отправляйте эту ссылку клиентам — их регистрации привязываются к вам автоматически.</p>
        </div>

        {/* Clients table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-gray-800">Мои клиенты</h2>
            {clients.some((c: ClientRow) => c.is_promo) && (
              <span className="text-[11px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 border border-amber-200">
                🎁 Промо-клиенты — комиссии не начисляются
              </span>
            )}
          </div>
          {clients.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Пока нет клиентов. Поделитесь ссылкой выше!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2 text-left font-medium">Ник</th>
                    <th className="px-4 py-2 text-left font-medium">Название</th>
                    <th className="px-4 py-2 text-left font-medium">Дата</th>
                    <th className="px-4 py-2 text-left font-medium">Статус</th>
                    <th className="px-4 py-2 text-right font-medium">Комиссия ₸</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const comm = commissions
                      .filter(cm => cm.client_username === c.username)
                      .reduce((s, cm) => s + cm.commission_amount, 0)
                    return (
                      <tr key={c.username} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-800 font-medium">@{c.username}</td>
                        <td className="px-4 py-3 text-gray-600">{c.business_name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(c.created_at).toLocaleDateString('ru-KZ')}
                        </td>
                        <td className="px-4 py-3">
                          {c.is_promo
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">🎁 Промо</span>
                            : c.is_premium
                              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">Premium</span>
                              : <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Free</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {c.is_promo
                            ? <span className="text-xs text-amber-500 font-normal">—</span>
                            : comm > 0 ? comm.toLocaleString('ru-KZ') : '—'
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Commission history */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">История комиссий</h2>
          </div>
          {commissions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Комиссии появятся когда клиент оплатит подписку.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2 text-left font-medium">Дата</th>
                    <th className="px-4 py-2 text-left font-medium">Клиент</th>
                    <th className="px-4 py-2 text-left font-medium">Тариф</th>
                    <th className="px-4 py-2 text-right font-medium">Продажа ₸</th>
                    <th className="px-4 py-2 text-right font-medium">Комиссия ₸</th>
                    <th className="px-4 py-2 text-right font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('ru-KZ')}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">@{c.client_username}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.plan === 'annual' ? '⭐ Год' : '📅 Месяц'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {c.sale_amount.toLocaleString('ru-KZ')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {c.commission_amount.toLocaleString('ru-KZ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'paid' && (
                          <span className="inline-block text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">Выплачено</span>
                        )}
                        {c.status === 'pending' && (
                          <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">Ожидает</span>
                        )}
                        {c.status === 'cancelled' && (
                          <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Отменено</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product guide */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">О продукте — гайд для консультаций</h2>
            <p className="text-xs text-gray-400 mt-0.5">Читайте перед встречей с клиентом</p>
          </div>
          <div className="p-4 space-y-2">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          tapni.kz · По вопросам выплат напишите в{' '}
          <a href="/go/tg?u=Tapnikzbot" className="text-violet-500 hover:underline">@Tapnikzbot</a>
        </p>
      </div>
    </div>
  )
}
