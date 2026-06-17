# Changelog — tapni.kz

## [2.0.0] — 2026-06-17

### Добавлено (6 новых функций — "следующий уровень")

**A. Аналитика**
- `view_count` — счётчик просмотров профиля (серверный инкремент через RPC при каждом открытии страницы)
- `click_events` таблица — time-series события кликов для будущих дневных графиков
- Dashboard «Статистика»: строка «Просмотров страницы: N» над таблицей переходов

**B. Захват лидов**
- Тип ссылки `lead_form` — кнопка «Записаться / Оставить заявку»
- `lead_submissions` таблица (name, phone, message, created_at) с RLS
- Компонент `LeadFormButton` — bottom sheet модал с rate-limit (1 заявка/час с одного IP)
- API `/api/leads` — сохраняет заявку + Telegram-уведомление владельцу
- Dashboard вкладка «Лиды» — список заявок, Premium-блокировка после 3 шт.
- Telegram-бот команда `/leads` — 5 последних заявок

**C. Drag-and-drop сортировка**
- Карточки ссылок в dashboard: `draggable`, drag-хендлеры, GripVertical-иконка
- Оптимистичный UI + PATCH `/api/links` для batch-обновления `sort_order`

**D. Шаблоны быстрого старта**
- 4 шаблона: 🛒 Kaspi-продавец, 💄 Блогер, 🍕 Кафе/Ресторан, 💼 Мастер/Услуги
- Пустое состояние (0 ссылок) заменено на сетку шаблонов
- API `/api/links/batch` — bulk-insert шаблонных ссылок (только для пустых профилей)

**E. «Открыто сейчас» бейдж**
- Поле `working_hours JSONB` на `profiles` (формат `{"mon": "09:00-20:00", ...}`)
- Секция «Режим работы» в Dashboard → вкладка Профиль (7 строк ввода)
- Публичная страница: зелёный бейдж «Открыто до HH:MM» / серый «Закрыто» (UTC+5, без DST)

**F. Реферальная программа**
- Поля `referred_by` и `referral_bonus_given` на `profiles`
- Регистрация через `tapni.kz/auth?ref=username` — автоматически заполняет referred_by
- Баннер «Приглашён пользователем X — оба получат +7 дней Premium» в форме регистрации
- Ежедневный cron: через 7 дней после регистрации рефери — +7 дней Premium обоим
- Telegram-уведомления обеим сторонам при начислении бонуса
- Команда `/refer` в боте — персональная реферальная ссылка + счётчик приглашённых

### Обновлено
- Telegram-бот `/mystats`: добавлены просмотры страницы и топ ссылка за 7 дней
- `/api/links`: PATCH-метод для batch reorder; POST проверяет лимиты через сервер
- Типы `supabase.ts`: IconType добавлен `lead_form`, Profile добавлены `view_count`, `working_hours`, `referred_by`, `referral_bonus_given`

### Миграция базы данных
Выполнить `SUPABASE_MIGRATION_V8.sql` в SQL Editor Supabase:
- `CREATE TABLE click_events`
- `ALTER TABLE profiles ADD COLUMN view_count, working_hours, referred_by, referred_by, referral_bonus_given`
- `CREATE TABLE lead_submissions` (с RLS)
- `CREATE FUNCTION increment_profile_view`

---


Все изменения сервиса документируются здесь.  
Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/)  
Версии: MAJOR.MINOR.PATCH  
- MAJOR — кардинальные изменения архитектуры / breaking changes  
- MINOR — новые функции, совместимые с предыдущим поведением  
- PATCH — баг-фиксы, улучшения без новых функций  

Для отката: `vercel rollback <deployment-url>` в терминале или через Vercel Dashboard → Deployments.

---

## [1.4.1] — 2026-06-17

### Исправлено
- **Telegram-бот — мёртвая ссылка в приветствии**: текст `tapni.kz/ваш-ник` в welcome-сообщении автоматически распознавался Telegram как гиперссылка и вёл на несуществующую страницу. Placeholder-ник удалён из текста.

---

## [1.4.0] — 2026-06-17

### Безопасность (10 уязвимостей, аудит)

| # | Критичность | Описание |
|---|---|---|
| 1 | CRITICAL | `notify-admin`: добавлена JWT-аутентификация на `payment_request` и `invoice_request` — анонимный пользователь больше не может получить бесплатный Premium |
| 2 | CRITICAL | `cron/check-subscriptions`: защита от `CRON_SECRET=undefined` — `Bearer undefined` больше не обходит проверку |
| 3 | HIGH | `api/click`: удалён `export const runtime = 'edge'`; счётчик кликов теперь ожидается (`await`) до редиректа — в Edge Runtime он всегда терялся |
| 4 | HIGH | `auth/page`: проверка `RESERVED_SLUGS` добавлена при регистрации (была только при переименовании в dashboard) |
| 5 | HIGH | `auth/set-password`: убран `getSession()` fallback — любой залогиненный пользователь мог увидеть форму смены пароля |
| 6 | HIGH | `telegram-bot`: `admin_find` callback теперь использует `getSupabaseAdmin()` вместо анонимного клиента (RLS блокировал данные) |
| 7 | MEDIUM | `notify-admin`: `b.phone` экранируется через `esc()` в Telegram HTML-сообщении |
| 8 | MEDIUM | Новый endpoint `/api/links` — лимит 3 кнопки для бесплатного плана теперь принудителен на сервере; клиентский bypass невозможен |
| 9 | MEDIUM | `telegram-bot`: `messageText` в команде `/message` экранируется через `esc()` |
| 10 | MEDIUM | `auth/reset`: добавлена проверка `res.ok` перед обработкой ответа сервера |

### Добавлено
- `src/app/api/links/route.ts` — server-side endpoint для добавления ссылок с JWT-аутентификацией и server-side лимитом

---

## [1.3.0] — 2026-06-16

### Добавлено
- **Уведомления об истечении подписки**: cron отправляет пользователю в Telegram предупреждение за 7 дней (мягкое), за 3 дня (срочное), и уведомление при истечении
- **Таблица payments**: история каждого платежа с полями `username, plan, amount, days, method, status, admin_tg_id` (миграция: `SUPABASE_MIGRATION_V7.sql`)
- **Команда `/revenue [days]`**: суммарная выручка, разбивка по месячным/годовым
- **Команда `/payments username`**: история платежей конкретного пользователя
- **Баннер в dashboard**: жёлтое (7 дн.) / красное (3 дн.) предупреждение с ссылкой на /pay

---

## [1.2.0] — 2026-06-15

### Добавлено
- **Авто-провизия Premium**: при нажатии «Я оплатил» немедленно выдаётся 3 дня Premium; пользователь получает Telegram-уведомление
- **Кнопки подтверждения для админа**: `✅ Подтвердить` (продлевает до полного срока) и `❌ Отменить` (отзывает Premium) в уведомлении администратора
- **`cancel_premium:username`** callback в telegram-bot
- **Логирование в payments**: после подтверждения/отмены запись сохраняется в таблице payments (silent fail если таблица не существует)

### Изменено
- Страница `/pay`: текст «мгновенно» вместо «15 минут»; показывает «Premium активирован!» когда `provisioned: true`

---

## [1.1.0] — 2026-06-14

### Добавлено
- **Кнопка «Поделиться»** на публичной странице пользователя (`/[username]`): `navigator.share` на мобильном, clipboard fallback на десктопе
- **`src/components/share-button.tsx`**: клиентский компонент, состояния `idle → copied`

### Изменено
- **Брендинг tapni.kz на странице пользователя**:
  - Бесплатные пользователи: градиентный пилл `from-violet-600 to-indigo-600` с молнией
  - Premium: тёмный пилл `bg-black/50` с иконкой Zap и текстом «tapni.kz»

---

## [1.0.0] — 2026-06 (начало работы)

### Базовый запуск
- Публичные страницы пользователей `/[username]` с 6 темами
- Регистрация/вход по номеру телефона (email = `77001234567@users.tapni.kz`)
- Dashboard: управление профилем, ссылками, аватаром
- Типы ссылок: WhatsApp, Telegram, Instagram, TikTok, Kaspi Pay, Kaspi магазин, 2GIS, YouTube, VK, Facebook, телефон, email, текстовый блок, карточка товара, другое
- Telegram-бот: привязка номера, просмотр статистики, команды администратора
- Счётчик кликов по ссылкам (`/api/click` → RPC `increment_link_click`)
- Восстановление пароля через Telegram/WhatsApp
- Premium-план: безлимит кнопок, логотип, QR-код, смена ника, темы Блогер/Бизнес/Селлер
- Cron-задача: ежедневное истечение подписок (`vercel.json`)
- Инфраструктура: 100% Vercel + Supabase (нет зависимости от Raspberry Pi)

---

## Откат к предыдущей версии

**Через Vercel Dashboard:**
1. Открыть [vercel.com/goldenbit-s-projects/tapnikz](https://vercel.com/goldenbit-s-projects/tapnikz)
2. Deployments → найти нужный деплой → «Promote to Production»

**Через CLI:**
```bash
vercel rollback <deployment-url>
```

**Через git (после настройки remote):**
```bash
git revert HEAD         # создаёт новый коммит, отменяющий последний
vercel deploy --prod    # деплоит откат
```

---

## Pending (запланировано, не реализовано)

- Миграция `SUPABASE_MIGRATION_V7.sql` должна быть применена вручную в Supabase SQL Editor (таблица `payments`)
- GitHub remote для полноценного git-workflow (сейчас только локальный репо)
