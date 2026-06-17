'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Link2, CreditCard, Loader2, Trash2, Plus, LogOut, ExternalLink,
  CheckCircle2, AlertCircle, MessageCircle, Palette, Building2,
  QrCode, Download, HelpCircle, X, ImagePlus, Zap, FileText, AtSign, BarChart2,
  ClipboardList, Clock, GripVertical, Eye, Share2, Users,
} from 'lucide-react'
import { TEMPLATES, PLACEHOLDER_PREFIX } from '@/lib/templates'
import type { LeadSubmission } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import { getSupabase, type Profile, type Link as LinkRow, type IconType, type Theme, FREE_LINK_LIMIT, FREE_LEADS_VISIBLE } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type DashTab = 'profile' | 'links' | 'leads' | 'payment'

const ICON_OPTIONS: { value: IconType; label: string; placeholder: string }[] = [
  { value: 'whatsapp',   label: '💬 WhatsApp',        placeholder: 'https://wa.me/77001234567' },
  { value: 'telegram',   label: '✈️ Telegram',         placeholder: 'https://t.me/username' },
  { value: 'kaspi_pay',  label: '💸 Kaspi Pay',        placeholder: 'https://pay.kaspi.kz/pay/...' },
  { value: 'kaspi',      label: '🛒 Kaspi магазин',    placeholder: 'https://kaspi.kz/shop/info/...' },
  { value: 'kaspi_shop', label: '🏪 Kaspi товар',      placeholder: 'https://kaspi.kz/shop/p/...' },
  { value: 'twogis',     label: '📍 2ГИС',             placeholder: 'https://2gis.kz/...' },
  { value: 'instagram',  label: '📸 Instagram',        placeholder: 'https://instagram.com/username' },
  { value: 'tiktok',     label: '🎵 TikTok',           placeholder: 'https://tiktok.com/@username' },
  { value: 'youtube',    label: '▶️ YouTube',           placeholder: 'https://youtube.com/@channel' },
  { value: 'website',    label: '🌐 Сайт',             placeholder: 'https://example.com' },
  { value: 'phone',      label: '📞 Позвонить',         placeholder: '77001234567' },
  { value: 'email',      label: '✉️ Email',             placeholder: 'info@example.com' },
  { value: 'kolesa',     label: '🚗 Kolesa.kz',        placeholder: 'https://kolesa.kz/a/show/...' },
  { value: 'krisha',     label: '🏠 Krisha.kz',        placeholder: 'https://krisha.kz/a/show/...' },
  { value: 'vk',         label: '💙 ВКонтакте',         placeholder: 'https://vk.com/username' },
  { value: 'facebook',   label: '📘 Facebook',          placeholder: 'https://facebook.com/username' },
  { value: 'android',    label: '🤖 Google Play',       placeholder: 'https://play.google.com/store/apps/details?id=...' },
  { value: 'ios',        label: '🍎 App Store',         placeholder: 'https://apps.apple.com/app/...' },
  { value: 'menu',       label: '🍽 Меню',              placeholder: 'https://example.com/menu' },
  { value: 'text_block', label: '📝 Текст / Описание',  placeholder: 'Ваш текст, часы работы, акции...' },
  { value: 'product',    label: '🛍 Карточка товара',   placeholder: 'https://kaspi.kz/shop/p/...' },
  { value: 'lead_form',  label: '📋 Запись / Заявка',   placeholder: 'Записаться на услугу' },
  { value: 'link',       label: '🔗 Другая ссылка',     placeholder: 'https://example.com' },
]

const THEMES: { value: Theme; label: string; preview: string }[] = [
  { value: 'dark',     label: 'Тёмная',   preview: 'bg-[#0c0c18]' },
  { value: 'light',    label: 'Светлая',  preview: 'bg-white' },
  { value: 'gradient', label: 'Градиент', preview: 'bg-gradient-to-br from-violet-600 to-indigo-800' },
  { value: 'blogger',  label: '💄 Блогер',  preview: 'bg-gradient-to-br from-rose-700 to-purple-900' },
  { value: 'business', label: '💼 Бизнес',  preview: 'bg-gradient-to-br from-slate-800 to-blue-900' },
  { value: 'seller',   label: '🛒 Селлер',  preview: 'bg-gradient-to-br from-gray-900 to-amber-900' },
]

// Color indicator per link type (for colored list cards)
function getLinkCardColor(type: IconType): { dot: string; ring: string } {
  switch (type) {
    case 'whatsapp':   return { dot: 'bg-[#25D366]', ring: 'border-l-[#25D366]' }
    case 'telegram':   return { dot: 'bg-[#2AABEE]', ring: 'border-l-[#2AABEE]' }
    case 'instagram':  return { dot: 'bg-pink-500', ring: 'border-l-pink-500' }
    case 'tiktok':     return { dot: 'bg-gray-300', ring: 'border-l-gray-400' }
    case 'youtube':    return { dot: 'bg-[#FF0000]', ring: 'border-l-[#FF0000]' }
    case 'kaspi':
    case 'kaspi_pay':
    case 'kaspi_shop': return { dot: 'bg-[#E50000]', ring: 'border-l-[#E50000]' }
    case 'twogis':     return { dot: 'bg-[#1DB256]', ring: 'border-l-[#1DB256]' }
    case 'kolesa':     return { dot: 'bg-[#FF6600]', ring: 'border-l-orange-500' }
    case 'krisha':     return { dot: 'bg-[#0076CC]', ring: 'border-l-blue-500' }
    case 'website':    return { dot: 'bg-blue-500', ring: 'border-l-blue-500' }
    case 'phone':      return { dot: 'bg-green-500', ring: 'border-l-green-500' }
    case 'email':      return { dot: 'bg-violet-500', ring: 'border-l-violet-500' }
    case 'vk':         return { dot: 'bg-blue-600', ring: 'border-l-blue-600' }
    case 'facebook':   return { dot: 'bg-[#1877F2]', ring: 'border-l-[#1877F2]' }
    case 'android':    return { dot: 'bg-[#3DDC84]', ring: 'border-l-[#3DDC84]' }
    case 'ios':        return { dot: 'bg-[#007AFF]', ring: 'border-l-[#007AFF]' }
    case 'menu':       return { dot: 'bg-[#FF8C00]', ring: 'border-l-[#FF8C00]' }
    case 'text_block': return { dot: 'bg-gray-500', ring: 'border-l-gray-500' }
    case 'product':    return { dot: 'bg-violet-400', ring: 'border-l-violet-400' }
    case 'lead_form':  return { dot: 'bg-violet-400', ring: 'border-l-violet-400' }
    case 'link':       return { dot: 'bg-blue-400', ring: 'border-l-blue-400' }
    default:           return { dot: 'bg-violet-500', ring: 'border-l-violet-500' }
  }
}

const RESERVED_SLUGS = new Set([
  'auth', 'dashboard', 'pay', 'api', 'admin', 'tapni', 'home', 'root',
  'sitemap.xml', 'robots.txt', 'about', 'privacy', 'terms', 'login', 'register',
])

// Smart URL config: show a fixed prefix, user only types the short part
const SMART_INPUTS: Partial<Record<IconType, { prefix: string; placeholder: string }>> = {
  whatsapp:  { prefix: 'wa.me/', placeholder: '77001234567' },
  telegram:  { prefix: 't.me/', placeholder: 'username' },
  instagram: { prefix: 'instagram.com/', placeholder: 'username' },
  tiktok:    { prefix: 'tiktok.com/@', placeholder: 'username' },
  youtube:   { prefix: 'youtube.com/@', placeholder: 'channel' },
  vk:        { prefix: 'vk.com/', placeholder: 'nickname' },
  facebook:  { prefix: 'facebook.com/', placeholder: 'page-name' },
  phone:     { prefix: '+7', placeholder: '701 234 5678' },
}

async function compressToWebP(file: File, maxPx: number, maxBytes: number): Promise<Blob> {
  const img = document.createElement('img')
  const objectUrl = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
    img.src = objectUrl
  })
  URL.revokeObjectURL(objectUrl)

  let { naturalWidth: w, naturalHeight: h } = img
  const ratio = Math.min(maxPx / w, maxPx / h, 1)
  w = Math.max(1, Math.round(w * ratio))
  h = Math.max(1, Math.round(h * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

  const toBlob = (q: number) =>
    new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/webp', q))

  // Binary search: find highest quality ≤ maxBytes
  let lo = 0.05, hi = 0.95, best: Blob | null = null
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    const blob = await toBlob(mid)
    if (blob.size <= maxBytes) {
      best = blob
      lo = mid
    } else {
      hi = mid
    }
  }
  // Fallback: minimum quality
  return best ?? await toBlob(0.05)
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [links, setLinks] = useState<LinkRow[]>([])
  const [tab, setTab] = useState<DashTab>('profile')
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string>('')

  // Leads
  const [leads, setLeads] = useState<LeadSubmission[]>([])

  // Drag-and-drop reorder
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [templateApplied, setTemplateApplied] = useState(false)

  // Working hours
  const WH_DAYS = [
    { key: 'mon', label: 'Пн' },
    { key: 'tue', label: 'Вт' },
    { key: 'wed', label: 'Ср' },
    { key: 'thu', label: 'Чт' },
    { key: 'fri', label: 'Пт' },
    { key: 'sat', label: 'Сб' },
    { key: 'sun', label: 'Вс' },
  ] as const
  type WhKey = typeof WH_DAYS[number]['key']
  const [whForm, setWhForm] = useState<Record<WhKey, string>>({
    mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '',
  })
  const [savingWh, setSavingWh] = useState(false)

  const [profileForm, setProfileForm] = useState({
    business_name: '',
    bio: '',
    address: '',
    theme: 'dark' as Theme,
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [linkForm, setLinkForm] = useState<{ title: string; url: string; icon_type: IconType }>({
    title: '',
    url: '',
    icon_type: 'whatsapp',
  })
  const [addingLink, setAddingLink] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Product card state
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productLinkUrl, setProductLinkUrl] = useState('')
  const [productPhotoUploading, setProductPhotoUploading] = useState(false)

  // Username change (premium)
  const [newUsername, setNewUsername] = useState('')
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingUsername, setSavingUsername] = useState(false)

  const loadData = useCallback(async (userId: string) => {
    const [{ data: prof }, { data: lnks }, { data: lds }] = await Promise.all([
      getSupabase().from('profiles').select('*').eq('id', userId).single(),
      getSupabase().from('links').select('*').eq('profile_id', userId).order('sort_order'),
      getSupabase().from('lead_submissions').select('*').eq('profile_id', userId).order('created_at', { ascending: false }).limit(50),
    ])
    if (prof) {
      setProfile(prof as Profile)
      setProfileForm({
        business_name: prof.business_name,
        bio: prof.bio ?? '',
        address: (prof as Profile).address ?? '',
        theme: prof.theme,
      })
      // Initialize working hours form from profile
      const wh = (prof as Profile).working_hours
      if (wh) {
        setWhForm({
          mon: wh.mon ?? '',
          tue: wh.tue ?? '',
          wed: wh.wed ?? '',
          thu: wh.thu ?? '',
          fri: wh.fri ?? '',
          sat: wh.sat ?? '',
          sun: wh.sun ?? '',
        })
      }
    }
    if (lnks) setLinks(lnks as LinkRow[])
    if (lds) setLeads(lds as LeadSubmission[])
  }, [])

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      setUser(session.user)
      setAccessToken(session.access_token)
      loadData(session.user.id).finally(() => setLoading(false))
    })
  }, [router, loadData])

  async function handleLogout() {
    await getSupabase().auth.signOut()
    router.replace('/')
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      // Build working_hours from current whForm state
      const wh: Record<string, string | null> = {}
      for (const { key } of WH_DAYS) {
        const val = whForm[key].trim()
        wh[key] = val && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(val) ? val : null
      }

      const { error } = await getSupabase()
        .from('profiles')
        .update({
          business_name: profileForm.business_name,
          bio: profileForm.bio || null,
          address: profileForm.address || null,
          theme: profileForm.theme,
          working_hours: wh,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) throw error
      setProfileMsg({ type: 'ok', text: 'Профиль сохранён!' })
      await loadData(user.id)
    } catch {
      setProfileMsg({ type: 'err', text: 'Ошибка сохранения' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function changeUsername() {
    if (!user || !profile) return
    const slug = newUsername.trim().toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')

    if (slug.length < 2) { setUsernameMsg({ type: 'err', text: 'Минимум 2 символа' }); return }
    if (RESERVED_SLUGS.has(slug)) { setUsernameMsg({ type: 'err', text: 'Это слово зарезервировано' }); return }
    if (slug === profile.username) { setUsernameMsg({ type: 'err', text: 'Это уже ваш текущий адрес' }); return }

    setSavingUsername(true)
    setUsernameMsg(null)
    try {
      const { data: existing } = await getSupabase()
        .from('profiles').select('id').eq('username', slug).neq('id', user.id).maybeSingle()
      if (existing) { setUsernameMsg({ type: 'err', text: 'Этот адрес уже занят' }); return }

      const { error } = await getSupabase()
        .from('profiles').update({ username: slug, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (error) throw error

      setProfile((p) => p ? { ...p, username: slug } : p)
      setNewUsername('')
      setUsernameMsg({ type: 'ok', text: `Адрес изменён! Ваша страница: tapni.kz/${slug}` })
    } catch {
      setUsernameMsg({ type: 'err', text: 'Ошибка. Попробуйте снова.' })
    } finally {
      setSavingUsername(false)
    }
  }

  function normalizeUrl(raw: string, type: IconType): string {
    const u = raw.trim()
    if (!u) return u
    if (type === 'text_block') return u
    if (type === 'product') return u  // url field stores pre-built JSON for product type
    if (type === 'phone') {
      const digits = u.replace(/\D/g, '')
      return `tel:+${digits.length === 10 ? '7' + digits : digits}`
    }
    if (type === 'email') {
      if (u.startsWith('mailto:')) return u
      return `mailto:${u}`
    }
    if (type === 'whatsapp') {
      if (u.startsWith('http')) return u
      const digits = u.replace(/\D/g, '')
      return `https://wa.me/${digits}`
    }
    if (type === 'telegram') {
      if (u.startsWith('http')) return u
      return `https://t.me/${u.replace(/^@/, '')}`
    }
    if (type === 'instagram') {
      if (u.startsWith('http')) return u
      return `https://instagram.com/${u.replace(/^@/, '')}`
    }
    if (type === 'tiktok') {
      if (u.startsWith('http')) return u
      return `https://tiktok.com/@${u.replace(/^@/, '')}`
    }
    if (type === 'youtube') {
      if (u.startsWith('http')) return u
      return `https://youtube.com/@${u.replace(/^@/, '')}`
    }
    if (type === 'vk') {
      if (u.startsWith('http')) return u
      return `https://vk.com/${u}`
    }
    if (type === 'facebook') {
      if (u.startsWith('http')) return u
      return `https://facebook.com/${u}`
    }
    if (!u.startsWith('http') && !u.startsWith('//')) return `https://${u}`
    return u
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !profile) return
    const isText = linkForm.icon_type === 'text_block'
    const isProduct = linkForm.icon_type === 'product'
    const isLeadForm = linkForm.icon_type === 'lead_form'

    if (isLeadForm) {
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Записаться', url: '', icon_type: 'lead_form', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'lead_form' })
        await loadData(user.id)
      } catch {
        setLinkError('Не удалось добавить форму заявки')
      } finally {
        setAddingLink(false)
      }
      return
    }

    if (isProduct) {
      if (!profile.is_premium) { setLinkError('Карточка товара доступна только в Premium'); return }
      if (!linkForm.title) { setLinkError('Введите название товара'); return }
      if (!productLinkUrl) { setLinkError('Введите ссылку на товар'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        let photoPublicUrl = ''
        let storagePath = ''
        if (productPhotoFile) {
          setProductPhotoUploading(true)
          const blob = await compressToWebP(productPhotoFile, 600, 50 * 1024)
          const ts = Date.now()
          storagePath = `products/${profile.username}/${ts}.webp`
          const { error: upErr } = await getSupabase().storage.from('avatars').upload(storagePath, blob, { contentType: 'image/webp', upsert: true })
          setProductPhotoUploading(false)
          if (upErr) { setLinkError('Не удалось загрузить фото'); return }
          const { data: { publicUrl } } = getSupabase().storage.from('avatars').getPublicUrl(storagePath)
          photoPublicUrl = publicUrl
        }
        const normalLink = productLinkUrl.startsWith('http') ? productLinkUrl : `https://${productLinkUrl}`
        const urlJson = JSON.stringify({
          l: normalLink,
          ...(photoPublicUrl ? { p: photoPublicUrl, sp: storagePath } : {}),
          ...(productPrice.trim() ? { price: productPrice.trim() } : {}),
        })
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        // FIX #8: insert through server-side API (enforces free-tier limit)
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title, url: urlJson, icon_type: 'product', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error(await res.text())
        setLinkForm({ title: '', url: '', icon_type: 'product' })
        setProductPhotoFile(null)
        setProductPhotoPreview('')
        setProductPrice('')
        setProductLinkUrl('')
        await loadData(user.id)
      } catch {
        setLinkError('Не удалось добавить карточку товара')
      } finally {
        setAddingLink(false)
        setProductPhotoUploading(false)
      }
      return
    }

    if (!isText && !linkForm.title) { setLinkError('Введите название кнопки'); return }
    if (!linkForm.url) { setLinkError(isText ? 'Введите текст' : 'Введите ссылку'); return }
    setLinkError('')
    setAddingLink(true)
    try {
      const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
      // FIX #8: insert through server-side API (enforces free-tier limit)
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: linkForm.title || '',
          url: normalizeUrl(linkForm.url, linkForm.icon_type),
          icon_type: linkForm.icon_type,
          sort_order: maxOrder + 1,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        if (body.error === 'limit_reached') {
          setLinkError(`Лимит ${FREE_LINK_LIMIT} кнопки на бесплатном плане.`)
          return
        }
        setLinkError('Не удалось добавить')
        return
      }
      setLinkForm({ title: '', url: '', icon_type: linkForm.icon_type })
      await loadData(user.id)
    } catch {
      setLinkError('Не удалось добавить')
    } finally {
      setAddingLink(false)
    }
  }

  async function deleteLink(id: string) {
    setDeletingId(id)
    try {
      const link = links.find((l) => l.id === id)
      await getSupabase().from('links').delete().eq('id', id)
      setLinks((prev) => prev.filter((l) => l.id !== id))
      // Clean up product photo from storage
      if (link?.icon_type === 'product' && link.url.startsWith('{')) {
        try {
          const pd = JSON.parse(link.url) as { sp?: string }
          if (pd.sp) await getSupabase().storage.from('avatars').remove([pd.sp])
        } catch {}
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const oldLinks = [...links]
    const fromIdx = links.findIndex((l) => l.id === dragId)
    const toIdx = links.findIndex((l) => l.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); setDragOverId(null); return }
    const reordered = [...links]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const withOrder = reordered.map((l, i) => ({ ...l, sort_order: i }))
    setLinks(withOrder) // optimistic update
    setDragId(null); setDragOverId(null)
    try {
      await fetch('/api/links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(withOrder.map((l) => ({ id: l.id, sort_order: l.sort_order }))),
      })
    } catch {
      setLinks(oldLinks) // revert on error
    }
  }

  async function applyTemplate(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    setAddingLink(true)
    try {
      const res = await fetch('/api/links/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(tpl.links),
      })
      if (res.ok) {
        await loadData(user!.id)
        setTemplateApplied(true)
      }
    } catch { /* ignore */ } finally {
      setAddingLink(false)
    }
  }

  async function saveWorkingHours() {
    if (!user) return
    setSavingWh(true)
    try {
      const wh: Record<string, string | null> = {}
      for (const { key } of WH_DAYS) {
        const val = whForm[key].trim()
        wh[key] = val && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(val) ? val : null
      }
      await getSupabase().from('profiles').update({ working_hours: wh }).eq('id', user.id)
      setProfile((p) => p ? { ...p, working_hours: wh } : p)
    } catch { /* ignore */ } finally {
      setSavingWh(false)
    }
  }

  const [showQr, setShowQr] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement>(null)
  const qrFallbackRef = useRef<HTMLDivElement>(null)
  const qrDownloadRef = useRef<HTMLDivElement>(null)      // 600px with user/brand logo (may taint if user avatar is cross-origin)
  const qrDownloadBrandRef = useRef<HTMLDivElement>(null) // 600px with brand logo only (always clean)
  const [helpType, setHelpType] = useState<'kaspi' | 'kaspi_pay' | 'kaspi_shop' | 'twogis' | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function uploadAvatar(file: File) {
    if (!user) return
    if (file.size > 10 * 1024 * 1024) { setAvatarError('Максимальный размер — 10 МБ'); return }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
    if (!allowed.includes(file.type)) { setAvatarError('Только JPG, PNG или WebP'); return }
    setAvatarError('')
    setAvatarUploading(true)
    try {
      const webpBlob = await compressToWebP(file, 200, 20 * 1024)
      const path = `${user.id}/avatar.webp`
      const { error: upErr } = await getSupabase()
        .storage.from('avatars')
        .upload(path, webpBlob, { upsert: true, contentType: 'image/webp' })
      if (upErr) throw upErr

      const { data: { publicUrl } } = getSupabase()
        .storage.from('avatars')
        .getPublicUrl(path)

      const cacheBusted = `${publicUrl}?t=${Date.now()}`
      await getSupabase().from('profiles').update({ avatar_url: cacheBusted }).eq('id', user.id)
      setProfile((p) => p ? { ...p, avatar_url: cacheBusted } : p)
    } catch {
      setAvatarError('Ошибка загрузки. Попробуйте снова.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function removeAvatar() {
    if (!user || !profile?.avatar_url) return
    setAvatarUploading(true)
    try {
      // Always stored as avatar.webp after compression migration
      await getSupabase().storage.from('avatars').remove([`${user.id}/avatar.webp`])
      // Also try old extensions for accounts that uploaded before compression was added
      await getSupabase().storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`])
      await getSupabase().from('profiles').update({ avatar_url: null }).eq('id', user.id)
      setProfile((p) => p ? { ...p, avatar_url: null } : p)
    } catch {
      setAvatarError('Ошибка удаления.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const selectedOption = ICON_OPTIONS.find((o) => o.value === linkForm.icon_type)
  const atLimit = !profile?.is_premium && links.length >= FREE_LINK_LIMIT
  const profileUrl = profile ? `https://tapni.kz/${profile.username}` : ''
  const isTextType = linkForm.icon_type === 'text_block'
  const showHelp = ['kaspi', 'kaspi_pay', 'kaspi_shop', 'twogis'].includes(linkForm.icon_type)

  function downloadQr() {
    const filename = `tapni-qr-${profile?.username ?? 'code'}.png`

    function triggerDownload(url: string) {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    // Priority 1: 600px with user/brand logo (may be tainted if user avatar is cross-origin)
    const dlCanvas = qrDownloadRef.current?.querySelector('canvas')
    if (dlCanvas) {
      try {
        triggerDownload(dlCanvas.toDataURL('image/png'))
        return
      } catch { /* canvas tainted by cross-origin user avatar — fall through */ }
    }
    // Priority 2: 600px with brand logo only (same-origin, never tainted)
    const brandCanvas = qrDownloadBrandRef.current?.querySelector('canvas')
    if (brandCanvas) {
      try {
        triggerDownload(brandCanvas.toDataURL('image/png'))
        return
      } catch { /* shouldn't happen */ }
    }
    // Priority 3: 400px fallback
    const fallback = qrFallbackRef.current?.querySelector('canvas')
    if (fallback) {
      try { triggerDownload(fallback.toDataURL('image/png')); return } catch {}
    }
    alert('Не удалось скачать QR. Попробуйте снова.')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080f]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#08080f] pb-24 text-white">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#08080f]/90 px-5 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-8 w-8 rounded-full object-cover ring-[1.5px] ring-white/20" />
            <span className="text-sm font-bold text-white hidden sm:block">tapni.kz</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/help"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-violet-500/40 hover:text-violet-400"
              title="Помощь и инструкции"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Помощь</span>
            </Link>
            {profile && (
              <Link
                href={`/${profile.username}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-violet-500/40 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Моя страница
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pt-6">
        {profile && (
          <div className="mb-5">
            <p className="text-sm text-gray-400">
              Добро пожаловать,{' '}
              <span className="font-semibold text-white">{profile.business_name}</span>
            </p>
            <p className="text-xs text-gray-600">
              tapni.kz/{profile.username}
              {profile.is_premium && (
                <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
                  ⚡ PREMIUM
                </span>
              )}
            </p>
          </div>
        )}

        {/* ─── Expiry warning banner ─── */}
        {profile?.is_premium && profile.subscription_expires_at && (() => {
          const msLeft = new Date(profile.subscription_expires_at).getTime() - Date.now()
          const daysLeft = Math.ceil(msLeft / 86400000)
          if (daysLeft > 7 || daysLeft <= 0) return null
          const urgent = daysLeft <= 3
          const label = daysLeft <= 1 ? 'Premium истекает завтра!' : `Premium истекает через ${daysLeft} дн.`
          return (
            <Link
              href="/pay"
              className={`mb-4 flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
                urgent
                  ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/15'
                  : 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15'
              }`}
            >
              <span className="text-lg flex-shrink-0">{urgent ? '🚨' : '⏰'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${urgent ? 'text-red-300' : 'text-yellow-300'}`}>{label}</p>
                <p className="text-[11px] text-gray-500">Нажмите чтобы продлить</p>
              </div>
              <span className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                urgent ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-400'
              }`}>Продлить →</span>
            </Link>
          )
        })()}

        {/* ─── Tabs ─── */}
        <div className="mb-6 grid grid-cols-4 gap-1 rounded-xl bg-white/[0.05] p-1">
          {(
            [
              ['profile', User, 'Профиль'],
              ['links', Link2, 'Ссылки'],
              ['leads', ClipboardList, 'Лиды'],
              ['payment', CreditCard, 'Оплата'],
            ] as [DashTab, React.ElementType, string][]
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 rounded-lg py-2.5 text-xs font-semibold transition-all duration-200 ${
                tab === id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ─── Profile Tab ─── */}
        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="space-y-5">
            {/* Avatar upload */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-300">
                <ImagePlus className="h-3.5 w-3.5 text-violet-400" />
                Логотип / Фото
              </label>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/10">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-contain" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600" />
                        <span className="relative text-2xl font-extrabold text-white">
                          {(profileForm.business_name || profile?.business_name || '?').charAt(0).toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-violet-500/40 hover:text-white">
                    <ImagePlus className="h-3.5 w-3.5 flex-shrink-0" />
                    {profile?.avatar_url ? 'Заменить' : 'Загрузить логотип'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadAvatar(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {profile?.avatar_url && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      disabled={avatarUploading}
                      className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                    >
                      Удалить
                    </button>
                  )}
                  <p className="text-[11px] text-gray-600">JPG, PNG, WebP · до 10 МБ · сжимается в WebP 200×200</p>
                </div>
              </div>
              {avatarError && <p className="mt-2 text-xs text-red-400">{avatarError}</p>}
            </div>

            {profile?.phone && (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-300">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Ваш номер телефона
                </label>
                <div className="flex items-center rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
                  <span className="text-sm text-gray-400">+</span>
                  <span className="ml-1 text-sm font-medium text-white">{profile.phone}</span>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Название бизнеса / Имя <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={profileForm.business_name}
                onChange={(e) => setProfileForm((p) => ({ ...p, business_name: e.target.value }))}
                placeholder="Цветы Алматы"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">Описание (Bio)</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Доставка цветов по Алматы 24/7 🌸"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">Адрес / Дополнительно</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="г. Алматы, ул. Абая 10"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
              />
              <p className="mt-1 text-xs text-gray-600">Показывается на вашей публичной странице</p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-300">
                <Palette className="h-3.5 w-3.5" />
                Тема оформления
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setProfileForm((p) => ({ ...p, theme: t.value }))}
                    className={`rounded-xl border p-2.5 text-center transition-all duration-200 ${
                      profileForm.theme === t.value
                        ? 'border-violet-500 ring-2 ring-violet-500/40'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 h-7 w-full rounded-lg ${t.preview}`} />
                    <span className="text-[10px] font-medium text-gray-300 leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Working hours */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4 text-violet-400" />
                Режим работы
              </p>
              <div className="space-y-2">
                {WH_DAYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-6 flex-shrink-0 text-xs font-semibold text-gray-400">{label}</span>
                    <input
                      type="text"
                      value={whForm[key]}
                      onChange={(e) => setWhForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder="09:00-20:00"
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-700 outline-none transition-colors focus:border-violet-500/60"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-600">
                Формат: 09:00-20:00. Оставьте пустым — день выходной. Показывается бейдж «Открыто сейчас» на вашей странице.
              </p>
              <button
                type="button"
                onClick={saveWorkingHours}
                disabled={savingWh}
                className="mt-3 flex items-center gap-2 rounded-xl bg-violet-600/20 px-4 py-2 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-600/30 disabled:opacity-40"
              >
                {savingWh ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Сохранить расписание
              </button>
            </div>

            {profileMsg && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm ${
                profileMsg.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}>
                {profileMsg.type === 'ok'
                  ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                {profileMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Сохранить профиль
            </button>

            {/* QR Code */}
            {profile && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-white"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-violet-400" />
                    QR-код для печати
                  </span>
                  <span className="text-xs text-gray-500">{showQr ? 'Скрыть' : 'Показать'}</span>
                </button>
                {showQr && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    {/* Visible QR: user logo if uploaded, tapni.kz logo otherwise */}
                    <div ref={qrWrapRef} className="rounded-xl bg-white p-3">
                      <QRCodeCanvas
                        value={profileUrl}
                        size={180}
                        level="H"
                        imageSettings={{
                          src: profile?.avatar_url ?? '/brand-logo.jpeg',
                          height: 40,
                          width: 40,
                          excavate: true,
                          ...(profile?.avatar_url ? { crossOrigin: 'anonymous' as const } : {}),
                        }}
                      />
                    </div>
                    {/* Hidden 400px — fallback */}
                    <div ref={qrFallbackRef} className="sr-only">
                      <QRCodeCanvas
                        value={profileUrl}
                        size={400}
                        level="H"
                        imageSettings={{ src: '/brand-logo.jpeg', height: 80, width: 80, excavate: true }}
                      />
                    </div>
                    {/* Hidden 600px download — user logo (crossOrigin:anonymous, may be tainted if Supabase CORS blocked) */}
                    <div ref={qrDownloadRef} className="sr-only">
                      <QRCodeCanvas
                        value={profileUrl}
                        size={600}
                        level="H"
                        imageSettings={{
                          src: profile?.avatar_url ?? '/brand-logo.jpeg',
                          height: 110,
                          width: 110,
                          excavate: true,
                          ...(profile?.avatar_url ? { crossOrigin: 'anonymous' as const } : {}),
                        }}
                      />
                    </div>
                    {/* Hidden 600px download — brand logo only (same-origin, always safe for toDataURL) */}
                    <div ref={qrDownloadBrandRef} className="sr-only">
                      <QRCodeCanvas
                        value={profileUrl}
                        size={600}
                        level="H"
                        imageSettings={{ src: '/brand-logo.jpeg', height: 110, width: 110, excavate: true }}
                      />
                    </div>
                    <p className="text-center text-xs text-gray-400">{profileUrl}</p>
                    {profile?.is_premium ? (
                      <button
                        type="button"
                        onClick={downloadQr}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition-colors hover:border-violet-500/40 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Скачать PNG 600×600 для печати
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTab('payment')}
                        className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs font-semibold text-yellow-400 transition-colors hover:bg-yellow-500/20"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Скачать PNG — только в Premium
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Username change — premium only */}
            {profile?.is_premium && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-yellow-400">
                  <AtSign className="h-4 w-4" />
                  Изменить адрес страницы
                </p>
                <p className="mb-3 text-xs text-gray-400">
                  Текущий: <span className="font-mono text-white">tapni.kz/{profile.username}</span>
                </p>
                <div className="mb-2 flex gap-2">
                  <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]">
                    <span className="flex-shrink-0 pl-3 text-xs text-gray-500">tapni.kz/</span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => {
                        setNewUsername(e.target.value)
                        setUsernameMsg(null)
                      }}
                      placeholder={profile.username}
                      className="flex-1 bg-transparent px-1 py-3 text-base text-white placeholder-gray-600 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={changeUsername}
                    disabled={savingUsername || !newUsername.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-yellow-500/20 px-4 py-3 text-xs font-bold text-yellow-400 transition-colors hover:bg-yellow-500/30 disabled:opacity-40"
                  >
                    {savingUsername ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Сохранить'}
                  </button>
                </div>
                {usernameMsg && (
                  <p className={`text-xs ${usernameMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {usernameMsg.text}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-gray-600">
                  Только буквы, цифры, дефис. Старые ссылки/QR перестанут работать.
                </p>
              </div>
            )}
          </form>
        )}

        {/* ─── Links Tab ─── */}
        {tab === 'links' && (
          <div className="space-y-5">
            {!profile?.is_premium && (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-xs">
                <span className="text-gray-400">
                  Кнопки:{' '}
                  <span className={links.length >= FREE_LINK_LIMIT ? 'text-red-400' : 'text-white'}>
                    {links.length}/{FREE_LINK_LIMIT}
                  </span>
                </span>
                {atLimit && (
                  <button
                    onClick={() => setTab('payment')}
                    className="rounded-lg bg-yellow-500/20 px-2.5 py-1 text-[10px] font-semibold text-yellow-400 transition-colors hover:bg-yellow-500/30"
                  >
                    ⚡ Upgrade → безлимит
                  </button>
                )}
              </div>
            )}

            {atLimit ? (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center">
                <p className="mb-1 text-sm font-semibold text-yellow-400">Лимит достигнут</p>
                <p className="mb-4 text-xs text-gray-400">Бесплатно — {FREE_LINK_LIMIT} кнопки. Premium — безлимит.</p>
                <button
                  onClick={() => setTab('payment')}
                  className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white"
                >
                  ⚡ Premium — 1 000 ₸/мес
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="mb-4 text-sm font-semibold text-white">Добавить кнопку</p>
                <form onSubmit={addLink} className="space-y-3" noValidate>
                  {/* Type selector + help button */}
                  <div className="flex gap-2">
                    <select
                      value={linkForm.icon_type}
                      onChange={(e) => {
                        setLinkForm((p) => ({ ...p, icon_type: e.target.value as IconType, url: '' }))
                        setProductPhotoFile(null)
                        setProductPhotoPreview('')
                        setProductPrice('')
                        setProductLinkUrl('')
                      }}
                      className="flex-1 rounded-xl border border-white/10 bg-[#1a1a2e] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-violet-500/60"
                    >
                      {ICON_OPTIONS
                        .filter((o) => o.value !== 'product' || profile?.is_premium)
                        .map((o) => (
                          <option key={o.value} value={o.value}>{o.label}{o.value === 'product' ? ' ⚡' : ''}</option>
                        ))}
                    </select>
                    {showHelp && (
                      <button
                        type="button"
                        onClick={() => setHelpType(linkForm.icon_type as typeof helpType)}
                        className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gray-400 transition-colors hover:border-violet-500/40 hover:text-violet-400"
                        title="Как найти ссылку?"
                      >
                        <HelpCircle className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Title field */}
                  <input
                    type="text"
                    value={linkForm.title}
                    onChange={(e) => setLinkForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder={
                      isTextType ? 'Заголовок (необязательно)' :
                      linkForm.icon_type === 'product' ? 'Название товара' :
                      'Название кнопки'
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
                  />

                  {/* Product card — special form */}
                  {linkForm.icon_type === 'product' && (
                    <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
                      {/* Photo upload */}
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-violet-400">
                          Фото товара
                        </label>
                        {productPhotoPreview ? (
                          <div className="relative">
                            <img src={productPhotoPreview} alt="preview" className="h-36 w-full rounded-xl object-cover" />
                            <button
                              type="button"
                              onClick={() => { setProductPhotoFile(null); setProductPhotoPreview('') }}
                              className="absolute right-2 top-2 rounded-lg bg-black/60 p-1 text-white hover:bg-black/80"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <p className="mt-1 text-[10px] text-gray-500">Сжато в WebP · до 50 КБ · 600×400</p>
                          </div>
                        ) : (
                          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/[0.04] text-gray-500 transition-colors hover:border-violet-500/60 hover:text-gray-300">
                            <ImagePlus className="h-6 w-6" />
                            <span className="text-xs">Загрузить фото (JPG/PNG, до 10 МБ)</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (file.size > 10 * 1024 * 1024) { setLinkError('Максимум 10 МБ'); return }
                                setProductPhotoFile(file)
                                // Show compressed preview
                                try {
                                  const blob = await compressToWebP(file, 600, 50 * 1024)
                                  setProductPhotoPreview(URL.createObjectURL(blob))
                                  setProductPhotoFile(new File([blob], 'product.webp', { type: 'image/webp' }))
                                } catch {
                                  setProductPhotoPreview(URL.createObjectURL(file))
                                }
                                e.target.value = ''
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {/* Price */}
                      <input
                        type="text"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="Цена (необязательно): 2 990 ₸"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
                      />
                      {/* Product URL */}
                      <input
                        type="text"
                        value={productLinkUrl}
                        onChange={(e) => setProductLinkUrl(e.target.value)}
                        placeholder="Ссылка на товар (Kaspi, сайт...)"
                        inputMode="url"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
                      />
                    </div>
                  )}

                  {/* URL/text field — hidden for product (product has its own form above) */}
                  {linkForm.icon_type !== 'product' && (isTextType ? (
                    <textarea
                      value={linkForm.url}
                      onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
                      placeholder={selectedOption?.placeholder ?? 'Ваш текст...'}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
                    />
                  ) : SMART_INPUTS[linkForm.icon_type] ? (
                    <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] focus-within:border-violet-500/60 transition-colors">
                      <span className="flex flex-shrink-0 items-center border-r border-white/10 bg-white/[0.06] px-3 py-3 text-xs font-mono text-gray-500 select-none whitespace-nowrap">
                        {SMART_INPUTS[linkForm.icon_type]!.prefix}
                      </span>
                      <input
                        type="text"
                        value={linkForm.url}
                        onChange={(e) => {
                          let val = e.target.value
                          // Auto-extract last path segment if user pastes a full URL
                          if (val.includes('/') && (val.startsWith('http') || val.startsWith('t.me') || val.startsWith('wa.me'))) {
                            const parts = val.split('/')
                            val = parts[parts.length - 1] || val
                          }
                          // Strip leading @ when the smart prefix already ends with @ (tiktok, youtube)
                          if (SMART_INPUTS[linkForm.icon_type]?.prefix.endsWith('@')) {
                            val = val.replace(/^@/, '')
                          }
                          // Phone: strip non-digits and leading country code from paste
                          if (linkForm.icon_type === 'phone') {
                            val = val.replace(/\D/g, '')
                            if ((val.startsWith('7') || val.startsWith('8')) && val.length === 11) val = val.slice(1)
                          }
                          setLinkForm((p) => ({ ...p, url: val }))
                        }}
                        placeholder={SMART_INPUTS[linkForm.icon_type]!.placeholder}
                        inputMode={linkForm.icon_type === 'phone' ? 'numeric' : 'text'}
                        className="flex-1 bg-transparent px-3 py-3 text-base text-white placeholder-gray-600 outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={linkForm.url}
                      onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
                      placeholder={selectedOption?.placeholder ?? 'https://...'}
                      inputMode={linkForm.icon_type === 'email' ? 'email' : 'url'}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-base text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500/60"
                    />
                  ))}

                  {linkError && <p className="text-xs text-red-400">{linkError}</p>}

                  <button
                    type="submit"
                    disabled={addingLink || productPhotoUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
                  >
                    {(addingLink || productPhotoUploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {productPhotoUploading ? 'Загружаем фото...' : 'Добавить'}
                  </button>
                </form>
              </div>
            )}

            {/* Links list — colored cards */}
            {links.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-violet-500/20 bg-violet-500/[0.03] p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Zap className="h-4 w-4 text-violet-400" />
                    Добавьте первую кнопку — или выберите шаблон:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
                        disabled={addingLink}
                        className="flex flex-col items-start gap-1 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-3 text-left transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                      >
                        <span className="text-lg">{tpl.emoji}</span>
                        <p className="text-xs font-bold text-white">{tpl.name}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{tpl.description}</p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-gray-600">
                    Или добавьте кнопки вручную через форму выше
                  </p>
                </div>
              </div>
            ) : (
              <>
                {templateApplied && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <span className="flex-shrink-0 text-xl">✏️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-300">Шаблон применён — замените ссылки</p>
                      <p className="mt-0.5 text-xs text-amber-400/70">Удалите кнопки с неверными ссылками и добавьте свои. Пока ссылки не заменены — кнопки ведут в никуда.</p>
                    </div>
                    <button onClick={() => setTemplateApplied(false)} className="flex-shrink-0 text-amber-400/60 hover:text-amber-300">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {links.map((link) => {
                    const { dot, ring } = getLinkCardColor(link.icon_type)
                    return (
                      <div
                        key={link.id}
                        draggable
                        onDragStart={() => setDragId(link.id)}
                        onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                        onDragOver={(e) => { e.preventDefault(); setDragOverId(link.id) }}
                        onDrop={() => handleDrop(link.id)}
                        className={`flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] border-l-4 ${ring} px-3 py-3 transition-opacity ${dragId === link.id ? 'opacity-40' : dragOverId === link.id && dragId !== link.id ? 'ring-2 ring-violet-500/50' : ''}`}
                      >
                        <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-600 active:cursor-grabbing" />
                        <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {link.title || <span className="italic text-gray-500">без заголовка</span>}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {link.icon_type === 'text_block'
                              ? (link.url.length > 50 ? link.url.slice(0, 50) + '…' : link.url)
                              : link.icon_type === 'product'
                                ? (() => { try { const d = JSON.parse(link.url) as { l?: string; price?: string }; return (d.price ? d.price + ' · ' : '') + (d.l ?? '').replace(/^https?:\/\//, '').slice(0, 40) } catch { return 'Карточка товара' } })()
                                : link.url}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          {link.icon_type !== 'text_block' && link.icon_type !== 'lead_form' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500" title="Кликов">
                              <BarChart2 className="h-3 w-3" />
                              {link.click_count ?? 0}
                            </span>
                          )}
                          <button
                            onClick={() => deleteLink(link.id)}
                            disabled={deletingId === link.id}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
                          >
                            {deletingId === link.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Analytics summary */}
                {links.some((l) => l.icon_type !== 'text_block' && l.icon_type !== 'lead_form') && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <BarChart2 className="h-3.5 w-3.5 text-violet-400" />
                      Статистика
                    </p>
                    {(profile?.view_count ?? 0) > 0 && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5">
                        <Eye className="h-4 w-4 flex-shrink-0 text-violet-400" />
                        <span className="text-sm text-gray-300">Просмотров страницы</span>
                        <span className="ml-auto text-sm font-bold text-white">{profile?.view_count ?? 0}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {links
                        .filter((l) => l.icon_type !== 'text_block' && l.icon_type !== 'lead_form')
                        .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
                        .map((link) => {
                          const maxClicks = Math.max(...links.map((l) => l.click_count ?? 0), 1)
                          const pct = Math.round(((link.click_count ?? 0) / maxClicks) * 100)
                          const { dot } = getLinkCardColor(link.icon_type)
                          return (
                            <div key={link.id} className="flex items-center gap-3">
                              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="truncate text-xs text-gray-300">
                                    {link.title || link.icon_type}
                                  </span>
                                  <span className="ml-2 flex-shrink-0 text-xs font-bold text-white">
                                    {link.click_count ?? 0}
                                  </span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${dot}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    <p className="mt-3 text-[11px] text-gray-600">
                      Переходы считаются с момента создания кнопки
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Leads Tab ─── */}
        {tab === 'leads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Заявки от клиентов</p>
                <p className="text-xs text-gray-500">Через кнопку «Записаться» на вашей странице</p>
              </div>
              {!profile?.is_premium && leads.length > 0 && (
                <button
                  onClick={() => setTab('payment')}
                  className="rounded-lg bg-yellow-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-yellow-400 transition-colors hover:bg-yellow-500/30"
                >
                  ⚡ Premium
                </button>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                <p className="mb-1 text-sm font-semibold text-gray-400">Заявок пока нет</p>
                <p className="text-xs text-gray-600">
                  Добавьте кнопку «Записаться» в раздел Ссылки — клиенты смогут оставлять заявки прямо с вашей страницы.
                </p>
              </div>
            ) : (
              <>
                {(!profile?.is_premium ? leads.slice(0, FREE_LEADS_VISIBLE) : leads).map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{lead.name}</p>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs text-violet-400 hover:text-violet-300"
                        >
                          {lead.phone}
                        </a>
                        {lead.message && (
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{lead.message}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[11px] text-gray-600">
                          {new Date(lead.created_at).toLocaleDateString('ru-KZ', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-[11px] text-gray-600">
                          {new Date(lead.created_at).toLocaleTimeString('ru-KZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {!profile?.is_premium && leads.length > 3 && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.05] p-4 text-center">
                    <p className="mb-1 text-sm font-semibold text-yellow-400">
                      +{leads.length - FREE_LEADS_VISIBLE} скрытых заявок
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                      В Premium — полная история без ограничений
                    </p>
                    <button
                      onClick={() => setTab('payment')}
                      className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white"
                    >
                      ⚡ Открыть Premium
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Payment Tab ─── */}
        {tab === 'payment' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-center">
              {profile?.is_premium ? (
                <>
                  <div className="mb-2 text-3xl">⚡</div>
                  <p className="text-base font-bold text-yellow-400">Premium активен</p>
                  {profile.subscription_expires_at && (
                    <p className="mt-1 text-xs text-gray-400">
                      до {new Date(profile.subscription_expires_at).toLocaleDateString('ru-KZ', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Все функции доступны</p>
                </>
              ) : (
                <>
                  <div className="mb-2 text-3xl">🔒</div>
                  <p className="mb-1 text-base font-bold text-white">Бесплатный тариф</p>
                  <p className="text-xs text-gray-400">{FREE_LINK_LIMIT} кнопки · с водяным знаком</p>
                </>
              )}
            </div>
            {!profile?.is_premium && (
              <PlanPicker username={profile?.username ?? ''} phone={profile?.phone} />
            )}

            {/* Referral section — visible to all users */}
            {profile && (
              <ReferralCard username={profile.username} />
            )}
          </div>
        )}
      </div>

      {/* ─── Help modals ─── */}
      {helpType && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-sm sm:items-center"
          onClick={() => setHelpType(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111122] p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-white">
                {helpType === 'kaspi' && '🛒 Как найти ссылку на Kaspi магазин?'}
                {helpType === 'kaspi_pay' && '💸 Как найти ссылку Kaspi Pay?'}
                {helpType === 'kaspi_shop' && '🏪 Как найти ссылку на товар Kaspi?'}
                {helpType === 'twogis' && '📍 Как найти ссылку в 2ГИС?'}
              </p>
              <button
                onClick={() => setHelpType(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(helpType === 'kaspi' || helpType === 'kaspi_shop') && (
              <ol className="space-y-3 text-sm text-gray-300">
                {[
                  'Откройте приложение Kaspi.kz или сайт kaspi.kz/shop',
                  helpType === 'kaspi' ? 'Перейдите в «Мой магазин»' : 'Найдите нужный товар',
                  'Нажмите кнопку «Поделиться»',
                  `Скопируйте ссылку вида ${helpType === 'kaspi' ? 'kaspi.kz/shop/info/...' : 'kaspi.kz/shop/p/...'} — вставьте сюда`,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600/40 text-xs font-bold text-red-300">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}

            {helpType === 'kaspi_pay' && (
              <ol className="space-y-3 text-sm text-gray-300">
                {[
                  'Откройте приложение Kaspi.kz',
                  'Раздел «Платежи» → «Мой QR-код»',
                  'Нажмите «Поделиться» и скопируйте ссылку',
                  'Ссылка вида pay.kaspi.kz/pay/... — вставьте сюда',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600/40 text-xs font-bold text-red-300">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}

            {helpType === 'twogis' && (
              <ol className="space-y-3 text-sm text-gray-300">
                {[
                  'Откройте 2гис.кз или приложение 2ГИС',
                  'Найдите вашу организацию на карте',
                  'Откройте карточку и нажмите «Поделиться»',
                  'Ссылка вида 2gis.kz/... — вставьте её сюда',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600/40 text-xs font-bold text-cyan-300">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}

            <button
              onClick={() => setHelpType(null)}
              className="mt-5 w-full rounded-xl bg-white/[0.07] py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

const WA_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

function PlanPicker({ username, phone }: { username: string; phone?: string | null }) {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual')
  const [notifying, setNotifying] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [refCopied, setRefCopied] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ company: '', bin: '' })
  const [invoiceSending, setInvoiceSending] = useState(false)
  const [invoiceMsg, setInvoiceMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const KASPI_PAY = 'https://pay.kaspi.kz/pay/fugemta0'
  const HALYK_PHONE = '+77755696531'
  const REF_CODE = `TAP-${username}`
  const waText = `Оплатил Premium ${REF_CODE} ${plan === 'annual' ? 'годовая' : 'месячная'}`
  const WA_SUPPORT = `https://wa.me/77755696531?text=${encodeURIComponent(waText)}`

  function copyRef() {
    navigator.clipboard.writeText(REF_CODE).then(() => {
      setRefCopied(true)
      setTimeout(() => setRefCopied(false), 2000)
    })
  }

  async function notifyAdmin() {
    setNotifying(true)
    setMsg(null)
    try {
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment_request', username, plan, phone }),
      })
      if (!res.ok) throw new Error()
      setMsg({ type: 'ok', text: 'Уведомление отправлено! Активируем Premium за 15 минут.' })
    } catch {
      setMsg({ type: 'err', text: 'Ошибка. Попробуйте ещё раз.' })
    } finally {
      setNotifying(false)
    }
  }

  async function sendInvoice() {
    if (!invoiceForm.company.trim() || !invoiceForm.bin.trim()) {
      setInvoiceMsg({ type: 'err', text: 'Заполните название компании и БИН' })
      return
    }
    if (!/^\d{12}$/.test(invoiceForm.bin.replace(/\s/g, ''))) {
      setInvoiceMsg({ type: 'err', text: 'БИН — 12 цифр' })
      return
    }
    setInvoiceSending(true)
    setInvoiceMsg(null)
    try {
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice_request',
          username,
          phone,
          company: invoiceForm.company.trim(),
          bin: invoiceForm.bin.replace(/\s/g, ''),
        }),
      })
      if (!res.ok) throw new Error()
      setInvoiceMsg({ type: 'ok', text: 'Запрос отправлен! Вышлем счёт в WhatsApp в течение 2 часов.' })
    } catch {
      setInvoiceMsg({ type: 'err', text: 'Ошибка. Попробуйте ещё раз.' })
    } finally {
      setInvoiceSending(false)
    }
  }

  const price = plan === 'annual' ? '10 000' : '1 000'
  const days = plan === 'annual' ? 365 : 30

  return (
    <div className="space-y-4">
      {/* Features */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="mb-3 text-sm font-semibold text-violet-300">⚡ Premium</p>
        <ul className="space-y-2">
          {[
            'Безлимитное число кнопок',
            'Свой логотип на странице',
            'Все типы ссылок (YouTube, TikTok, Facebook…)',
            'Темы: Блогер, Бизнес, Селлер',
            'Без водяного знака tapni.kz',
            'QR-код для печати на визитках',
            'Смена адреса tapni.kz/ник',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Plan toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPlan('monthly')}
          className={`rounded-xl border p-3 text-center transition-all duration-200 ${
            plan === 'monthly'
              ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <p className="text-base font-extrabold text-white">1 000 ₸</p>
          <p className="text-[11px] text-gray-400">в месяц</p>
        </button>
        <button
          type="button"
          onClick={() => setPlan('annual')}
          className={`relative rounded-xl border p-3 text-center transition-all duration-200 ${
            plan === 'annual'
              ? 'border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/30'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-black">ВЫГОДНЕЕ</span>
          </div>
          <p className="text-base font-extrabold text-white">10 000 ₸</p>
          <p className="text-[11px] text-gray-400">в год · −2 000 ₸</p>
        </button>
      </div>

      {/* Reference code */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">Код платежа (укажите при переводе)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-black/30 px-3 py-2 font-mono text-sm font-bold tracking-wider text-white">
            {REF_CODE}
          </code>
          <button
            type="button"
            onClick={copyRef}
            className="flex-shrink-0 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/30"
          >
            {refCopied ? '✓' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Kaspi Pay */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="mb-3 text-sm font-semibold text-white">💳 Оплата через Kaspi</p>
        <a
          href={KASPI_PAY}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F14635] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#d93b2b] active:scale-[0.98]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3h3v7.5l6-7.5h3.5L11 11l7 10h-3.5L9 13.5 8 14.8V21H5V3z" />
          </svg>
          Оплатить {price} ₸ через Kaspi Pay
        </a>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          После оплаты укажите код <span className="font-mono font-bold text-amber-400">{REF_CODE}</span> в WhatsApp
        </p>
      </div>

      {/* Halyk Bank */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="mb-3 text-sm font-semibold text-white">🏦 Перевод через Halyk Bank</p>
        <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="mb-0.5 text-[11px] text-gray-500">Номер для перевода</p>
          <p className="text-lg font-extrabold tracking-widest text-white">{HALYK_PHONE}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Получатель: Голденбит Казахстан</p>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-gray-400">Сумма</p>
            <p className="text-sm font-bold text-white">{price} ₸</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-gray-400">Комментарий</p>
            <p className="font-mono text-sm font-bold text-amber-400">{REF_CODE}</p>
          </div>
        </div>
        <a
          href={WA_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] transition-all hover:bg-[#25D366]/20 active:scale-[0.98]"
        >
          {WA_ICON}
          Написать в WhatsApp после перевода
        </a>
      </div>

      {/* Notify admin after payment */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="mb-1 text-sm font-semibold text-white">✅ Уже оплатили?</p>
        <p className="mb-3 text-xs text-gray-400">
          Нажмите кнопку — активируем Premium за 15 минут ({days} дней доступа)
        </p>
        {msg && (
          <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
            msg.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}>
            {msg.type === 'ok'
              ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              : <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
            {msg.text}
          </div>
        )}
        <button
          onClick={notifyAdmin}
          disabled={notifying || msg?.type === 'ok'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60"
        >
          {notifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Я оплатил — активировать Premium
        </button>
      </div>

      {/* Invoice for legal entities */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <button
          type="button"
          onClick={() => setShowInvoice((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-blue-300"
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Счёт для юридических лиц
          </span>
          <span className="text-xs text-gray-500">{showInvoice ? 'Скрыть' : 'Открыть'}</span>
        </button>
        {showInvoice && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">
              Только годовой тариф — 10 000 ₸/год. Вышлем счёт в WhatsApp в течение 2 часов.
            </p>
            <input
              type="text"
              value={invoiceForm.company}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, company: e.target.value }))}
              placeholder="Название компании (ТОО / АО)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/60"
            />
            <input
              type="text"
              inputMode="numeric"
              value={invoiceForm.bin}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, bin: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
              placeholder="БИН компании (12 цифр)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/60"
            />
            {invoiceMsg && (
              <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                invoiceMsg.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}>
                {invoiceMsg.type === 'ok'
                  ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  : <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
                {invoiceMsg.text}
              </div>
            )}
            <button
              type="button"
              onClick={sendInvoice}
              disabled={invoiceSending || invoiceMsg?.type === 'ok'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60"
            >
              {invoiceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Запросить счёт на оплату
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReferralCard({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)
  const referralUrl = `https://tapni.kz/auth?ref=${username}`

  function copy() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-violet-300">
        <Users className="h-4 w-4" />
        Реферальная программа
      </p>
      <p className="mb-3 text-xs text-gray-400">
        Пригласите друга — оба получите <b className="text-white">+7 дней Premium</b> бесплатно!
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
        <span className="flex-1 truncate text-xs font-mono text-gray-300">{referralUrl}</span>
        <button
          onClick={copy}
          className="flex-shrink-0 rounded-lg bg-violet-600/30 px-2.5 py-1 text-[11px] font-semibold text-violet-300 transition-colors hover:bg-violet-600/50"
        >
          {copied ? '✓ Скопировано' : 'Копировать'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-600">
        Бонус начисляется через 7 дней после регистрации друга
      </p>
    </div>
  )
}
