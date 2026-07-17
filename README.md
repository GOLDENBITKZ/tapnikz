# tapni.kz

Персональная мобильная визитка для бизнеса в Казахстане.

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Hosting**: Vercel
- **Bot**: Telegram Bot API

## Local Development

```bash
cp .env.local.example .env.local
# Заполни .env.local реальными значениями
npm install
npm run dev
```

## Deploy

Push в `main` ветку → автоматический деплой на tapni.kz через Vercel.

## Environment Variables

Все переменные описаны в `.env.local.example`.  
Реальные значения хранятся в Vercel Dashboard (Settings → Environment Variables).
