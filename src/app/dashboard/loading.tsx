export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      <p className="text-gray-400 text-sm">Загрузка...</p>
    </div>
  )
}
