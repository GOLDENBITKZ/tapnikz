import Link from 'next/link'

export default function ProfileNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c18] px-4 text-center">
      <p className="mb-2 text-5xl">🔍</p>
      <h1 className="mb-2 text-xl font-bold text-white">Страница не найдена</h1>
      <p className="mb-6 text-sm text-gray-500">Такого профиля не существует или он был удалён.</p>
      <Link
        href="/"
        className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
      >
        Создать свою страницу
      </Link>
    </div>
  )
}
