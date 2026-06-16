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
    a: 'Да. Поддерживаются: WhatsApp, Telegram, Instagram, TikTok, YouTube, Facebook, ВКонтакте, Kaspi Pay, Kaspi магазин, 2ГИС, Kolesa.kz, Krisha.kz, и любой сайт. Всего 18 типов кнопок.',
  },
  {
    q: 'Можно ли поставить QR-код tapni.kz на визитку или баннер?',
    a: 'Да. В личном кабинете → вкладка «Профиль» → «QR-код для печати». Скачайте PNG высокого разрешения и печатайте на визитке, ценнике, баннере или витрине.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-gray-400">{a}</p>}
    </div>
  )
}

export function LandingFaq() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5">
      {FAQS.map((f) => (
        <FaqItem key={f.q} q={f.q} a={f.a} />
      ))}
    </div>
  )
}
