'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const SITE_URL = 'https://tapni.kz'

const STEPS = [
  { n: '1', title: 'Активируйте кабинет', desc: 'Нажмите кнопку ниже — вы сразу получаете личную ссылку и доступ к кабинету менеджера.' },
  { n: '2', title: 'Делитесь ссылкой', desc: 'Отправляйте вашу персональную ссылку клиентам: в WhatsApp, Instagram, на визитке, в сторис.' },
  { n: '3', title: 'Получайте комиссию', desc: 'Когда клиент впервые оплачивает подписку — вам автоматически начисляется 20% с этого платежа.' },
]

const CONDITIONS = [
  { icon: '💰', title: '20% с первой оплаты', desc: 'Месяц (1 000 ₸) → ~200 ₸ · Год (10 000 ₸) → ~2 000 ₸' },
  { icon: '👥', title: 'Без лимита клиентов', desc: 'Привлекайте сколько угодно — всё идёт в зачёт.' },
  { icon: '📊', title: 'Прозрачный кабинет', desc: 'Видите каждую комиссию: кто оплатил, сколько, статус.' },
  { icon: '⚡', title: 'Без вложений', desc: 'Регистрация и работа бесплатные. Активируете сами, без одобрения.' },
]

const EARNINGS = [
  { label: '5 клиентов оплачивают месяц (1 000 ₸)', comm: '~1 000 ₸' },
  { label: '10 клиентов оплачивают месяц', comm: '~2 000 ₸' },
  { label: '3 клиента оплачивают год (10 000 ₸)', comm: '~6 000 ₸' },
  { label: '5 клиентов оплачивают год', comm: '~10 000 ₸' },
]

const RULES = [
  'Спам и навязчивые методы продаж запрещены',
  'Обман клиентов — основание для немедленной блокировки',
  'Минимальная сумма для выплаты: 2 000 ₸',
  'Выплата в течение 7 рабочих дней после запроса',
  'Комиссия начисляется один раз — за первую оплату привлечённого клиента',
  'Менеджер без клиентов более 60 дней автоматически деактивируется (можно повторно активировать)',
]

const FAQS = [
  { q: 'Как начать работу?', a: 'Нажмите кнопку "Стать менеджером" на этой странице. Вы сразу получите доступ к кабинету с вашей личной ссылкой. Отправляйте её клиентам — кто перейдёт по ней и оплатит подписку, тот закрепляется за вами.' },
  { q: 'Когда начисляется комиссия — при регистрации или оплате?', a: 'Только при первой оплате. Если клиент зарегистрировался, но не купил подписку — комиссии нет. Как только оплатил — 20% автоматически начисляется вам.' },
  { q: 'Комиссия только за первую оплату или за каждое продление?', a: 'Только за первую оплату клиента. Это ваше вознаграждение за привлечение. Продление подписки новых комиссий не генерирует.' },
  { q: 'Что если клиент не продлит подписку?', a: 'Ваша комиссия за первую оплату уже начислена и сохраняется. Продление или истечение подписки не влияют на уже начисленную комиссию.' },
  { q: 'Как запросить выплату?', a: 'Напишите /paid в боте @Tapnikzbot или свяжитесь с администратором напрямую. Минимальная сумма для выплаты — 2 000 ₸. Выплата в течение 7 рабочих дней.' },
  { q: 'Что такое деактивация за неактивность?', a: 'Если за 60 дней после активации у вас не появился ни один клиент — статус менеджера снимается автоматически. За 15 дней до этого вы получите предупреждение в Telegram. Деактивированный менеджер может повторно активироваться здесь же в любое время.' },
  { q: 'Есть ли обучающие материалы?', a: 'Да. В кабинете менеджера есть раздел "О продукте" со скриптом продаж, разбором возражений и описанием продукта по нишам. Кабинет открывается сразу после активации.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

type AuthState = 'loading' | 'guest' | 'manager' | 'user'

export default function PartnersPage() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [activating, setActivating] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthState('guest'); return }
      setAccessToken(session.access_token)
      const { data: prof } = await getSupabase()
        .from('profiles')
        .select('is_manager')
        .eq('id', session.user.id)
        .single()
      setAuthState(prof?.is_manager ? 'manager' : 'user')
    })
  }, [])

  async function handleActivate() {
    if (!accessToken) { router.push('/auth?tab=register'); return }
    setActivating(true)
    try {
      const res = await fetch('/api/manager/activate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        router.push('/manager')
      } else {
        const body = await res.json().catch(() => ({}))
        alert(body?.error ?? 'Не удалось активировать. Попробуйте ещё раз.')
      }
    } catch {
      alert('Ошибка сети. Проверьте подключение и попробуйте снова.')
    } finally {
      setActivating(false)
    }
  }

  function ActivateButton() {
    if (authState === 'loading') {
      return (
        <button disabled className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 text-white rounded-xl text-lg font-semibold">
          <Loader2 className="w-5 h-5 animate-spin" />
        </button>
      )
    }
    if (authState === 'manager') {
      return (
        <Link href="/manager" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-700 rounded-xl text-lg font-semibold hover:bg-violet-50 transition-colors shadow-lg">
          Открыть кабинет менеджера →
        </Link>
      )
    }
    if (authState === 'guest') {
      return (
        <Link href="/auth?tab=register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-700 rounded-xl text-lg font-semibold hover:bg-violet-50 transition-colors shadow-lg">
          Зарегистрироваться и стать менеджером
        </Link>
      )
    }
    // user, not manager
    return (
      <button
        onClick={handleActivate}
        disabled={activating}
        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-700 rounded-xl text-lg font-semibold hover:bg-violet-50 transition-colors shadow-lg disabled:opacity-70"
      >
        {activating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {activating ? 'Активация...' : 'Стать менеджером — бесплатно'}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
        <Link href="/" className="flex items-center gap-2">
          <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
          <span className="font-bold text-lg text-violet-600 tracking-tight">tapni.kz</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/pay" className="text-gray-600 hover:text-gray-900 transition-colors">Тарифы</Link>
          {authState === 'manager' ? (
            <Link href="/manager" className="text-violet-600 font-medium hover:text-violet-700 transition-colors">Мой кабинет</Link>
          ) : authState === 'user' ? (
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">Кабинет</Link>
          ) : (
            <Link href="/auth" className="text-gray-600 hover:text-gray-900 transition-colors">Войти</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block bg-white/20 text-white text-sm font-medium px-3 py-1 rounded-full mb-4">
            Партнёрская программа
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Зарабатывайте с tapni.kz
          </h1>
          <p className="text-violet-100 text-lg mb-8 leading-relaxed">
            Рекомендуйте мобильные визитки — получайте <b className="text-white">20% комиссии</b> с первой оплаты клиента.<br />
            Без вложений, без одобрения, без лимитов.
          </p>
          <ActivateButton />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-14 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Как это работает</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 font-bold text-xl flex items-center justify-center mx-auto mb-3">
                {s.n}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Conditions */}
      <section className="bg-gray-50 px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Условия программы</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CONDITIONS.map((c) => (
              <div key={c.title} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-2xl mb-2">{c.icon}</div>
                <div className="font-semibold text-gray-900 mb-1">{c.title}</div>
                <div className="text-sm text-gray-500">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings example */}
      <section className="px-4 py-14 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Пример заработка</h2>
        <p className="text-center text-sm text-gray-400 mb-8">Приблизительный расчёт на основе средних тарифов</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Сценарий</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ваша комиссия (20%)</th>
              </tr>
            </thead>
            <tbody>
              {EARNINGS.map((e, i) => (
                <tr key={e.label} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="px-4 py-3 text-gray-700">{e.label}</td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-700">{e.comm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Who fits */}
      <section className="bg-violet-50 border-y border-violet-100 px-4 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Кому подходит</h2>
          <p className="text-gray-600 leading-relaxed">
            Маркетологи, SMM-специалисты, владельцы Telegram-каналов и Instagram-аккаунтов, менеджеры по продажам,
            фрилансеры, студенты — все, у кого есть аудитория предпринимателей или умение продавать.
            Особенно актуально для тех, кто уже работает с малым бизнесом в Казахстане.
          </p>
        </div>
      </section>

      {/* Rules */}
      <section className="px-4 py-14 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Правила программы</h2>
        <ul className="space-y-3">
          {RULES.map((r) => (
            <li key={r} className="flex items-start gap-3 text-sm text-gray-600">
              <span className="text-violet-400 mt-0.5 flex-shrink-0">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-4 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Частые вопросы</h2>
          <div className="space-y-2">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 py-16 text-center bg-gradient-to-br from-violet-600 to-indigo-700">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Готовы начать?</h2>
          <p className="text-violet-100 mb-8">Активируйте кабинет и получите личную ссылку прямо сейчас.</p>
          <ActivateButton />
          <p className="text-violet-200 text-xs mt-4">
            По вопросам:{' '}
            <a href="/go/tg?u=Tapnikzbot" className="underline hover:text-white transition-colors">
              @Tapnikzbot
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} tapni.kz · <Link href="/" className="hover:text-gray-600 transition-colors">Главная</Link> · <Link href="/pay" className="hover:text-gray-600 transition-colors">Тарифы</Link> · <a href="/go/tg?u=tapnikz_bot" className="hover:text-gray-600 transition-colors">Поддержка</a>
      </footer>
    </div>
  )
}
