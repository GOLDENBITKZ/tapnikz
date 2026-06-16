import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

export type Theme = 'dark' | 'light' | 'gradient' | 'blogger' | 'business' | 'seller'

export type IconType =
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'kaspi'
  | 'kaspi_pay'
  | 'kaspi_shop'
  | 'twogis'
  | 'website'
  | 'phone'
  | 'email'
  | 'kolesa'
  | 'krisha'
  | 'vk'
  | 'facebook'
  | 'link'
  | 'text_block'
  | 'product'

export type Profile = {
  id: string
  username: string
  business_name: string
  bio: string | null
  phone: string | null
  address: string | null
  avatar_url: string | null
  theme: Theme
  is_premium: boolean
  subscription_expires_at: string | null
  subscription_plan: 'monthly' | 'annual' | null
  telegram_chat_id: string | null
  created_at: string
  updated_at: string
}

export type Link = {
  id: string
  profile_id: string
  title: string
  url: string
  icon_type: IconType
  sort_order: number
  click_count: number
  created_at: string
}

export const FREE_LINK_LIMIT = 3
