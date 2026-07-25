'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-5 text-center">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-14 w-14 rounded-full object-cover ring-2 ring-violet-500/30" width={56} height={56} />
        <span className="text-sm font-extrabold text-white">tapni.kz</span>
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-white">Что-то пошло не так</h1>
      <p className="mb-8 max-w-xs text-sm text-gray-400 leading-relaxed">
        Произошла временная ошибка. Попробуйте обновить страницу или вернитесь на главную.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
        >
          Попробовать снова
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-gray-300 hover:border-white/30 transition-colors"
        >
          На главную
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-[11px] text-gray-600 font-mono">Код: {error.digest}</p>
      )}
    </main>
  )
}
