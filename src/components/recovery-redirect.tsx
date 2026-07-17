'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Supabase sends recovery links to the site root (tapni.kz/#type=recovery&access_token=...).
// This component detects the recovery hash on any page and redirects to the set-password form.
export function RecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      router.replace('/auth/set-password' + hash)
    }
  }, [router])

  return null
}
