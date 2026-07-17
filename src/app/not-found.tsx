import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Страница не найдена · tapni.kz',
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5 py-12 text-gray-900 selection:bg-violet-200/60">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative flex max-w-sm flex-col items-center text-center">
        <Link href="/" className="mb-8 flex flex-col items-center gap-2">
          <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-14 w-14 rounded-full object-cover ring-2 ring-violet-200 shadow-lg" width={56} height={56} />
          <span className="text-sm font-extrabold text-gray-900">tapni.kz</span>
        </Link>

        <p className="mb-2 text-6xl font-black text-violet-600">404</p>
        <h1 className="mb-2 text-xl font-extrabold text-gray-900">Страница не найдена</h1>
        <p className="mb-8 text-sm text-gray-500">Возможно, ссылка устарела или адрес введён неверно.</p>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/"
            className="flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
          >
            На главную
          </Link>
          <Link
            href="/auth?tab=register"
            className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Создать страницу
          </Link>
        </div>
      </div>
    </main>
  )
}
