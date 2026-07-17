'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Что такое tapni.kz и чем он отличается от Taplink?',
    a: 'tapni.kz — казахстанский сервис мобильных визиток, созданный специально для бизнеса в Казахстане. В отличие от Taplink и Linktree, у нас есть готовые кнопки Kaspi Pay, Kaspi магазин, 2ГИС, Kolesa.kz, Krisha.kz — сервисы, которых нет у зарубежных аналогов. Оплата Premium — через Kaspi, цены в тенге, поддержка на русском языке.',
  },
  {
    q: 'Как поставить ссылку tapni.kz в Instagram bio?',
    a: 'Создайте страницу на tapni.kz — вы получите адрес вида tapni.kz/ваш-ник. Откройте Instagram → Редактировать профиль → Ссылка в профиле → введите ваш адрес tapni.kz. Готово — теперь все ваши контакты в одном месте.',
  },
  {
    q: 'Как добавить кнопку Kaspi Pay?',
    a: 'В приложении Kaspi.kz откройте раздел «Платежи» → «Мой QR-код», нажмите «Поделиться» и скопируйте ссылку вида pay.kaspi.kz/pay/... В личном кабинете tapni.kz выберите тип «Kaspi Pay» и вставьте ссылку. Есть кнопка ? с подробной инструкцией.',
  },
  {
    q: 'Как добавить организацию из 2ГИС?',
    a: 'Откройте 2gis.kz или приложение 2ГИС, найдите вашу организацию на карте, нажмите «Поделиться» и скопируйте ссылку. Вставьте её в tapni.kz выбрав тип «2ГИС».',
  },
  {
    q: 'Нужны ли технические знания?',
    a: 'Нет. Регистрация занимает 60 секунд — номер телефона, адрес страницы, добавление кнопок. Ни кода, ни дизайнера, ни домена не нужно.',
  },
  {
    q: 'Сколько стоит?',
    a: 'Бесплатно — 3 кнопки навсегда. Premium — 1 000 ₸/месяц или 10 000 ₸/год (экономия 2 000 ₸). Оплата через Kaspi Pay одним нажатием или переводом на Halyk Bank.',
  },
  {
    q: 'Работает ли tapni.kz с TikTok, YouTube и другими платформами?',
    a: 'Да. Поддерживаются: WhatsApp, Telegram, Instagram, TikTok, YouTube, Facebook, ВКонтакте, Kaspi Pay, Kaspi QR, Kaspi магазин, 2ГИС, Kolesa.kz, Krisha.kz и другие. Всего 35+ типов кнопок.',
  },
  {
    q: 'Можно ли поставить QR-код tapni.kz на визитку или баннер?',
    a: 'Да. В личном кабинете → вкладка «Профиль» → «QR-код для печати». Скачайте PNG высокого разрешения и печатайте на визитке, ценнике, баннере или витрине.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left group"
        aria-expanded={open}
      >
        <span className={`text-sm font-semibold transition-colors ${open ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>{q}</span>
        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${open ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div className={`grid transition-all duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="pb-4 text-sm leading-relaxed text-gray-600">{a}</p>
        </div>
      </div>
    </div>
  )
}

export function LandingFaq() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5">
      {FAQS.map((f) => (
        <FaqItem key={f.q} q={f.q} a={f.a} />
      ))}
    </div>
  )
}
