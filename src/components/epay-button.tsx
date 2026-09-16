'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

declare global {
  interface Window {
    halyk?: { pay: (payment: Record<string, unknown>) => void }
  }
}

type Props = { plan: 'monthly' | 'annual'; price: string }

export function EpayButton({ plan, price }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) throw new Error('Войдите в личный кабинет, затем повторите оплату')
      const response = await fetch('/api/epay/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Не удалось создать платеж')

      if (!window.halyk) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = result.mode === 'test'
            ? 'https://test-epay.epayment.kz/payform/payment-api.js'
            : 'https://epay.homebank.kz/payform/payment-api.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Не удалось загрузить форму EPAY'))
          document.head.appendChild(script)
        })
      }
      window.halyk?.pay({ ...result.payment, auth: result.auth })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка оплаты')
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16854a] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#116d3c] active:scale-[0.98] disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Оплатить {price} ₸ через Halyk / EPAY
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}