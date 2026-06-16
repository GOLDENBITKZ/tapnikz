import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Помощь и инструкции · tapni.kz',
  description: 'Ответы на частые вопросы: как добавить кнопку Kaspi Pay, 2ГИС, WhatsApp в Instagram bio. Пошаговые инструкции для tapni.kz.',
  alternates: { canonical: 'https://tapni.kz/help' },
}

const WA = 'https://wa.me/77755696531'
const TG = 'https://t.me/Tapnikzbot'

const SECTIONS = [
  {
    id: 'start',
    title: '🚀 Начало работы',
    items: [
      {
        q: 'Как зарегистрироваться?',
        a: [
          'Перейдите на tapni.kz и нажмите «Войти».',
          'Выберите вкладку «Регистрация».',
          'Введите номер телефона в формате 77001234567 (без +).',
          'Придумайте адрес страницы — например tapni.kz/flowers (только латиница, цифры, дефис).',
          'Введите название вашего бизнеса и пароль (минимум 8 символов).',
          'Нажмите «Создать аккаунт» — сразу попадёте в личный кабинет.',
        ],
      },
      {
        q: 'Как добавить кнопку WhatsApp?',
        a: [
          'В кабинете откройте вкладку «Ссылки».',
          'Выберите тип «💬 WhatsApp».',
          'В поле ввода введите только номер телефона: 77001234567 (без + и пробелов).',
          'Придумайте название кнопки, например «Написать нам».',
          'Нажмите «Добавить» — кнопка появится на вашей странице.',
        ],
      },
      {
        q: 'Как добавить кнопку Telegram?',
        a: [
          'Выберите тип «✈️ Telegram».',
          'Введите ваш username в Telegram (без @) — например username123.',
          'Или введите ссылку на канал: t.me/channel_name.',
          'Нажмите «Добавить».',
        ],
      },
      {
        q: 'Как поставить ссылку tapni.kz в Instagram bio?',
        a: [
          'Перейдите в Instagram → Редактировать профиль.',
          'Найдите поле «Ссылка» или «Ссылка в Bio».',
          'Введите ваш адрес: tapni.kz/ваш-ник.',
          'Сохраните. Теперь все контакты доступны через один тап.',
        ],
      },
    ],
  },
  {
    id: 'kaspi',
    title: '💳 Kaspi Pay и Kaspi магазин',
    items: [
      {
        q: 'Как найти ссылку для кнопки Kaspi Pay?',
        a: [
          'Откройте приложение Kaspi.kz на телефоне.',
          'Перейдите в раздел «Платежи» → «Мой QR-код».',
          'Нажмите кнопку «Поделиться».',
          'Скопируйте ссылку вида pay.kaspi.kz/pay/XXXXXXX.',
          'Вставьте эту ссылку в поле «Kaspi Pay» в личном кабинете.',
        ],
      },
      {
        q: 'Как добавить ссылку на Kaspi магазин?',
        a: [
          'Откройте приложение Kaspi.kz или kaspi.kz/shop в браузере.',
          'Перейдите в «Мой магазин» → нажмите «Поделиться».',
          'Скопируйте ссылку вида kaspi.kz/shop/info/XXXXXXX.',
          'Вставьте в поле «Kaspi магазин» в личном кабинете.',
        ],
      },
      {
        q: 'Как добавить конкретный товар с Kaspi?',
        a: [
          'Найдите нужный товар в приложении Kaspi.kz.',
          'Откройте страницу товара и нажмите «Поделиться».',
          'Скопируйте ссылку вида kaspi.kz/shop/p/XXXXXXX.',
          'В личном кабинете выберите тип «Kaspi товар» и вставьте ссылку.',
        ],
      },
    ],
  },
  {
    id: 'twogis',
    title: '📍 2ГИС и адрес',
    items: [
      {
        q: 'Как добавить кнопку 2ГИС (маршрут до вас)?',
        a: [
          'Откройте 2gis.kz или приложение 2ГИС.',
          'Найдите вашу организацию через поиск или на карте.',
          'Откройте карточку организации.',
          'Нажмите «Поделиться» (значок стрелки).',
          'Скопируйте ссылку и вставьте в поле «2ГИС» в кабинете.',
          'Теперь клиент нажимает кнопку — сразу открывается маршрут до вас.',
        ],
      },
      {
        q: 'Нет страницы в 2ГИС — что делать?',
        a: [
          'Для добавления организации в 2ГИС перейдите на 2gis.kz/firm-add.',
          'Пока страница в 2ГИС не готова, укажите адрес в поле «Адрес» в профиле — он будет показан на вашей странице.',
        ],
      },
    ],
  },
  {
    id: 'profile',
    title: '🖼 Логотип и оформление',
    items: [
      {
        q: 'Как загрузить логотип?',
        a: [
          'В кабинете перейдите на вкладку «Профиль».',
          'Нажмите «Загрузить логотип» под аватаркой.',
          'Выберите фото или логотип с телефона/компьютера (JPG, PNG, до 10 МБ).',
          'Изображение автоматически сжимается до 200×200 пикселей и оптимизируется.',
          'Нажмите «Сохранить профиль» — логотип появится на вашей странице.',
        ],
      },
      {
        q: 'Как сменить тему оформления?',
        a: [
          'В разделе «Профиль» прокрутите до блока «Тема оформления».',
          'Доступно 6 тем: Тёмная, Светлая, Градиент, Блогер, Бизнес, Селлер.',
          'Нажмите на понравившуюся тему и сохраните профиль.',
        ],
      },
      {
        q: 'Как получить QR-код для визитки?',
        a: [
          'В разделе «Профиль» найдите блок «QR-код для печати».',
          'Нажмите «Показать» — отобразится QR-код вашей страницы.',
          'Нажмите «Скачать PNG для печати» — получите файл высокого качества.',
          'Напечатайте на визитке, баннере, ценнике или витрине.',
          '⚡ Функция доступна в Premium.',
        ],
      },
    ],
  },
  {
    id: 'premium',
    title: '⚡ Premium подписка',
    items: [
      {
        q: 'Что даёт Premium?',
        a: [
          'Безлимитное количество кнопок (бесплатно — 3).',
          'Возможность загрузить свой логотип.',
          'Доступ к 3 дополнительным темам: Блогер, Бизнес, Селлер.',
          'Страница без водяного знака tapni.kz.',
          'QR-код высокого разрешения для печати.',
          'Возможность сменить адрес tapni.kz/ник.',
          'Аналитика — сколько раз нажали на каждую кнопку.',
        ],
      },
      {
        q: 'Как оплатить Premium?',
        a: [
          'Перейдите в кабинет → вкладка «Оплата».',
          'Или на страницу tapni.kz/pay.',
          'Выберите тариф: 1 000 ₸/мес или 10 000 ₸/год.',
          'Введите ваш username на tapni.kz — появится код платежа (TAP-ваш-ник).',
          'Оплатите через Kaspi Pay кнопкой на странице.',
          'Или переведите на Halyk Bank +77755696531, укажите код в назначении.',
          'Нажмите «Я оплатил — активировать Premium» — активируем за 15 минут.',
        ],
      },
      {
        q: 'Как узнать что Premium активирован?',
        a: [
          'В кабинете рядом с вашим username появится значок ⚡ PREMIUM.',
          'На вкладке «Оплата» будет написано «Premium активен» с датой окончания.',
          'Если привязан Telegram — получите уведомление в боте.',
        ],
      },
      {
        q: 'Можно ли выставить счёт для юридического лица?',
        a: [
          'Да. На странице tapni.kz/pay в самом низу есть раздел «Выставить счёт для юридического лица».',
          'Нажмите на него, введите название компании и БИН (12 цифр).',
          'Нажмите «Запросить счёт на оплату» — вышлем счёт в WhatsApp в течение 2 часов.',
          'Доступно только для годового тарифа — 10 000 ₸/год.',
        ],
      },
    ],
  },
  {
    id: 'password',
    title: '🔐 Вход и пароль',
    items: [
      {
        q: 'Забыл пароль — как восстановить?',
        a: [
          'Перейдите на tapni.kz/auth → вкладка «Войти».',
          'Нажмите «Забыли пароль?» под кнопкой входа.',
          'Введите номер телефона, с которым регистрировались.',
          'Нажмите «Отправить ссылку».',
          'Если привязан Telegram — ссылка придёт прямо в бот.',
          'Если Telegram не привязан — поддержка вышлет ссылку в WhatsApp за 15 минут.',
          'По ссылке введите новый пароль — минимум 8 символов.',
        ],
      },
      {
        q: 'Как привязать Telegram к аккаунту?',
        a: [
          'Откройте наш Telegram-бот: t.me/Tapnikzbot',
          'Нажмите «Поделиться номером» или отправьте команду /start.',
          'Поделитесь номером телефона через кнопку в Telegram.',
          'Бот найдёт ваш аккаунт и привяжет Telegram.',
          'После этого сброс пароля придёт автоматически в бот.',
        ],
      },
      {
        q: 'Как изменить адрес страницы (ник)?',
        a: [
          '⚡ Функция доступна только в Premium.',
          'В кабинете → вкладка «Профиль» → прокрутите до блока «Изменить адрес страницы».',
          'Введите новый ник и нажмите «Сохранить».',
          '⚠️ После смены старые QR-коды перестанут работать — нужно будет перепечатать.',
        ],
      },
    ],
  },
  {
    id: 'links',
    title: '🔗 Управление кнопками',
    items: [
      {
        q: 'Как изменить порядок кнопок?',
        a: [
          'Удалите кнопку которую хотите переместить.',
          'Добавьте её заново — она появится последней.',
          'Повторите для всех кнопок в нужном порядке.',
          '💡 В следующих версиях добавим перетаскивание.',
        ],
      },
      {
        q: 'Что такое «Текст / Описание» (текстовый блок)?',
        a: [
          'Это специальная карточка без ссылки — только текст.',
          'Используйте для: расписания работы, акционных предложений, описания услуг.',
          'В поле «Заголовок» можно написать «Режим работы», а в тексте — «Пн-Пт 9:00-18:00».',
        ],
      },
      {
        q: 'Почему кнопка «Позвонить» не работает на некоторых устройствах?',
        a: [
          'Кнопка использует протокол tel: — он работает только на мобильных устройствах.',
          'На компьютере без телефонии кнопка не откроет звонок — это нормально.',
          'Для надёжности добавьте WhatsApp кнопку — она работает на всех устройствах.',
        ],
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#08080f] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-violet-800/[0.07] blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.05] px-5 py-3.5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" width={36} height={36} />
            <span className="text-sm font-extrabold text-white">tapni.kz</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-colors">Кабинет</Link>
            <a href={WA} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20">WhatsApp</a>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-8">
        <div className="mb-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">Справочный центр</p>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Помощь и инструкции</h1>
          <p className="mt-2 text-sm text-gray-400">Ответы на самые частые вопросы по работе с tapni.kz</p>
        </div>

        {/* Quick links */}
        <div className="mb-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-violet-500/40 hover:text-white">
              {s.title}
            </a>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="mb-4 text-base font-bold text-white">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <details key={item.q} className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] open:bg-white/[0.05]">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 text-sm font-semibold text-white list-none">
                      {item.q}
                      <svg className="h-4 w-4 flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                      <ol className="space-y-2">
                        {item.a.map((step, i) => (
                          <li key={i} className={`flex gap-3 text-sm text-gray-400 ${step.startsWith('⚡') || step.startsWith('⚠️') || step.startsWith('💡') ? 'items-start' : 'items-start'}`}>
                            {step.startsWith('⚡') || step.startsWith('⚠️') || step.startsWith('💡') || step.startsWith('Да.') ? (
                              <span className="leading-relaxed">{step}</span>
                            ) : (
                              <>
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-400">{i + 1}</span>
                                <span className="leading-relaxed">{step}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Support CTA */}
        <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
          <p className="mb-1 text-base font-bold text-white">Не нашли ответ?</p>
          <p className="mb-5 text-sm text-gray-400">Напишите нам — ответим быстро</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={TG} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-[#2AABEE]/30 bg-[#2AABEE]/10 px-5 py-3 text-sm font-semibold text-[#2AABEE] transition-colors hover:bg-[#2AABEE]/20">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.88 14.08l-2.95-.924c-.64-.204-.654-.64.136-.945l11.521-4.443c.532-.194.998.13.975.48z"/></svg>
              Telegram-бот
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-5 py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp поддержка
            </a>
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link href="/" className="text-xs text-gray-600 transition-colors hover:text-gray-400">← На главную tapni.kz</Link>
        </p>
      </div>
    </main>
  )
}
