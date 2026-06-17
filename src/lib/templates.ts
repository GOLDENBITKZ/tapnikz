import type { IconType } from './supabase'

export type TemplateLink = {
  title: string
  url: string
  icon_type: IconType
}

export type Template = {
  id: string
  emoji: string
  name: string
  description: string
  links: TemplateLink[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'kaspi_seller',
    emoji: '🛒',
    name: 'Kaspi-продавец',
    description: 'Для продавцов на Kaspi.kz',
    links: [
      { title: 'Мой Kaspi магазин', url: 'https://kaspi.kz/shop/info/', icon_type: 'kaspi' },
      { title: 'Оплата Kaspi Pay', url: 'https://pay.kaspi.kz/pay/', icon_type: 'kaspi_pay' },
      { title: 'WhatsApp для заказов', url: 'https://wa.me/7', icon_type: 'whatsapp' },
      { title: 'Найти нас в 2ГИС', url: 'https://2gis.kz/', icon_type: 'twogis' },
    ],
  },
  {
    id: 'blogger',
    emoji: '💄',
    name: 'Блогер',
    description: 'Instagram, TikTok, YouTube',
    links: [
      { title: 'Instagram', url: 'https://instagram.com/', icon_type: 'instagram' },
      { title: 'TikTok', url: 'https://tiktok.com/@', icon_type: 'tiktok' },
      { title: 'Telegram канал', url: 'https://t.me/', icon_type: 'telegram' },
      { title: 'Сотрудничество — пишите сюда', url: 'https://wa.me/7', icon_type: 'whatsapp' },
    ],
  },
  {
    id: 'cafe',
    emoji: '🍕',
    name: 'Кафе / Ресторан',
    description: 'Доставка, адрес, запись',
    links: [
      { title: 'Заказать доставку', url: 'https://wa.me/7', icon_type: 'whatsapp' },
      { title: 'Найти нас в 2ГИС', url: 'https://2gis.kz/', icon_type: 'twogis' },
      { title: 'Оплата Kaspi Pay', url: 'https://pay.kaspi.kz/pay/', icon_type: 'kaspi_pay' },
      { title: 'Записаться на столик', url: '', icon_type: 'lead_form' },
    ],
  },
  {
    id: 'service',
    emoji: '💼',
    name: 'Мастер / Услуги',
    description: 'Репетитор, сантехник, мастер',
    links: [
      { title: 'Записаться на услугу', url: '', icon_type: 'lead_form' },
      { title: 'WhatsApp', url: 'https://wa.me/7', icon_type: 'whatsapp' },
      { title: 'Позвонить', url: '7', icon_type: 'phone' },
      { title: 'Найти нас в 2ГИС', url: 'https://2gis.kz/', icon_type: 'twogis' },
    ],
  },
]
