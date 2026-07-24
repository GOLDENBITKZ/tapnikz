'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Link2, CreditCard, Loader2, Trash2, Plus, LogOut, ExternalLink,
  CheckCircle2, AlertCircle, MessageCircle, Palette,
  QrCode, Download, HelpCircle, X, ImagePlus, Zap, FileText, AtSign, BarChart2,
  ClipboardList, Clock, GripVertical, Eye, Share2, Users, Pencil, Check, Star,
} from 'lucide-react'

import { TEMPLATES, PLACEHOLDER_PREFIX } from '@/lib/templates'
import type { LeadSubmission } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import { getSupabase, type Profile, type Link as LinkRow, type IconType, type Theme, type WorkingHours, FREE_LINK_LIMIT, FREE_LEADS_VISIBLE } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { KASPI_PAY_URL, SUPPORT_PHONE } from '@/lib/payment-config'
import { OnboardingWizard } from '@/components/onboarding-wizard'

type DashTab = 'profile' | 'links' | 'leads' | 'payment'

const ICON_OPTIONS: { value: IconType; label: string; placeholder: string }[] = [
  { value: 'whatsapp',   label: '💬 WhatsApp',        placeholder: 'https://wa.me/77001234567' },
  { value: 'telegram',   label: '✈️ Telegram',         placeholder: 'https://t.me/username' },
  { value: 'kaspi_pay',  label: '💸 Kaspi Pay',        placeholder: 'https://pay.kaspi.kz/pay/...' },
  { value: 'kaspi_qr',   label: '📱 Kaspi Pay QR-код', placeholder: 'https://pay.kaspi.kz/pay/...' },

  { value: 'smart_qr',   label: '📲 Smart QR — iOS / Android / Web ⚡', placeholder: '' },
  { value: 'kaspi',      label: '🛒 Kaspi магазин',    placeholder: 'https://kaspi.kz/shop/info/...' },
  { value: 'kaspi_shop', label: '🏪 Kaspi товар',      placeholder: 'https://kaspi.kz/shop/p/...' },
  { value: 'twogis',     label: '📍 2ГИС',             placeholder: 'https://2gis.kz/...' },
  { value: 'instagram',      label: '📸 Instagram',           placeholder: 'https://instagram.com/username' },
  { value: 'instagram_dm',   label: '💬 Написать в Direct',  placeholder: 'https://ig.me/m/username' },
  { value: 'instagram_reel', label: '🎬 Reels / Пост',       placeholder: 'https://instagram.com/reel/...' },
  { value: 'follow_gate',    label: '🔒 Подпишись и получи', placeholder: '' },
  { value: 'milestone',         label: '🚀 Вирусный вызов',            placeholder: '' },
  { value: 'instagram_keyword', label: '🗝️ DM-триггер (ключ. слово)', placeholder: '' },
  { value: 'tiktok',     label: '🎵 TikTok',           placeholder: 'https://tiktok.com/@username' },
  { value: 'youtube',    label: '▶️ YouTube',           placeholder: 'https://youtube.com/@channel' },
  { value: 'website',    label: '🌐 Сайт',             placeholder: 'https://example.com' },
  { value: 'phone',      label: '📞 Позвонить',         placeholder: '77001234567' },
  { value: 'email',      label: '✉️ Email',             placeholder: 'info@example.com' },
  { value: 'kolesa',     label: '🚗 Kolesa.kz',        placeholder: 'https://kolesa.kz/a/show/...' },
  { value: 'krisha',     label: '🏠 Krisha.kz',        placeholder: 'https://krisha.kz/a/show/...' },
  { value: 'vk',         label: '💙 ВКонтакте',         placeholder: 'https://vk.com/username' },
  { value: 'facebook',   label: '📘 Facebook',          placeholder: 'https://facebook.com/username' },
  { value: 'twitter',    label: '𝕏 X (Twitter)',         placeholder: 'https://x.com/username' },
  { value: 'android',    label: '🤖 Google Play',       placeholder: 'https://play.google.com/store/apps/details?id=...' },
  { value: 'ios',        label: '🍎 App Store',         placeholder: 'https://apps.apple.com/app/...' },
  { value: 'menu',       label: '🍽 Меню',              placeholder: 'https://example.com/menu' },
  { value: 'paypal',     label: '💳 PayPal',            placeholder: 'https://paypal.me/username' },
  { value: 'countdown',  label: '⏳ Таймер обратного отсчёта', placeholder: '' },
  { value: 'pricelist',  label: '💰 Прайс-лист / Услуги',    placeholder: '' },
  { value: 'image',      label: '🖼 Баннер-изображение',      placeholder: '' },
  { value: 'video',      label: '📹 Видео (YouTube / TikTok)', placeholder: '' },
  { value: 'faq',        label: '❓ FAQ / Вопросы и ответы',  placeholder: '' },
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
    case 'instagram':      return { dot: 'bg-pink-500', ring: 'border-l-pink-500' }
    case 'instagram_dm':   return { dot: 'bg-pink-500', ring: 'border-l-pink-500' }
    case 'instagram_reel': return { dot: 'bg-pink-400', ring: 'border-l-pink-400' }
    case 'follow_gate':    return { dot: 'bg-violet-400', ring: 'border-l-violet-400' }
    case 'milestone':         return { dot: 'bg-pink-400', ring: 'border-l-pink-400' }
    case 'instagram_keyword': return { dot: 'bg-pink-500', ring: 'border-l-pink-500' }
    case 'tiktok':     return { dot: 'bg-gray-300', ring: 'border-l-gray-400' }
    case 'youtube':    return { dot: 'bg-[#FF0000]', ring: 'border-l-[#FF0000]' }
    case 'kaspi':
    case 'kaspi_pay':
    case 'kaspi_shop':
    case 'kaspi_qr':  return { dot: 'bg-[#E50000]', ring: 'border-l-[#E50000]' }
    case 'smart_qr':  return { dot: 'bg-violet-500', ring: 'border-l-violet-500' }
    case 'twogis':     return { dot: 'bg-[#1DB256]', ring: 'border-l-[#1DB256]' }
    case 'kolesa':     return { dot: 'bg-[#FF6600]', ring: 'border-l-orange-500' }
    case 'krisha':     return { dot: 'bg-[#0076CC]', ring: 'border-l-blue-500' }
    case 'website':    return { dot: 'bg-blue-500', ring: 'border-l-blue-500' }
    case 'phone':      return { dot: 'bg-green-500', ring: 'border-l-green-500' }
    case 'email':      return { dot: 'bg-violet-500', ring: 'border-l-violet-500' }
    case 'vk':         return { dot: 'bg-blue-600', ring: 'border-l-blue-600' }
    case 'facebook':   return { dot: 'bg-[#1877F2]', ring: 'border-l-[#1877F2]' }
    case 'twitter':    return { dot: 'bg-black', ring: 'border-l-black' }
    case 'android':    return { dot: 'bg-[#3DDC84]', ring: 'border-l-[#3DDC84]' }
    case 'ios':        return { dot: 'bg-[#007AFF]', ring: 'border-l-[#007AFF]' }
    case 'menu':       return { dot: 'bg-[#FF8C00]', ring: 'border-l-[#FF8C00]' }
    case 'paypal':     return { dot: 'bg-[#003087]', ring: 'border-l-[#003087]' }
    case 'countdown':  return { dot: 'bg-amber-400', ring: 'border-l-amber-400' }
    case 'pricelist':  return { dot: 'bg-emerald-400', ring: 'border-l-emerald-400' }
    case 'image':      return { dot: 'bg-sky-400', ring: 'border-l-sky-400' }
    case 'video':      return { dot: 'bg-rose-400', ring: 'border-l-rose-400' }
    case 'faq':        return { dot: 'bg-indigo-400', ring: 'border-l-indigo-400' }
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
  // niche/city pages
  'kaspi-prodavets', 'instagram-bloger', 'kafe-restoran', 'master-uslugi',
  'salon-krasoty', 'fotografy', 'fitness', 'nedvizhimost', 'avto', 'dostavka',
  'almaty', 'astana', 'shymkent', 'aktobe', 'karaganda', 'atyrau',
  'kostanay', 'pavlodar', 'semey', 'taraz',
  // service pages
  'discover', 'help', 'partners',
])

// Smart URL config: show a fixed prefix, user only types the short part
const SMART_INPUTS: Partial<Record<IconType, { prefix: string; placeholder: string }>> = {
  whatsapp:  { prefix: 'wa.me/', placeholder: '77001234567' },
  telegram:  { prefix: 't.me/', placeholder: 'username' },
  instagram:    { prefix: 'instagram.com/', placeholder: 'username' },
  instagram_dm: { prefix: 'ig.me/m/', placeholder: 'your_username' },
  tiktok:    { prefix: 'tiktok.com/@', placeholder: 'username' },
  youtube:   { prefix: 'youtube.com/@', placeholder: 'channel' },
  vk:        { prefix: 'vk.com/', placeholder: 'nickname' },
  facebook:  { prefix: 'facebook.com/', placeholder: 'page-name' },
  twitter:   { prefix: 'x.com/', placeholder: 'username' },
  phone:     { prefix: '+7', placeholder: '701 234 5678 · 111 · 8800' },
}

// Compress image to JPEG — universally supported in all browsers including YaBrowser.
// WebP canvas encoding is unreliable: some browsers produce non-standard WebP that
// Supabase Storage's file-type validator doesn't recognise → HTTP 400.
// JPEG always works, supports quality parameter, and is in the bucket's allowed_mime_types.
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
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob_null')), 'image/jpeg', q)
    )

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
  const [linkCopied, setLinkCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string>('')

  // Leads
  const [leads, setLeads] = useState<LeadSubmission[]>([])

  // 7-day click timeline
  const [recentClicks, setRecentClicks] = useState<{ created_at: string }[]>([])

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

  type SlotDraft = { name: string; start: string; end: string }
  type DayDraft = { enabled: boolean; slots: SlotDraft[] }
  type ExtScheduleForm = Record<WhKey, DayDraft>

  function makeDefaultExt(): ExtScheduleForm {
    const allKeys: WhKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const obj = {} as ExtScheduleForm
    for (const k of allKeys) {
      obj[k] = {
        enabled: !['sat', 'sun'].includes(k),
        slots: [{ name: '', start: '09:00', end: '18:00' }],
      }
    }
    return obj
  }

  const [whMode, setWhMode] = useState<'simple' | 'schedule'>('simple')
  const [whIs247, setWhIs247] = useState(false)
  const [extSchedule, setExtSchedule] = useState<ExtScheduleForm>(makeDefaultExt)

  function updateSlot(dayKey: WhKey, idx: number, field: keyof SlotDraft, value: string) {
    setExtSchedule((prev) => {
      const slots = prev[dayKey].slots.map((s, i) => i === idx ? { ...s, [field]: value } : s)
      return { ...prev, [dayKey]: { ...prev[dayKey], slots } }
    })
  }
  function addSlot(dayKey: WhKey) {
    setExtSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], slots: [...prev[dayKey].slots, { name: '', start: '09:00', end: '18:00' }] },
    }))
  }
  function removeSlot(dayKey: WhKey, idx: number) {
    setExtSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], slots: prev[dayKey].slots.filter((_, i) => i !== idx) },
    }))
  }
  function toggleDay(dayKey: WhKey) {
    setExtSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], enabled: !prev[dayKey].enabled },
    }))
  }

  function switchToSchedule() {
    const newExt = makeDefaultExt()
    for (const { key } of WH_DAYS) {
      const val = whForm[key].trim()
      if (val && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(val)) {
        const [start, end] = val.split('-')
        newExt[key] = { enabled: true, slots: [{ name: '', start, end }] }
      } else {
        newExt[key] = { enabled: false, slots: [{ name: '', start: '09:00', end: '18:00' }] }
      }
    }
    setExtSchedule(newExt)
    setWhMode('schedule')
  }

  function switchToSimple() {
    const newForm: Record<WhKey, string> = { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' }
    for (const { key } of WH_DAYS) {
      const day = extSchedule[key]
      if (day.enabled && day.slots.length > 0) {
        const s = day.slots[0]
        if (/^\d{2}:\d{2}$/.test(s.start) && /^\d{2}:\d{2}$/.test(s.end)) {
          newForm[key] = `${s.start}-${s.end}`
        }
      }
    }
    setWhForm(newForm)
    setWhMode('simple')
  }

  function buildWorkingHours(): Record<string, unknown> {
    if (whIs247) return { mode: 'always_open' }
    if (whMode === 'simple') {
      const wh: Record<string, string | null> = {}
      for (const { key } of WH_DAYS) {
        const val = whForm[key].trim()
        wh[key] = val && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(val) ? val : null
      }
      return wh
    }
    const wh: Record<string, unknown> = { mode: 'schedule' }
    for (const { key } of WH_DAYS) {
      const day = extSchedule[key]
      if (!day.enabled) { wh[key] = null; continue }
      const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      const validSlots = day.slots
        .filter((s) => /^\d{2}:\d{2}$/.test(s.start) && /^\d{2}:\d{2}$/.test(s.end) && s.start !== s.end)
        .map((s) => ({ name: s.name.trim(), time: `${s.start}-${s.end}` }))
      wh[key] = validSlots.length > 0 ? validSlots : null
    }
    return wh
  }

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
  const [followGateHandle, setFollowGateHandle] = useState('')
  const [followGateContent, setFollowGateContent] = useState('')
  const [milestoneGoal, setMilestoneGoal] = useState('500')
  const [milestoneHours, setMilestoneHours] = useState('24')
  const [milestoneRewardUrl, setMilestoneRewardUrl] = useState('')
  const [milestoneRewardCode, setMilestoneRewardCode] = useState('')
  const [keywordIg, setKeywordIg] = useState('')
  const [keywordWord, setKeywordWord] = useState('')
  const [keywordReward, setKeywordReward] = useState('')
  // Countdown block state
  const [countdownTarget, setCountdownTarget] = useState('')
  const [countdownLabel, setCountdownLabel] = useState('')
  // Pricelist block state
  const [pricelistTitle, setPricelistTitle] = useState('')
  const [pricelistItems, setPricelistItems] = useState<{ name: string; price: string; desc: string }[]>([{ name: '', price: '', desc: '' }])
  // Image block state
  const [imageSrc, setImageSrc] = useState('')
  const [imageSp, setImageSp] = useState('')          // storage path for cleanup on delete
  const [imageAlt, setImageAlt] = useState('')
  const [imageLink, setImageLink] = useState('')
  const [imageDisplayMode, setImageDisplayMode] = useState<'image' | 'button'>('image')
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'file'>('url')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')
  // Video block state
  const [videoUrl, setVideoUrl] = useState('')
  // FAQ block state
  const [faqTitle, setFaqTitle] = useState('')
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([{ q: '', a: '' }])

  // Smart QR state
  const [smartQrIos, setSmartQrIos] = useState('')
  const [smartQrAndroid, setSmartQrAndroid] = useState('')
  const [smartQrWeb, setSmartQrWeb] = useState('')

  // ─── Edit mode state ───────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')      // simple types
  const [editFgHandle, setEditFgHandle] = useState('')
  const [editFgContent, setEditFgContent] = useState('')
  const [editMsGoal, setEditMsGoal] = useState('')
  const [editMsHours, setEditMsHours] = useState('')
  const [editMsRewardUrl, setEditMsRewardUrl] = useState('')
  const [editMsRewardCode, setEditMsRewardCode] = useState('')
  const [editKwIg, setEditKwIg] = useState('')
  const [editKwWord, setEditKwWord] = useState('')
  const [editKwReward, setEditKwReward] = useState('')
  const [editCdTarget, setEditCdTarget] = useState('')
  const [editCdLabel, setEditCdLabel] = useState('')
  const [editPlTitle, setEditPlTitle] = useState('')
  const [editPlItems, setEditPlItems] = useState<{ name: string; price: string; desc: string }[]>([])
  const [editImgSrc, setEditImgSrc] = useState('')
  const [editImgSp, setEditImgSp] = useState('')      // storage path of current image (for old-file cleanup)
  const [editImgAlt, setEditImgAlt] = useState('')
  const [editImgLink, setEditImgLink] = useState('')
  const [editImgDisplayMode, setEditImgDisplayMode] = useState<'image' | 'button'>('image')
  const [editImgUploadMode, setEditImgUploadMode] = useState<'url' | 'file'>('url')
  const [editImgUploading, setEditImgUploading] = useState(false)
  const [editImgUploadError, setEditImgUploadError] = useState('')
  const [editVidUrl, setEditVidUrl] = useState('')
  const [editFaqTitle, setEditFaqTitle] = useState('')
  const [editFaqItems, setEditFaqItems] = useState<{ q: string; a: string }[]>([])
  const [editProdUrl, setEditProdUrl] = useState('')
  const [editProdPrice, setEditProdPrice] = useState('')
  const [editSqIos, setEditSqIos] = useState('')
  const [editSqAndroid, setEditSqAndroid] = useState('')
  const [editSqWeb, setEditSqWeb] = useState('')
  const [editVisibleFrom, setEditVisibleFrom] = useState('')
  const [editVisibleUntil, setEditVisibleUntil] = useState('')

  // Username change (premium)
  const [newUsername, setNewUsername] = useState('')
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingUsername, setSavingUsername] = useState(false)

  const loadData = useCallback(async (userId: string) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const [{ data: prof }, { data: lnks }, { data: lds }] = await Promise.all([
      getSupabase().from('profiles').select('id,username,business_name,bio,phone,address,avatar_url,theme,is_premium,subscription_expires_at,subscription_plan,telegram_chat_id,view_count,working_hours,referred_by,referral_bonus_given,created_at,updated_at').eq('id', userId).single(),
      getSupabase().from('links').select('id,profile_id,title,url,icon_type,sort_order,click_count,created_at,visible_from,visible_until,is_featured').eq('profile_id', userId).order('sort_order'),
      getSupabase().from('lead_submissions').select('*').eq('profile_id', userId).order('created_at', { ascending: false }).limit(50),
    ])
    // Fetch click_events scoped to this user's link IDs (avoids platform-wide query)
    const linkIds = (lnks ?? []).map((l: { id: string }) => l.id)
    const { data: clicks } = linkIds.length > 0
      ? await getSupabase().from('click_events').select('created_at').in('link_id', linkIds).gte('created_at', sevenDaysAgo).limit(2000)
      : { data: [] }
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
        if (wh.mode === 'always_open') {
          setWhIs247(true)
        }
        const isSchedule = wh.mode === 'schedule' || WH_DAYS.some(({ key }) => Array.isArray(wh[key]))
        if (isSchedule) {
          setWhMode('schedule')
          const ext = makeDefaultExt()
          for (const { key } of WH_DAYS) {
            const dayData = wh[key]
            if (!dayData) {
              ext[key] = { enabled: false, slots: [{ name: '', start: '09:00', end: '18:00' }] }
            } else if (typeof dayData === 'string') {
              const [start = '09:00', end = '18:00'] = dayData.split('-')
              ext[key] = { enabled: true, slots: [{ name: '', start, end }] }
            } else if (Array.isArray(dayData) && dayData.length > 0) {
              ext[key] = {
                enabled: true,
                slots: dayData.map((s) => {
                  const [start = '09:00', end = '18:00'] = s.time.split('-')
                  return { name: s.name || '', start, end }
                }),
              }
            }
          }
          setExtSchedule(ext)
        } else {
          setWhForm({
            mon: typeof wh.mon === 'string' ? wh.mon : '',
            tue: typeof wh.tue === 'string' ? wh.tue : '',
            wed: typeof wh.wed === 'string' ? wh.wed : '',
            thu: typeof wh.thu === 'string' ? wh.thu : '',
            fri: typeof wh.fri === 'string' ? wh.fri : '',
            sat: typeof wh.sat === 'string' ? wh.sat : '',
            sun: typeof wh.sun === 'string' ? wh.sun : '',
          })
        }
      }
    }
    if (lnks) setLinks(lnks as LinkRow[])
    if (lds) setLeads(lds as LeadSubmission[])
    if (clicks) setRecentClicks(clicks as { created_at: string }[])
  }, [])

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      setUser(session.user)
      setAccessToken(session.access_token)
      loadData(session.user.id).finally(() => {
        setLoading(false)
        // Open Links tab for new users (?welcome=1) or ?tab=links
        const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        if (sp?.get('welcome') === '1' || sp?.get('tab') === 'links') {
          setTab('links')
        }
      })
    })
    // Keep accessToken fresh — Supabase auto-refreshes every ~55min, we must sync React state
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) setAccessToken(session.access_token)
      else router.replace('/auth')
    })
    return () => subscription.unsubscribe()
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
      const wh = buildWorkingHours()

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
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .replace(/[-._]{2,}/g, (m) => m[0])

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
    if (type === 'product') return u
    if (type === 'follow_gate') return u
    if (type === 'milestone') return u
    if (type === 'instagram_keyword') return u
    if (type === 'countdown') return u
    if (type === 'pricelist') return u
    if (type === 'image') return u
    if (type === 'video') return u
    if (type === 'faq') return u
    if (type === 'instagram_dm') {
      if (u.startsWith('http')) return u
      return `https://ig.me/m/${u.replace(/^@/, '')}`
    }
    if (type === 'phone') {
      const digits = u.replace(/\D/g, '')
      if (!digits) return ''
      if (digits.length <= 7) return `tel:${digits}`
      if (digits.length === 11 && digits.startsWith('8')) return `tel:+7${digits.slice(1)}`
      if (digits.length === 10) return `tel:+7${digits}`
      return `tel:+${digits}`
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
      // Handle partial paths: channel/UCxxx, c/name, user/name
      if (/^(channel|c|user)\//.test(u)) return `https://youtube.com/${u}`
      // Strip any youtube.com/www.youtube.com prefix user may have pasted without https://
      const clean = u.replace(/^(www\.)?youtube\.com\/(channel\/)?@?/, '').replace(/^@/, '').trim()
      if (!clean) return ''
      // YouTube Channel ID format: UC + 22 alphanumeric/dash chars
      if (/^UC[\w-]{22}$/.test(clean)) return `https://youtube.com/channel/${clean}`
      return `https://youtube.com/@${clean}`
    }
    if (type === 'vk') {
      if (u.startsWith('http')) return u
      return `https://vk.com/${u}`
    }
    if (type === 'facebook') {
      if (u.startsWith('http')) return u
      return `https://facebook.com/${u}`
    }
    if (type === 'twitter') {
      if (u.startsWith('http')) return u
      const clean = u.replace(/^(www\.)?(twitter|x)\.com\//, '').replace(/^@/, '').trim()
      if (!clean) return ''
      return `https://x.com/${clean}`
    }
    // 2GIS: when copied from the app, the text may be "Название заведения https://2gis.kz/..."
    // Extract the URL part if the pasted text contains an http URL
    if (type === 'twogis') {
      const urlMatch = u.match(/https?:\/\/\S+/)
      const extracted = urlMatch ? urlMatch[0] : u
      if (!extracted.startsWith('http')) return `https://${extracted}`
      return extracted
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
    const isFollowGate = linkForm.icon_type === 'follow_gate'
    const isMilestone = linkForm.icon_type === 'milestone'
    const isKeyword = linkForm.icon_type === 'instagram_keyword'
    const isCountdown = linkForm.icon_type === 'countdown'
    const isPricelist = linkForm.icon_type === 'pricelist'
    const isImage = linkForm.icon_type === 'image'
    const isVideo = linkForm.icon_type === 'video'
    const isFaq = linkForm.icon_type === 'faq'
    const isSmartQr = linkForm.icon_type === 'smart_qr'

    if (isCountdown) {
      if (!countdownTarget) { setLinkError('Выберите дату и время'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({ target: countdownTarget, label: countdownLabel.trim() || 'До события' })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Таймер', url: urlJson, icon_type: 'countdown', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'countdown' })
        setCountdownTarget('')
        setCountdownLabel('')
        await loadData(user.id)
      } catch { setLinkError('Не удалось добавить таймер') }
      finally { setAddingLink(false) }
      return
    }

    if (isPricelist) {
      const validItems = pricelistItems.filter((i) => i.name.trim() && i.price.trim())
      if (validItems.length === 0) { setLinkError('Добавьте хотя бы одну позицию с названием и ценой'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({ title: pricelistTitle.trim() || 'Услуги', items: validItems })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || pricelistTitle.trim() || 'Прайс-лист', url: urlJson, icon_type: 'pricelist', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'pricelist' })
        setPricelistTitle('')
        setPricelistItems([{ name: '', price: '', desc: '' }])
        await loadData(user.id)
      } catch { setLinkError('Не удалось добавить прайс-лист') }
      finally { setAddingLink(false) }
      return
    }

    if (isImage) {
      if (!imageSrc.trim()) { setLinkError('Введите URL изображения'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const src = imageSrc.trim().startsWith('http') ? imageSrc.trim() : `https://${imageSrc.trim()}`
        const lnk = imageLink.trim() ? (imageLink.trim().startsWith('http') ? imageLink.trim() : `https://${imageLink.trim()}`) : ''
        const urlJson = JSON.stringify({
          src,
          ...(imageSp ? { sp: imageSp } : {}),
          mode: imageDisplayMode,
          ...(imageAlt.trim() ? { alt: imageAlt.trim() } : {}),
          ...(lnk ? { link: lnk } : {}),
        })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Изображение', url: urlJson, icon_type: 'image', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'image' })
        setImageSrc('')
        setImageSp('')
        setImageAlt('')
        setImageLink('')
        setImageDisplayMode('image')
        await loadData(user.id)
      } catch { setLinkError('Не удалось добавить изображение') }
      finally { setAddingLink(false) }
      return
    }

    if (isVideo) {
      if (!videoUrl.trim()) { setLinkError('Введите ссылку на видео'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({ url: videoUrl.trim().startsWith('http') ? videoUrl.trim() : `https://${videoUrl.trim()}` })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Видео', url: urlJson, icon_type: 'video', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'video' })
        setVideoUrl('')
        await loadData(user.id)
      } catch { setLinkError('Не удалось добавить видео') }
      finally { setAddingLink(false) }
      return
    }

    if (isFaq) {
      const validItems = faqItems.filter((i) => i.q.trim() && i.a.trim())
      if (validItems.length === 0) { setLinkError('Добавьте хотя бы один вопрос с ответом'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({ title: faqTitle.trim() || 'Часто задаваемые вопросы', items: validItems })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || faqTitle.trim() || 'FAQ', url: urlJson, icon_type: 'faq', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'faq' })
        setFaqTitle('')
        setFaqItems([{ q: '', a: '' }])
        await loadData(user.id)
      } catch { setLinkError('Не удалось добавить FAQ') }
      finally { setAddingLink(false) }
      return
    }

    if (isKeyword) {
      if (!keywordIg.trim()) { setLinkError('Введите Instagram @username'); return }
      if (!keywordWord.trim()) { setLinkError('Введите ключевое слово'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({
          ig: keywordIg.replace(/^@/, '').trim(),
          keyword: keywordWord.trim().toUpperCase(),
          reward: keywordReward.trim(),
        })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || `Напиши «${keywordWord.trim().toUpperCase()}» в Direct`, url: urlJson, icon_type: 'instagram_keyword', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'instagram_keyword' })
        setKeywordIg('')
        setKeywordWord('')
        setKeywordReward('')
        await loadData(user.id)
      } catch {
        setLinkError('Не удалось добавить DM-триггер')
      } finally {
        setAddingLink(false)
      }
      return
    }

    if (isMilestone) {
      const goal = parseInt(milestoneGoal) || 500
      if (goal < 10) { setLinkError('Цель — минимум 10 просмотров'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({
          goal,
          hours: parseInt(milestoneHours) || 24,
          started_at: new Date().toISOString(),
          baseline: profile.view_count ?? 0,
          reward_url: milestoneRewardUrl.trim() ? (milestoneRewardUrl.trim().startsWith('http') ? milestoneRewardUrl.trim() : `https://${milestoneRewardUrl.trim()}`) : '',
          reward_code: milestoneRewardCode.trim(),
          reward_label: linkForm.title,
        })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Вирусный вызов', url: urlJson, icon_type: 'milestone', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'milestone' })
        setMilestoneGoal('500')
        setMilestoneHours('24')
        setMilestoneRewardUrl('')
        setMilestoneRewardCode('')
        await loadData(user.id)
      } catch {
        setLinkError('Не удалось добавить вирусный вызов')
      } finally {
        setAddingLink(false)
      }
      return
    }

    if (isFollowGate) {
      if (!followGateHandle.trim()) { setLinkError('Введите Instagram @username'); return }
      if (!followGateContent.trim()) { setLinkError('Введите ссылку на контент'); return }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({
          ig: followGateHandle.replace(/^@/, '').trim(),
          content: followGateContent.trim().startsWith('http') ? followGateContent.trim() : `https://${followGateContent.trim()}`,
          label: linkForm.title,
        })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Получить материал', url: urlJson, icon_type: 'follow_gate', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error()
        setLinkForm({ title: '', url: '', icon_type: 'follow_gate' })
        setFollowGateHandle('')
        setFollowGateContent('')
        await loadData(user.id)
      } catch {
        setLinkError('Не удалось добавить гейт')
      } finally {
        setAddingLink(false)
      }
      return
    }

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
          try {
            const blob = await compressToWebP(productPhotoFile, 600, 50 * 1024)
            const form = new FormData()
            form.append('file', blob, 'photo.jpg')
            form.append('type', 'product')
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
              body: form,
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error ?? 'upload failed')
            photoPublicUrl = json.url
            storagePath = json.path
          } finally {
            setProductPhotoUploading(false)
          }
          if (!photoPublicUrl) { setLinkError('Не удалось загрузить фото'); return }
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

    if (isSmartQr) {
      if (!profile.is_premium) { setLinkError('Smart QR доступен только в Premium ⚡'); return }
      if (!smartQrIos.trim() && !smartQrAndroid.trim() && !smartQrWeb.trim()) {
        setLinkError('Введите хотя бы одну ссылку (iOS, Android или Web)')
        return
      }
      setLinkError('')
      setAddingLink(true)
      try {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1
        const urlJson = JSON.stringify({
          ...(smartQrIos.trim() ? { ios: smartQrIos.trim().startsWith('http') ? smartQrIos.trim() : `https://${smartQrIos.trim()}` } : {}),
          ...(smartQrAndroid.trim() ? { android: smartQrAndroid.trim().startsWith('http') ? smartQrAndroid.trim() : `https://${smartQrAndroid.trim()}` } : {}),
          ...(smartQrWeb.trim() ? { web: smartQrWeb.trim().startsWith('http') ? smartQrWeb.trim() : `https://${smartQrWeb.trim()}` } : {}),
        })
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ title: linkForm.title || 'Открыть приложение', url: urlJson, icon_type: 'smart_qr', sort_order: maxOrder + 1 }),
        })
        if (!res.ok) throw new Error(await res.text())
        setLinkForm({ title: '', url: '', icon_type: 'smart_qr' })
        setSmartQrIos('')
        setSmartQrAndroid('')
        setSmartQrWeb('')
        await loadData(user.id)
      } catch {
        setLinkError('Не удалось добавить Smart QR')
      } finally {
        setAddingLink(false)
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
    if (!user) return
    setDeletingId(id)
    try {
      const link = links.find((l) => l.id === id)
      const { error } = await getSupabase().from('links').delete().eq('id', id).eq('profile_id', user.id)
      if (error) throw error
      setLinks((prev) => prev.filter((l) => l.id !== id))
      // Clean up storage files for product and image types
      if ((link?.icon_type === 'product' || link?.icon_type === 'image') && link.url.startsWith('{')) {
        try {
          const pd = JSON.parse(link.url) as { sp?: string }
          if (pd.sp) await getSupabase().storage.from('avatars').remove([pd.sp])
        } catch {}
      }
    } catch {
      setLinkError('Не удалось удалить кнопку. Попробуйте ещё раз.')
    } finally {
      setDeletingId(null)
    }
  }

  function toLocalInput(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  function openEdit(link: LinkRow) {
    setEditingId(link.id)
    setEditTitle(link.title)
    setEditVisibleFrom(toLocalInput(link.visible_from ?? null))
    setEditVisibleUntil(toLocalInput(link.visible_until ?? null))
    const t = link.icon_type
    if (['follow_gate', 'milestone', 'instagram_keyword', 'countdown', 'pricelist', 'image', 'video', 'faq', 'product', 'text_block', 'lead_form', 'smart_qr'].includes(t)) {
      let d: Record<string, unknown> = {}
      try { d = JSON.parse(link.url) } catch {}
      if (t === 'follow_gate') {
        setEditFgHandle((d.ig as string) ?? '')
        setEditFgContent((d.content as string) ?? '')
      } else if (t === 'milestone') {
        setEditMsGoal(String(d.goal ?? 500))
        setEditMsHours(String(d.hours ?? 24))
        setEditMsRewardUrl((d.reward_url as string) ?? '')
        setEditMsRewardCode((d.reward_code as string) ?? '')
      } else if (t === 'instagram_keyword') {
        setEditKwIg((d.ig as string) ?? '')
        setEditKwWord((d.keyword as string) ?? '')
        setEditKwReward((d.reward as string) ?? '')
      } else if (t === 'countdown') {
        const raw = (d.target as string) ?? ''
        // Convert ISO to datetime-local format (slice removes seconds/Z)
        setEditCdTarget(raw ? raw.slice(0, 16) : '')
        setEditCdLabel((d.label as string) ?? '')
      } else if (t === 'pricelist') {
        setEditPlTitle((d.title as string) ?? '')
        const items = (d.items as { name: string; price: string; desc?: string }[]) ?? []
        setEditPlItems(items.map((i) => ({ name: i.name, price: i.price, desc: i.desc ?? '' })))
      } else if (t === 'image') {
        setEditImgSrc((d.src as string) ?? '')
        setEditImgSp((d.sp as string) ?? '')
        setEditImgAlt((d.alt as string) ?? '')
        setEditImgLink((d.link as string) ?? '')
        setEditImgDisplayMode((d.mode as 'image' | 'button') ?? 'image')
        setEditImgUploadMode('url')
      } else if (t === 'video') {
        setEditVidUrl((d.url as string) ?? '')
      } else if (t === 'faq') {
        setEditFaqTitle((d.title as string) ?? '')
        const items = (d.items as { q: string; a: string }[]) ?? []
        setEditFaqItems(items.map((i) => ({ q: i.q, a: i.a })))
      } else if (t === 'product') {
        setEditProdUrl((d.l as string) ?? '')
        setEditProdPrice((d.price as string) ?? '')
      } else if (t === 'smart_qr') {
        setEditSqIos((d.ios as string) ?? '')
        setEditSqAndroid((d.android as string) ?? '')
        setEditSqWeb((d.web as string) ?? '')
      } else if (t === 'text_block') {
        setEditUrl(link.url)
      }
    } else {
      // Simple link: strip protocol/prefix for smart-input types
      const si = SMART_INPUTS[t]
      if (si) {
        if (t === 'phone') {
          const digits = link.url.replace(/\D/g, '')
          setEditUrl(digits.length === 11 && digits.startsWith('7') ? digits.slice(1) : digits)
        } else if (t === 'youtube') {
          const clean = link.url
            .replace(/^https?:\/\/(www\.)?youtube\.com\/(channel\/)?@?/, '')
            .replace(/^@/, '')
          setEditUrl(clean)
        } else {
          const stripped = link.url
            .replace(/^https?:\/\//, '')
            .replace(si.prefix, '')
            .replace(/^@/, '')
          setEditUrl(stripped)
        }
      } else {
        setEditUrl(link.url)
      }
    }
  }

  async function saveEdit(link: LinkRow) {
    setLinkError('')
    setSavingEdit(true)
    try {
      const t = link.icon_type
      let newUrl = editUrl
      let newTitle = editTitle

      if (t === 'follow_gate') {
        if (!editFgHandle.trim() || !editFgContent.trim()) { setLinkError('Введите @username и ссылку на контент'); return }
        newUrl = JSON.stringify({ ig: editFgHandle.replace(/^@/, '').trim(), content: editFgContent.trim().startsWith('http') ? editFgContent.trim() : `https://${editFgContent.trim()}`, label: newTitle })
      } else if (t === 'milestone') {
        const prevD: Record<string, unknown> = {}
        try { Object.assign(prevD, JSON.parse(link.url)) } catch {}
        newUrl = JSON.stringify({ ...prevD, goal: parseInt(editMsGoal) || 500, hours: parseInt(editMsHours) || 24, reward_url: editMsRewardUrl.trim(), reward_code: editMsRewardCode.trim(), reward_label: newTitle })
      } else if (t === 'instagram_keyword') {
        newUrl = JSON.stringify({ ig: editKwIg.replace(/^@/, '').trim(), keyword: editKwWord.trim().toUpperCase(), reward: editKwReward.trim() })
      } else if (t === 'countdown') {
        if (!editCdTarget) { setLinkError('Выберите дату события'); return }
        newUrl = JSON.stringify({ target: editCdTarget, label: editCdLabel.trim() || 'До события' })
      } else if (t === 'pricelist') {
        const validItems = editPlItems.filter((i) => i.name.trim() && i.price.trim())
        if (validItems.length === 0) { setLinkError('Добавьте хотя бы одну позицию с ценой'); return }
        newUrl = JSON.stringify({ title: editPlTitle.trim() || 'Услуги', items: validItems })
      } else if (t === 'image') {
        if (!editImgSrc.trim()) { setLinkError('Введите URL или загрузите изображение'); return }
        const src = editImgSrc.trim().startsWith('http') ? editImgSrc.trim() : `https://${editImgSrc.trim()}`
        const lnk = editImgLink.trim() ? (editImgLink.trim().startsWith('http') ? editImgLink.trim() : `https://${editImgLink.trim()}`) : ''
        newUrl = JSON.stringify({ src, ...(editImgSp ? { sp: editImgSp } : {}), mode: editImgDisplayMode, ...(editImgAlt.trim() ? { alt: editImgAlt.trim() } : {}), ...(lnk ? { link: lnk } : {}) })
      } else if (t === 'video') {
        if (!editVidUrl.trim()) { setLinkError('Введите ссылку на видео'); return }
        newUrl = JSON.stringify({ url: editVidUrl.trim().startsWith('http') ? editVidUrl.trim() : `https://${editVidUrl.trim()}` })
      } else if (t === 'faq') {
        const validItems = editFaqItems.filter((i) => i.q.trim() && i.a.trim())
        if (validItems.length === 0) { setLinkError('Добавьте хотя бы один вопрос с ответом'); return }
        newUrl = JSON.stringify({ title: editFaqTitle.trim() || 'Часто задаваемые вопросы', items: validItems })
      } else if (t === 'product') {
        const prevD: Record<string, unknown> = {}
        try { Object.assign(prevD, JSON.parse(link.url)) } catch {}
        newUrl = JSON.stringify({ ...prevD, l: editProdUrl.trim().startsWith('http') ? editProdUrl.trim() : `https://${editProdUrl.trim()}`, price: editProdPrice.trim() })
      } else if (t === 'smart_qr') {
        if (!editSqIos.trim() && !editSqAndroid.trim() && !editSqWeb.trim()) { setLinkError('Введите хотя бы один URL'); return }
        newUrl = JSON.stringify({
          ...(editSqIos.trim() ? { ios: editSqIos.trim().startsWith('http') ? editSqIos.trim() : `https://${editSqIos.trim()}` } : {}),
          ...(editSqAndroid.trim() ? { android: editSqAndroid.trim().startsWith('http') ? editSqAndroid.trim() : `https://${editSqAndroid.trim()}` } : {}),
          ...(editSqWeb.trim() ? { web: editSqWeb.trim().startsWith('http') ? editSqWeb.trim() : `https://${editSqWeb.trim()}` } : {}),
        })
      } else if (t === 'text_block' || t === 'lead_form') {
        newUrl = link.url // unchanged for lead_form
        if (t === 'text_block') newUrl = editUrl
      } else {
        // Simple link: normalize URL
        newUrl = normalizeUrl(editUrl, t)
      }

      if (!newTitle && t !== 'text_block') newTitle = link.title

      // Block dangerous URL schemes before saving
      const JSON_TYPES = ['text_block','product','follow_gate','milestone','instagram_keyword','countdown','pricelist','image','video','faq','smart_qr']
      if (newUrl && !JSON_TYPES.includes(t) && /^(javascript|data|vbscript):/i.test(newUrl)) {
        setLinkError('Недопустимая схема URL')
        return
      }

      const fromISO = editVisibleFrom ? new Date(editVisibleFrom).toISOString() : null
      const untilISO = editVisibleUntil ? new Date(editVisibleUntil).toISOString() : null
      const saveRes = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title: newTitle, url: newUrl, visible_from: fromISO, visible_until: untilISO }),
      })
      if (!saveRes.ok) { setLinkError('Не удалось сохранить — попробуйте ещё раз'); return }
      setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, title: newTitle, url: newUrl, visible_from: fromISO, visible_until: untilISO } : l))
      setEditingId(null)
    } finally {
      setSavingEdit(false)
    }
  }

  async function toggleFeatured(link: LinkRow) {
    if (!user) return
    const sb = getSupabase()
    const snapshot = links
    if (link.is_featured) {
      setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, is_featured: false } : l))
      const { error } = await sb.from('links').update({ is_featured: false }).eq('id', link.id).eq('profile_id', user.id)
      if (error) setLinks(snapshot)
    } else {
      setLinks((prev) => prev.map((l) => ({ ...l, is_featured: l.id === link.id })))
      const { error: e1 } = await sb.from('links').update({ is_featured: false }).eq('profile_id', user.id)
      const { error: e2 } = await sb.from('links').update({ is_featured: true }).eq('id', link.id).eq('profile_id', user.id)
      if (e1 || e2) setLinks(snapshot)
    }
  }

  async function moveLink(id: string, direction: 'up' | 'down') {
    const idx = links.findIndex((l) => l.id === id)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= links.length) return
    const reordered = [...links]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, moved)
    const withOrder = reordered.map((l, i) => ({ ...l, sort_order: i }))
    setLinks(withOrder)
    try {
      const res = await fetch('/api/links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(withOrder.map((l) => ({ id: l.id, sort_order: l.sort_order }))),
      })
      if (!res.ok) setLinks(links)
    } catch { setLinks(links) }
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
      const res = await fetch('/api/links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(withOrder.map((l) => ({ id: l.id, sort_order: l.sort_order }))),
      })
      if (!res.ok) throw new Error('reorder_failed')
    } catch {
      setLinks(oldLinks) // revert on network error or HTTP 4xx/5xx
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
      if (res.ok && user) {
        await loadData(user.id)
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
      const wh = buildWorkingHours()
      const { error } = await getSupabase().from('profiles').update({ working_hours: wh }).eq('id', user.id)
      if (!error) {
        setProfile((p) => p ? { ...p, working_hours: wh as WorkingHours } : p)
        setProfileMsg({ type: 'ok', text: 'Расписание сохранено' })
      } else {
        setProfileMsg({ type: 'err', text: 'Ошибка сохранения расписания' })
      }
    } catch {
      setProfileMsg({ type: 'err', text: 'Ошибка сохранения расписания' })
    } finally {
      setSavingWh(false)
    }
  }

  const [showQr, setShowQr] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement>(null)
  const qrFallbackRef = useRef<HTMLDivElement>(null)
  const qrDownloadRef = useRef<HTMLDivElement>(null)      // 600px with user/brand logo (may taint if user avatar is cross-origin)
  const qrDownloadBrandRef = useRef<HTMLDivElement>(null) // 600px with brand logo only (always clean)
  const [helpType, setHelpType] = useState<'kaspi' | 'kaspi_pay' | 'kaspi_shop' | 'kaspi_qr' | 'smart_qr' | 'twogis' | null>(null)
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
      const blob = await compressToWebP(file, 200, 20 * 1024)
      const form = new FormData()
      form.append('file', blob, 'avatar.jpg')
      form.append('type', 'avatar')
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'upload failed')
      const cacheBusted = `${json.url}?t=${Date.now()}`
      await getSupabase().from('profiles').update({ avatar_url: cacheBusted }).eq('id', user.id)
      setProfile((p) => p ? { ...p, avatar_url: cacheBusted } : p)
    } catch (err) {
      console.error('[uploadAvatar]', err)
      const msg = err instanceof Error ? err.message : String(err)
      setAvatarError(`Ошибка: ${msg}`)
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

  async function uploadBannerImage(
    file: File,
    onSuccess: (url: string) => void,
    onError: (msg: string) => void,
    setLoading: (v: boolean) => void,
    onPath?: (sp: string) => void,
  ) {
    if (!user) return
    if (file.size > 10 * 1024 * 1024) { onError('Максимальный размер — 10 МБ'); return }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
    if (!allowed.includes(file.type)) { onError('Только JPG, PNG или WebP'); return }
    onError('')
    setLoading(true)
    try {
      const blob = await compressToWebP(file, 1200, 500 * 1024)
      const form = new FormData()
      form.append('file', blob, 'banner.jpg')
      form.append('type', 'banner')
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'upload failed')
      onSuccess(json.url)
      onPath?.(json.path)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onError(`Ошибка загрузки: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = ICON_OPTIONS.find((o) => o.value === linkForm.icon_type)
  const atLimit = !profile?.is_premium && links.length >= FREE_LINK_LIMIT
  const profileUrl = profile ? `https://tapni.kz/${profile.username}` : ''
  const isTextType = linkForm.icon_type === 'text_block'
  const showHelp = ['kaspi', 'kaspi_pay', 'kaspi_shop', 'kaspi_qr', 'smart_qr', 'twogis'].includes(linkForm.icon_type)

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <>
    <main className="min-h-screen bg-gray-50 pb-24 text-gray-900">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-5 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo.jpeg" alt="tapni.kz" className="h-8 w-8 rounded-full object-cover ring-[1.5px] ring-white/20" />
            <span className="text-sm font-bold text-gray-900 hidden sm:block">tapni.kz</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/help"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-violet-400 hover:text-gray-900"
              title="Помощь и инструкции"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Помощь</span>
            </Link>
            {profile && (
              <Link
                href={`/${profile.username}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-violet-400 hover:text-gray-900"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Моя страница
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pt-6">
        {profile && (
          <div className="mb-5">
            <p className="text-sm text-gray-500">
              Добро пожаловать,{' '}
              <span className="font-semibold text-gray-900">{profile.business_name}</span>
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-gray-600">
                tapni.kz/{profile.username}
                {profile.is_premium && (
                  <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                    ⚡ PREMIUM
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`https://tapni.kz/${profile.username}`).then(() => {
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  }).catch(() => {})
                }}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-600 active:scale-95"
              >
                {linkCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Share2 className="h-3 w-3" />}
                {linkCopied ? 'Скопировано!' : 'Скопировать'}
              </button>
            </div>
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
                <p className={`text-xs font-bold truncate ${urgent ? 'text-red-600' : 'text-yellow-700'}`}>{label}</p>
                <p className="text-[11px] text-gray-500">Нажмите чтобы продлить</p>
              </div>
              <span className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                urgent ? 'bg-red-500/20 text-red-600' : 'bg-yellow-500/20 text-yellow-700'
              }`}>Продлить →</span>
            </Link>
          )
        })()}

        {/* ─── Telegram connect nudge (only if not linked) ─── */}
        {profile && !profile.telegram_chat_id && (
          <a
            href="/go/tg?u=Tapnikzbot"
            className="mb-4 flex items-center gap-3 rounded-2xl border border-[#2AABEE]/20 bg-[#2AABEE]/[0.06] px-4 py-3 transition-colors hover:bg-[#2AABEE]/[0.10]"
          >
            <span className="text-lg flex-shrink-0">💬</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#2AABEE]">Привяжите Telegram бот</p>
              <p className="text-[11px] text-gray-500">Уведомления, сброс пароля, автооплата</p>
            </div>
            <span className="flex-shrink-0 text-[11px] font-semibold text-[#2AABEE]">@Tapnikzbot →</span>
          </a>
        )}

        {/* ─── Tabs ─── */}
        <div className="mb-6 grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
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
                  : 'text-gray-500 hover:text-gray-700'
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
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <ImagePlus className="h-3.5 w-3.5 text-violet-400" />
                Логотип / Фото
              </label>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/10">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
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
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-violet-500/40 hover:text-gray-900">
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
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Ваш номер телефона
                </label>
                <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-3">
                  <span className="text-sm text-gray-400">+</span>
                  <span className="ml-1 text-sm font-medium text-gray-900">{profile.phone}</span>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Название бизнеса / Имя <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={profileForm.business_name}
                onChange={(e) => setProfileForm((p) => ({ ...p, business_name: e.target.value }))}
                placeholder="Цветы Алматы"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Описание (Bio)</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Доставка цветов по Алматы 24/7 🌸"
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Адрес / Дополнительно</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="г. Алматы, ул. Абая 10"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
              />
              <p className="mt-1 text-xs text-gray-600">Показывается на вашей публичной странице</p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">
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
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 h-7 w-full rounded-lg ${t.preview}`} />
                    <span className="text-[10px] font-medium text-gray-600 leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Working hours */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-violet-400" />
                Режим работы
              </p>

              {/* 24/7 toggle */}
              <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={whIs247}
                  onChange={(e) => setWhIs247(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-sm font-semibold text-emerald-700">Круглосуточно (24/7)</span>
              </label>

              {/* Mode toggle */}
              {!whIs247 && (
              <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={switchToSimple}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    whMode === 'simple' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Обычный
                </button>
                <button
                  type="button"
                  onClick={switchToSchedule}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    whMode === 'schedule' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Расписание
                </button>
              </div>
              )}

              {/* Simple mode */}
              {!whIs247 && whMode === 'simple' && (
                <>
                  <div className="space-y-2">
                    {WH_DAYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-6 flex-shrink-0 text-xs font-semibold text-gray-400">{label}</span>
                        <input
                          type="text"
                          value={whForm[key]}
                          onChange={(e) => setWhForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder="09:00-20:00"
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-600">
                    Формат: 09:00-20:00. Оставьте пустым — выходной. Показывает бейдж «Открыто сейчас».
                  </p>
                </>
              )}

              {/* Schedule mode — multiple slots per day with names */}
              {!whIs247 && whMode === 'schedule' && (
                <div className="space-y-2">
                  {WH_DAYS.map(({ key, label }) => {
                    const day = extSchedule[key]
                    return (
                      <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        {/* Day header */}
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600">{label}</span>
                          <button
                            type="button"
                            onClick={() => toggleDay(key)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              day.enabled
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {day.enabled ? 'Работает' : 'Выходной'}
                          </button>
                        </div>

                        {/* Slots */}
                        {day.enabled && (
                          <div className="space-y-1.5">
                            {day.slots.map((slot, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={slot.name}
                                  onChange={(e) => updateSlot(key, idx, 'name', e.target.value)}
                                  placeholder="Название"
                                  className="w-24 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60"
                                />
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) => updateSlot(key, idx, 'start', e.target.value)}
                                  className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-violet-500/60"
                                />
                                <span className="flex-shrink-0 text-[11px] text-gray-600">—</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) => updateSlot(key, idx, 'end', e.target.value)}
                                  className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-violet-500/60"
                                />
                                {day.slots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeSlot(key, idx)}
                                    className="flex-shrink-0 text-gray-600 transition-colors hover:text-red-400"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addSlot(key)}
                              className="flex items-center gap-1 text-[11px] text-violet-400 transition-colors hover:text-violet-600"
                            >
                              <Plus className="h-3 w-3" />
                              Добавить интервал
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <p className="text-[11px] text-gray-600">
                    Название необязательно. Показывает бейдж «Открыто сейчас» и активный интервал.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={saveWorkingHours}
                disabled={savingWh}
                className="mt-3 flex items-center gap-2 rounded-xl bg-violet-600/20 px-4 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-600/30 disabled:opacity-40"
              >
                {savingWh ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Сохранить расписание
              </button>
            </div>

            {profileMsg && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm ${
                profileMsg.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                  : 'border-red-500/30 bg-red-500/10 text-red-600'
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
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
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
                        className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:border-violet-500/40 hover:text-gray-900"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Скачать PNG 600×600 для печати
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTab('payment')}
                        className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <AtSign className="h-4 w-4" />
                  Изменить адрес страницы
                </p>
                <p className="mb-3 text-xs text-gray-400">
                  Текущий: <span className="font-mono text-gray-700">tapni.kz/{profile.username}</span>
                </p>
                <div className="mb-2 flex gap-2">
                  <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <span className="flex-shrink-0 pl-3 text-xs text-gray-500">tapni.kz/</span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => {
                        setNewUsername(e.target.value)
                        setUsernameMsg(null)
                      }}
                      placeholder={profile.username}
                      className="flex-1 bg-transparent px-1 py-3 text-base text-gray-900 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={changeUsername}
                    disabled={savingUsername || !newUsername.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-3 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-40"
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
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs">
                <span className="text-gray-400">
                  Кнопки:{' '}
                  <span className={links.length >= FREE_LINK_LIMIT ? 'text-red-500' : 'text-gray-900'}>
                    {links.length}/{FREE_LINK_LIMIT}
                  </span>
                </span>
                {atLimit && (
                  <button
                    onClick={() => setTab('payment')}
                    className="rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-200"
                  >
                    ⚡ Upgrade → безлимит
                  </button>
                )}
              </div>
            )}

            {atLimit ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="mb-2 text-sm font-semibold text-amber-700 text-center">⚠️ Лимит {FREE_LINK_LIMIT} кнопок на бесплатном плане</p>
                <ul className="mb-4 space-y-1 text-xs text-gray-600">
                  <li>✅ Безлимитное число кнопок</li>
                  <li>✅ Kaspi Pay, видео, FAQ, прайс, форма заявок</li>
                  <li>✅ Аналитика просмотров и кликов</li>
                  <li>✅ Свой логотип, QR-код, смена адреса</li>
                </ul>
                <button
                  onClick={() => setTab('payment')}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white"
                >
                  ⚡ Перейти на Premium — от 1 000 ₸/мес
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-gray-900">Добавить кнопку</p>
                <form onSubmit={addLink} className="space-y-3" noValidate>
                  {/* Type selector + help button */}
                  <div className="flex gap-2">
                    <select
                      value={linkForm.icon_type}
                      onChange={(e) => {
                        const newType = e.target.value as IconType
                        // Auto-fill phone number from profile for phone/whatsapp types
                        let autoUrl = ''
                        if (profile?.phone) {
                          const digits = profile.phone.replace(/\D/g, '')
                          if (newType === 'whatsapp') autoUrl = digits.startsWith('7') && digits.length === 11 ? digits : digits
                          else if (newType === 'phone') autoUrl = digits.startsWith('7') && digits.length === 11 ? digits.slice(1) : digits
                        }
                        setLinkForm((p) => ({ ...p, icon_type: newType, url: autoUrl }))
                        setProductPhotoFile(null)
                        setProductPhotoPreview('')
                        setProductPrice('')
                        setProductLinkUrl('')
                        setFollowGateHandle('')
                        setFollowGateContent('')
                        setMilestoneGoal('500')
                        setMilestoneHours('24')
                        setMilestoneRewardUrl('')
                        setMilestoneRewardCode('')
                        setKeywordIg('')
                        setKeywordWord('')
                        setKeywordReward('')
                      }}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-violet-500/60"
                    >
                      {ICON_OPTIONS
                        .filter((o) => (o.value !== 'product' && o.value !== 'smart_qr') || profile?.is_premium)
                        .map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {showHelp && (
                      <button
                        type="button"
                        onClick={() => setHelpType(linkForm.icon_type as typeof helpType)}
                        className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:border-violet-500/40 hover:text-violet-400"
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
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
                          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/[0.04] text-gray-500 transition-colors hover:border-violet-500/60 hover:text-gray-600">
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
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      {/* Product URL */}
                      <input
                        type="text"
                        value={productLinkUrl}
                        onChange={(e) => setProductLinkUrl(e.target.value)}
                        placeholder="Ссылка на товар (Kaspi, сайт...)"
                        inputMode="url"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                    </div>
                  )}

                  {/* Follow gate — special form */}
                  {linkForm.icon_type === 'follow_gate' && (
                    <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
                        🔒 Гейт подписки
                      </p>
                      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500/60 transition-colors">
                        <span className="flex flex-shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 py-3 text-xs font-mono text-gray-500 select-none whitespace-nowrap">
                          instagram.com/
                        </span>
                        <input
                          type="text"
                          value={followGateHandle}
                          onChange={(e) => setFollowGateHandle(e.target.value.replace(/^@/, ''))}
                          placeholder="your_username"
                          className="flex-1 bg-transparent px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={followGateContent}
                        onChange={(e) => setFollowGateContent(e.target.value)}
                        placeholder="Ссылка на материал (PDF, Google Drive, Telegram...)"
                        inputMode="url"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                    </div>
                  )}

                  {/* Smart QR — special form */}
                  {linkForm.icon_type === 'smart_qr' && (
                    <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
                        📲 Smart QR — маршруты по платформам
                      </p>
                      <div>
                        <label className="mb-1 block text-[11px] text-gray-400">iOS (App Store / Universal Link)</label>
                        <input
                          type="text"
                          value={smartQrIos}
                          onChange={(e) => setSmartQrIos(e.target.value)}
                          placeholder="https://apps.apple.com/app/..."
                          inputMode="url"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-gray-400">Android (Play Store / App Link)</label>
                        <input
                          type="text"
                          value={smartQrAndroid}
                          onChange={(e) => setSmartQrAndroid(e.target.value)}
                          placeholder="https://play.google.com/store/apps/details?id=..."
                          inputMode="url"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-gray-400">Web (фолбек для Desktop и браузера)</label>
                        <input
                          type="text"
                          value={smartQrWeb}
                          onChange={(e) => setSmartQrWeb(e.target.value)}
                          placeholder="https://example.com"
                          inputMode="url"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Заполните хотя бы одно поле. QR-код ведёт на <span className="font-mono">tapni.kz/qr/l/…</span> — маршрутизация по OS в реальном времени.
                      </p>
                    </div>
                  )}

                  {/* Milestone — special form */}
                  {linkForm.icon_type === 'milestone' && (
                    <div className="space-y-3 rounded-2xl border border-pink-500/20 bg-pink-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-400">
                        🚀 Вирусный вызов
                      </p>
                      {/* Goal + Hours row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[11px] text-gray-400">Цель (просмотров)</label>
                          <input
                            type="number"
                            value={milestoneGoal}
                            onChange={(e) => setMilestoneGoal(e.target.value)}
                            placeholder="500"
                            min="10"
                            inputMode="numeric"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-gray-400">Период</label>
                          <select
                            value={milestoneHours}
                            onChange={(e) => setMilestoneHours(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-violet-500/60"
                          >
                            <option value="6">6 часов</option>
                            <option value="12">12 часов</option>
                            <option value="24">24 часа</option>
                            <option value="48">48 часов</option>
                            <option value="72">72 часа</option>
                          </select>
                        </div>
                      </div>
                      {/* What unlocks */}
                      <input
                        type="text"
                        value={milestoneRewardUrl}
                        onChange={(e) => setMilestoneRewardUrl(e.target.value)}
                        placeholder="Ссылка на скидку/товар (необязательно)"
                        inputMode="url"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      <input
                        type="text"
                        value={milestoneRewardCode}
                        onChange={(e) => setMilestoneRewardCode(e.target.value)}
                        placeholder="Промокод (необязательно): TAPNI50"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      <p className="text-[10px] text-gray-600 leading-relaxed">
                        Таймер и счётчик запускаются в момент сохранения.
                        Просмотры считаются с нуля — поделитесь ссылкой сразу!
                      </p>
                    </div>
                  )}

                  {/* DM Keyword Trigger — special form */}
                  {linkForm.icon_type === 'instagram_keyword' && (
                    <div className="space-y-3 rounded-2xl border border-pink-500/20 bg-pink-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-400">
                        🗝️ DM-триггер
                      </p>
                      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500/60 transition-colors">
                        <span className="flex flex-shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-mono text-gray-500 select-none">
                          instagram.com/
                        </span>
                        <input
                          type="text"
                          value={keywordIg}
                          onChange={(e) => setKeywordIg(e.target.value.replace(/^@/, ''))}
                          placeholder="your_username"
                          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={keywordWord}
                        onChange={(e) => setKeywordWord(e.target.value)}
                        placeholder="Ключевое слово: СКИДКА (покажется крупно)"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      <input
                        type="text"
                        value={keywordReward}
                        onChange={(e) => setKeywordReward(e.target.value)}
                        placeholder="Что получат: Скидка 20%, PDF-гайд, промокод... (необязательно)"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      <p className="text-[10px] text-gray-600 leading-relaxed">
                        Скопируйте это слово в шапку Instagram: «Напиши <b className="text-gray-400">{keywordWord || 'СЛОВО'}</b> в Direct →».
                        Каждый DM повышает ваши охваты в алгоритме.
                      </p>
                    </div>
                  )}

                  {/* Countdown — special form */}
                  {linkForm.icon_type === 'countdown' && (
                    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                        ⏳ Таймер обратного отсчёта
                      </p>
                      <div>
                        <label className="mb-1 block text-[11px] text-gray-400">Дата и время окончания</label>
                        <input
                          type="datetime-local"
                          value={countdownTarget}
                          onChange={(e) => setCountdownTarget(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-violet-500/60 [color-scheme:light]"
                        />
                      </div>
                      <input
                        type="text"
                        value={countdownLabel}
                        onChange={(e) => setCountdownLabel(e.target.value)}
                        placeholder='Текст таймера: "До акции осталось"'
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                    </div>
                  )}

                  {/* Pricelist — special form */}
                  {linkForm.icon_type === 'pricelist' && (
                    <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                        💰 Прайс-лист / Услуги
                      </p>
                      <input
                        type="text"
                        value={pricelistTitle}
                        onChange={(e) => setPricelistTitle(e.target.value)}
                        placeholder='Заголовок: "Наши услуги" (необязательно)'
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      {pricelistItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => setPricelistItems((prev) => prev.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))}
                            placeholder="Название услуги"
                            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                          />
                          <input
                            type="text"
                            value={item.price}
                            onChange={(e) => setPricelistItems((prev) => prev.map((p, idx) => idx === i ? { ...p, price: e.target.value } : p))}
                            placeholder="Цена: 5 000 ₸"
                            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                          />
                          <input
                            type="text"
                            value={item.desc}
                            onChange={(e) => setPricelistItems((prev) => prev.map((p, idx) => idx === i ? { ...p, desc: e.target.value } : p))}
                            placeholder="Описание (необязательно)"
                            className="col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                          />
                        </div>
                      ))}
                      {pricelistItems.length < 10 ? (
                        <button
                          type="button"
                          onClick={() => setPricelistItems((p) => [...p, { name: '', price: '', desc: '' }])}
                          className="text-xs text-emerald-400 hover:text-emerald-700"
                        >
                          + Добавить позицию
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400">Максимум 10 позиций</p>
                      )}
                    </div>
                  )}

                  {/* Image — special form */}
                  {linkForm.icon_type === 'image' && (
                    <div className="space-y-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                        🖼 Баннер-изображение
                      </p>
                      {/* Display mode */}
                      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                        <button type="button" onClick={() => setImageDisplayMode('image')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${imageDisplayMode === 'image' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                          🖼 Картинка
                        </button>
                        <button type="button" onClick={() => setImageDisplayMode('button')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${imageDisplayMode === 'button' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                          🔽 Кнопка
                        </button>
                      </div>
                      {/* Source toggle */}
                      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                        <button type="button" onClick={() => setImageUploadMode('url')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${imageUploadMode === 'url' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                          🔗 URL
                        </button>
                        <button type="button" onClick={() => setImageUploadMode('file')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${imageUploadMode === 'file' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                          📁 Загрузить
                        </button>
                      </div>
                      {imageUploadMode === 'url' ? (
                        <input
                          type="text"
                          value={imageSrc}
                          onChange={(e) => setImageSrc(e.target.value)}
                          placeholder="URL изображения: https://..."
                          inputMode="url"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                        />
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/[0.05] px-3 py-4 text-center hover:border-sky-500/60 transition-colors">
                          {imageUploading ? (
                            <span className="text-xs text-sky-400">Загрузка и сжатие…</span>
                          ) : imageSrc ? (
                            <>
                              <img src={imageSrc} alt="" className="max-h-32 w-full rounded-lg object-contain" />
                              <span className="text-[10px] text-gray-500">Нажмите чтобы заменить</span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl">🖼</span>
                              <span className="text-xs text-gray-400">Нажмите для выбора файла</span>
                              <span className="text-[10px] text-gray-600">JPG, PNG, WebP · до 10 МБ · сожмётся до WebP</span>
                            </>
                          )}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) uploadBannerImage(f, setImageSrc, setImageUploadError, setImageUploading, setImageSp)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                      {imageUploadError && <p className="text-xs text-red-400">{imageUploadError}</p>}
                      {imageSrc && imageUploadMode === 'url' && <img src={imageSrc} alt="preview" className="max-h-24 w-full rounded-lg object-contain opacity-60" />}
                      <input
                        type="text"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        placeholder="Описание изображения (необязательно)"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      <input
                        type="text"
                        value={imageLink}
                        onChange={(e) => setImageLink(e.target.value)}
                        placeholder="Ссылка при нажатии (необязательно)"
                        inputMode="url"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                    </div>
                  )}

                  {/* Video — special form */}
                  {linkForm.icon_type === 'video' && (
                    <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                        📹 Видео
                      </p>
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... или https://youtu.be/..."
                        inputMode="url"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      <p className="text-[10px] text-gray-600">YouTube, YouTube Shorts и TikTok поддерживаются</p>
                    </div>
                  )}

                  {/* FAQ — special form */}
                  {linkForm.icon_type === 'faq' && (
                    <div className="space-y-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                        ❓ FAQ / Вопросы и ответы
                      </p>
                      <input
                        type="text"
                        value={faqTitle}
                        onChange={(e) => setFaqTitle(e.target.value)}
                        placeholder='Заголовок: "Часто задаваемые вопросы" (необязательно)'
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                      />
                      {faqItems.map((item, i) => (
                        <div key={i} className="space-y-2">
                          <input
                            type="text"
                            value={item.q}
                            onChange={(e) => setFaqItems((prev) => prev.map((p, idx) => idx === i ? { ...p, q: e.target.value } : p))}
                            placeholder={`Вопрос ${i + 1}`}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                          />
                          <textarea
                            value={item.a}
                            onChange={(e) => setFaqItems((prev) => prev.map((p, idx) => idx === i ? { ...p, a: e.target.value } : p))}
                            placeholder={`Ответ ${i + 1}`}
                            rows={2}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                          />
                        </div>
                      ))}
                      {faqItems.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setFaqItems((p) => [...p, { q: '', a: '' }])}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          + Добавить вопрос
                        </button>
                      )}
                    </div>
                  )}

                  {/* URL/text field — hidden for types with their own forms */}
                  {linkForm.icon_type !== 'product' && linkForm.icon_type !== 'smart_qr' && linkForm.icon_type !== 'follow_gate' && linkForm.icon_type !== 'milestone' && linkForm.icon_type !== 'instagram_keyword' && linkForm.icon_type !== 'countdown' && linkForm.icon_type !== 'pricelist' && linkForm.icon_type !== 'image' && linkForm.icon_type !== 'video' && linkForm.icon_type !== 'faq' && (isTextType ? (
                    <textarea
                      value={linkForm.url}
                      onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
                      placeholder={selectedOption?.placeholder ?? 'Ваш текст...'}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
                    />
                  ) : SMART_INPUTS[linkForm.icon_type] ? (
                    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500/60 transition-colors">
                      <span className="flex flex-shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 py-3 text-xs font-mono text-gray-500 select-none whitespace-nowrap">
                        {linkForm.icon_type === 'phone'
                          ? (linkForm.url.replace(/\D/g, '').length > 0 && linkForm.url.replace(/\D/g, '').length <= 7 ? '☎' : '+7')
                          : SMART_INPUTS[linkForm.icon_type]!.prefix}
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
                        className="flex-1 bg-transparent px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={linkForm.url}
                      onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
                      placeholder={selectedOption?.placeholder ?? 'https://...'}
                      inputMode={linkForm.icon_type === 'email' ? 'email' : 'url'}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-violet-500/60"
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
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
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
                        <p className="text-xs font-bold text-gray-900">{tpl.name}</p>
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
                    <button onClick={() => setTemplateApplied(false)} className="flex-shrink-0 text-amber-400/60 hover:text-amber-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {links.map((link, idx) => {
                    const { dot, ring } = getLinkCardColor(link.icon_type)
                    const isEditing = editingId === link.id
                    const t = link.icon_type
                    const JSON_TYPES = ['follow_gate', 'milestone', 'instagram_keyword', 'countdown', 'pricelist', 'image', 'video', 'faq', 'product', 'text_block', 'lead_form', 'smart_qr']
                    const isJsonType = JSON_TYPES.includes(t)
                    const si = SMART_INPUTS[t]
                    return (
                      <div key={link.id} className="rounded-xl">
                        {/* Link row */}
                        <div
                          draggable={!isEditing}
                          onDragStart={() => !isEditing && setDragId(link.id)}
                          onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                          onDragOver={(e) => { e.preventDefault(); setDragOverId(link.id) }}
                          onDrop={() => handleDrop(link.id)}
                          className={`flex items-center gap-3 border border-gray-200 bg-white shadow-sm border-l-4 ${ring} px-3 py-3 transition-opacity ${isEditing ? 'rounded-t-xl' : 'rounded-xl'} ${dragId === link.id ? 'opacity-40' : dragOverId === link.id && dragId !== link.id ? 'ring-2 ring-violet-500/50' : ''}`}
                        >
                          <div className="flex flex-shrink-0 flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveLink(link.id, 'up')}
                              disabled={idx === 0}
                              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-20 active:scale-95 touch-manipulation"
                              title="Переместить вверх"
                            >
                              <svg viewBox="0 0 8 5" className="h-2 w-2 fill-current"><path d="M4 0 8 5H0z"/></svg>
                            </button>
                            <GripVertical className="h-4 w-4 cursor-grab text-gray-400 active:cursor-grabbing hidden sm:block" />
                            <button
                              type="button"
                              onClick={() => moveLink(link.id, 'down')}
                              disabled={idx === links.length - 1}
                              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-20 active:scale-95 touch-manipulation"
                              title="Переместить вниз"
                            >
                              <svg viewBox="0 0 8 5" className="h-2 w-2 fill-current"><path d="M4 5 0 0h8z"/></svg>
                            </button>
                          </div>
                          <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {link.title || <span className="italic text-gray-500">без заголовка</span>}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {t === 'text_block' ? (link.url.length > 50 ? link.url.slice(0, 50) + '…' : link.url)
                                : t === 'product' ? (() => { try { const d = JSON.parse(link.url) as { l?: string; price?: string }; return (d.price ? d.price + ' · ' : '') + (d.l ?? '').replace(/^https?:\/\//, '').slice(0, 40) } catch { return 'Карточка товара' } })()
                                : t === 'smart_qr' ? (() => { try { const d = JSON.parse(link.url) as { ios?: string; android?: string; web?: string }; return [d.ios && 'iOS', d.android && 'Android', d.web && 'Web'].filter(Boolean).join(' · ') || 'Smart QR' } catch { return 'Smart QR' } })()
                                : isJsonType ? t
                                : link.url.replace(/^https?:\/\//, '').slice(0, 50)}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {(link.visible_from || link.visible_until) && !isEditing && (() => {
                              const now = Date.now()
                              const hidden =
                                (link.visible_from && new Date(link.visible_from).getTime() > now) ||
                                (link.visible_until && new Date(link.visible_until).getTime() < now)
                              return hidden ? <span title="Скрыто по расписанию"><Clock className="h-3.5 w-3.5 text-amber-400/70" /></span> : null
                            })()}
                            {t !== 'text_block' && t !== 'lead_form' && !isEditing && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500" title="Кликов">
                                <BarChart2 className="h-3 w-3" />
                                {link.click_count ?? 0}
                              </span>
                            )}
                            {!isEditing && (
                              <button
                                onClick={() => toggleFeatured(link)}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${link.is_featured ? 'text-yellow-400 hover:text-yellow-600' : 'text-gray-600 hover:text-yellow-500/70'}`}
                                title={link.is_featured ? 'Снять выделение' : 'Выделить кнопку'}
                              >
                                <Star className={`h-3.5 w-3.5 ${link.is_featured ? 'fill-current' : ''}`} />
                              </button>
                            )}
                            <button
                              onClick={() => isEditing ? setEditingId(null) : openEdit(link)}
                              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${isEditing ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-500 hover:bg-violet-500/15 hover:text-violet-400'}`}
                              title={isEditing ? 'Закрыть' : 'Редактировать'}
                            >
                              {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => deleteLink(link.id)}
                              disabled={deletingId === link.id || isEditing}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-30"
                            >
                              {deletingId === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Inline edit panel */}
                        {isEditing && (
                          <div className={`rounded-b-xl border border-t-0 border-gray-200 bg-white border-l-4 ${ring} p-3 space-y-2`}>
                            {/* Title */}
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Название кнопки"
                              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60"
                            />

                            {/* smart_qr */}
                            {t === 'smart_qr' && (<>
                              <input type="text" value={editSqIos} onChange={(e) => setEditSqIos(e.target.value)} placeholder="iOS URL (apps.apple.com/...)" inputMode="url" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              <input type="text" value={editSqAndroid} onChange={(e) => setEditSqAndroid(e.target.value)} placeholder="Android URL (play.google.com/...)" inputMode="url" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              <input type="text" value={editSqWeb} onChange={(e) => setEditSqWeb(e.target.value)} placeholder="Web URL (https://...)" inputMode="url" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* follow_gate */}
                            {t === 'follow_gate' && (<>
                              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500/60">
                                <span className="flex flex-shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-mono text-gray-500">instagram.com/</span>
                                <input type="text" value={editFgHandle} onChange={(e) => setEditFgHandle(e.target.value.replace(/^@/, ''))} placeholder="username" className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none" />
                              </div>
                              <input type="text" value={editFgContent} onChange={(e) => setEditFgContent(e.target.value)} placeholder="Ссылка на материал" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* milestone */}
                            {t === 'milestone' && (<>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={editMsGoal} onChange={(e) => setEditMsGoal(e.target.value)} placeholder="Цель (просмотров)" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500/60" />
                                <select value={editMsHours} onChange={(e) => setEditMsHours(e.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none">
                                  {['6','12','24','48','72'].map(h => <option key={h} value={h}>{h} ч</option>)}
                                </select>
                              </div>
                              <input type="text" value={editMsRewardUrl} onChange={(e) => setEditMsRewardUrl(e.target.value)} placeholder="Ссылка на награду (необязательно)" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              <input type="text" value={editMsRewardCode} onChange={(e) => setEditMsRewardCode(e.target.value)} placeholder="Промокод (необязательно)" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* instagram_keyword */}
                            {t === 'instagram_keyword' && (<>
                              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500/60">
                                <span className="flex flex-shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-mono text-gray-500">instagram.com/</span>
                                <input type="text" value={editKwIg} onChange={(e) => setEditKwIg(e.target.value.replace(/^@/, ''))} placeholder="username" className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none" />
                              </div>
                              <input type="text" value={editKwWord} onChange={(e) => setEditKwWord(e.target.value)} placeholder="Ключевое слово" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              <input type="text" value={editKwReward} onChange={(e) => setEditKwReward(e.target.value)} placeholder="Что получат (необязательно)" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* countdown */}
                            {t === 'countdown' && (<>
                              <input type="datetime-local" value={editCdTarget} onChange={(e) => setEditCdTarget(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500/60 [color-scheme:light]" />
                              <input type="text" value={editCdLabel} onChange={(e) => setEditCdLabel(e.target.value)} placeholder='Текст над таймером' className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* pricelist */}
                            {t === 'pricelist' && (<>
                              <input type="text" value={editPlTitle} onChange={(e) => setEditPlTitle(e.target.value)} placeholder="Заголовок списка" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              {editPlItems.map((item, i) => (
                                <div key={i} className="grid grid-cols-2 gap-2">
                                  <input type="text" value={item.name} onChange={(e) => setEditPlItems((p) => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} placeholder="Название" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                                  <input type="text" value={item.price} onChange={(e) => setEditPlItems((p) => p.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))} placeholder="Цена" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                                  <input type="text" value={item.desc} onChange={(e) => setEditPlItems((p) => p.map((x, idx) => idx === i ? { ...x, desc: e.target.value } : x))} placeholder="Описание (необязательно)" className="col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                                </div>
                              ))}
                              {editPlItems.length < 10 && <button type="button" onClick={() => setEditPlItems((p) => [...p, { name: '', price: '', desc: '' }])} className="text-xs text-emerald-400 hover:text-emerald-700">+ Добавить позицию</button>}
                            </>)}

                            {/* image */}
                            {t === 'image' && (<>
                              <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                                <button type="button" onClick={() => setEditImgDisplayMode('image')}
                                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${editImgDisplayMode === 'image' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                                  🖼 Картинка
                                </button>
                                <button type="button" onClick={() => setEditImgDisplayMode('button')}
                                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${editImgDisplayMode === 'button' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                                  🔽 Кнопка
                                </button>
                              </div>
                              <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                                <button type="button" onClick={() => setEditImgUploadMode('url')}
                                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${editImgUploadMode === 'url' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                                  🔗 URL
                                </button>
                                <button type="button" onClick={() => setEditImgUploadMode('file')}
                                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${editImgUploadMode === 'file' ? 'bg-sky-500/30 text-sky-300' : 'text-gray-500 hover:text-gray-600'}`}>
                                  📁 Загрузить
                                </button>
                              </div>
                              {editImgUploadMode === 'url' ? (
                                <input type="text" value={editImgSrc} onChange={(e) => setEditImgSrc(e.target.value)} placeholder="URL изображения" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              ) : (
                                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/[0.05] px-3 py-4 text-center hover:border-sky-500/60 transition-colors">
                                  {editImgUploading ? (
                                    <span className="text-xs text-sky-400">Загрузка и сжатие…</span>
                                  ) : editImgSrc ? (
                                    <>
                                      <img src={editImgSrc} alt="" className="max-h-32 w-full rounded-lg object-contain" />
                                      <span className="text-[10px] text-gray-500">Нажмите чтобы заменить</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-2xl">🖼</span>
                                      <span className="text-xs text-gray-400">Нажмите для выбора файла</span>
                                      <span className="text-[10px] text-gray-600">JPG, PNG, WebP · до 10 МБ · сожмётся до WebP</span>
                                    </>
                                  )}
                                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      if (f) uploadBannerImage(f, setEditImgSrc, setEditImgUploadError, setEditImgUploading, (newSp) => {
                                          if (editImgSp) getSupabase().storage.from('avatars').remove([editImgSp]).catch(() => {})
                                          setEditImgSp(newSp)
                                        })
                                      e.target.value = ''
                                    }}
                                  />
                                </label>
                              )}
                              {editImgUploadError && <p className="text-xs text-red-400">{editImgUploadError}</p>}
                              <input type="text" value={editImgAlt} onChange={(e) => setEditImgAlt(e.target.value)} placeholder="Описание (необязательно)" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              <input type="text" value={editImgLink} onChange={(e) => setEditImgLink(e.target.value)} placeholder="Ссылка при нажатии (необязательно)" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* video */}
                            {t === 'video' && (
                              <input type="text" value={editVidUrl} onChange={(e) => setEditVidUrl(e.target.value)} placeholder="YouTube / TikTok URL" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            )}

                            {/* faq */}
                            {t === 'faq' && (<>
                              <input type="text" value={editFaqTitle} onChange={(e) => setEditFaqTitle(e.target.value)} placeholder="Заголовок FAQ" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              {editFaqItems.map((item, i) => (
                                <div key={i} className="space-y-1.5">
                                  <input type="text" value={item.q} onChange={(e) => setEditFaqItems((p) => p.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x))} placeholder={`Вопрос ${i + 1}`} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                                  <textarea value={item.a} onChange={(e) => setEditFaqItems((p) => p.map((x, idx) => idx === i ? { ...x, a: e.target.value } : x))} placeholder={`Ответ ${i + 1}`} rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                                </div>
                              ))}
                              {editFaqItems.length < 10 && <button type="button" onClick={() => setEditFaqItems((p) => [...p, { q: '', a: '' }])} className="text-xs text-indigo-400 hover:text-indigo-300">+ Добавить вопрос</button>}
                            </>)}

                            {/* product */}
                            {t === 'product' && (<>
                              <input type="text" value={editProdUrl} onChange={(e) => setEditProdUrl(e.target.value)} placeholder="Ссылка на товар" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              <input type="text" value={editProdPrice} onChange={(e) => setEditProdPrice(e.target.value)} placeholder="Цена (необязательно): 2 990 ₸" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            </>)}

                            {/* text_block */}
                            {t === 'text_block' && (
                              <textarea value={editUrl} onChange={(e) => setEditUrl(e.target.value)} rows={3} placeholder="Текст блока..." className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                            )}

                            {/* Simple link types — URL field */}
                            {!isJsonType && (
                              si ? (
                                <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-violet-500/60">
                                  <span className="flex flex-shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                                    {t === 'phone'
                                      ? (editUrl.replace(/\D/g, '').length > 0 && editUrl.replace(/\D/g, '').length <= 7 ? '☎' : '+7')
                                      : si.prefix}
                                  </span>
                                  <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder={si.placeholder} className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none" />
                                </div>
                              ) : (
                                <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL или номер" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60" />
                              )
                            )}

                            {/* Scheduling */}
                            <div className="border-t border-gray-200 pt-2">
                              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-gray-600">Расписание показа (необязательно)</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="mb-1 block text-[10px] text-gray-600">Показывать с</label>
                                  <input type="datetime-local" value={editVisibleFrom} onChange={(e) => setEditVisibleFrom(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-violet-500/60" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] text-gray-600">Скрыть после</label>
                                  <input type="datetime-local" value={editVisibleUntil} onChange={(e) => setEditVisibleUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-violet-500/60" />
                                </div>
                              </div>
                            </div>

                            {/* Save button */}
                            <button
                              type="button"
                              onClick={() => saveEdit(link)}
                              disabled={savingEdit}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600/80 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
                            >
                              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              Сохранить
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Analytics summary */}
                {links.some((l) => !['text_block', 'lead_form', 'countdown', 'image', 'video'].includes(l.icon_type)) && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <BarChart2 className="h-3.5 w-3.5 text-violet-400" />
                      Статистика
                    </p>
                    {(profile?.view_count ?? 0) > 0 && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5">
                        <Eye className="h-4 w-4 flex-shrink-0 text-violet-400" />
                        <span className="text-sm text-gray-600">Просмотров страницы</span>
                        <span className="ml-auto text-sm font-bold text-gray-900">{profile?.view_count ?? 0}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {links
                        .filter((l) => !['text_block', 'lead_form', 'countdown', 'image', 'video'].includes(l.icon_type))
                        .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
                        .map((link) => {
                          const maxClicks = Math.max(...links.map((l) => l.click_count ?? 0), 1)
                          const pct = Math.round(((link.click_count ?? 0) / maxClicks) * 100)
                          const { dot } = getLinkCardColor(link.icon_type)
                          const ctr = (profile?.view_count ?? 0) > 0
                            ? ((link.click_count ?? 0) / profile!.view_count * 100).toFixed(1)
                            : null
                          return (
                            <div key={link.id} className="flex items-center gap-3">
                              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="truncate text-xs text-gray-600">
                                    {link.title || link.icon_type}
                                  </span>
                                  <span className="ml-2 flex-shrink-0 flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-900">{link.click_count ?? 0}</span>
                                    {ctr !== null && <span className="text-[10px] text-gray-600">{ctr}%</span>}
                                  </span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
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
                    {recentClicks.length > 0 && (() => {
                      const days: Record<string, number> = {}
                      for (let i = 6; i >= 0; i--) {
                        const d = new Date(Date.now() - i * 86400000)
                        days[d.toISOString().slice(0, 10)] = 0
                      }
                      for (const c of recentClicks) {
                        const key = c.created_at.slice(0, 10)
                        if (key in days) days[key]++
                      }
                      const dayKeys = Object.keys(days)
                      const maxVal = Math.max(...Object.values(days), 1)
                      const dayLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
                      return (
                        <div className="mt-4">
                          <p className="mb-2 text-[10px] uppercase tracking-wider text-gray-600">Клики за 7 дней</p>
                          <div className="flex items-end gap-1.5 h-14">
                            {dayKeys.map((key) => {
                              const val = days[key]
                              const pct = Math.max(4, Math.round((val / maxVal) * 100))
                              const dow = new Date(key + 'T12:00:00').getDay()
                              return (
                                <div key={key} className="flex flex-1 flex-col items-center gap-1">
                                  <div className="w-full rounded-t-sm bg-violet-500/40 transition-all" style={{ height: `${pct}%` }} title={`${val} кл.`} />
                                  <span className="text-[9px] text-gray-600">{dayLabels[dow]}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
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
                <p className="text-sm font-semibold text-gray-900">Заявки от клиентов</p>
                <p className="text-xs text-gray-500">Через кнопку «Записаться» на вашей странице</p>
              </div>
              {!profile?.is_premium && leads.length > 0 && (
                <button
                  onClick={() => setTab('payment')}
                  className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-200"
                >
                  ⚡ Premium
                </button>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
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
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{lead.name}</p>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs text-violet-400 hover:text-violet-600"
                        >
                          {lead.phone}
                        </a>
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="mt-0.5 block text-xs text-blue-400 hover:text-blue-300 truncate">{lead.email}</a>
                        )}
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
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="mb-1 text-sm font-semibold text-amber-700">
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
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-indigo-950/30 p-5 text-center">
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
                  <p className="mb-1 text-base font-bold text-gray-900">Бесплатный тариф</p>
                  <p className="text-xs text-gray-400">{FREE_LINK_LIMIT} кнопки · с водяным знаком</p>
                </>
              )}
            </div>
            {!profile?.is_premium && (
              <>
                {/* Telegram connection nudge — show if not connected */}
                {!profile?.telegram_chat_id && (
                  <div className="rounded-2xl border border-[#2AABEE]/25 bg-[#2AABEE]/[0.06] p-4 flex gap-3 items-start">
                    <div className="mt-0.5 flex-shrink-0 text-xl">💬</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#2AABEE] mb-0.5">Привяжите Telegram для быстрой оплаты</p>
                      <p className="text-xs text-gray-400 mb-3">После оплаты отправьте скриншот чека боту — Premium активируется автоматически. Также получайте уведомления и сброс пароля.</p>
                      <a
                        href="/go/tg?u=Tapnikzbot"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#2AABEE]/20 px-3 py-1.5 text-xs font-semibold text-[#2AABEE] hover:bg-[#2AABEE]/30 transition-colors"
                      >
                        Открыть @Tapnikzbot →
                      </a>
                    </div>
                  </div>
                )}
                <PlanPicker username={profile?.username ?? ''} phone={profile?.phone} />
              </>
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
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-gray-900">
                {helpType === 'kaspi' && '🛒 Как найти ссылку на Kaspi магазин?'}
                {helpType === 'kaspi_pay' && '💸 Как найти ссылку Kaspi Pay?'}
                {helpType === 'kaspi_qr'  && '📱 Kaspi Pay QR-код — как настроить?'}

                {helpType === 'smart_qr'  && '📲 Smart QR — один код для iOS, Android и Web'}
                {helpType === 'kaspi_shop' && '🏪 Как найти ссылку на товар Kaspi?'}
                {helpType === 'twogis' && '📍 Как найти ссылку в 2ГИС?'}
              </p>
              <button
                onClick={() => setHelpType(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(helpType === 'kaspi' || helpType === 'kaspi_shop') && (
              <ol className="space-y-3 text-sm text-gray-600">
                {[
                  'Откройте приложение Kaspi.kz или сайт kaspi.kz/shop',
                  helpType === 'kaspi' ? 'Перейдите в «Мой магазин»' : 'Найдите нужный товар',
                  'Нажмите кнопку «Поделиться»',
                  `Скопируйте ссылку вида ${helpType === 'kaspi' ? 'kaspi.kz/shop/info/...' : 'kaspi.kz/shop/p/...'} — вставьте сюда`,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}

            {(helpType === 'kaspi_pay' || helpType === 'kaspi_qr') && (
              <>
                <ol className="space-y-3 text-sm text-gray-600">
                  {[
                    'Откройте приложение Kaspi.kz',
                    'Раздел «Платежи» → «Мой QR-код»',
                    'Нажмите «Поделиться» и скопируйте ссылку',
                    'Ссылка вида pay.kaspi.kz/pay/... — вставьте сюда',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                {helpType === 'kaspi_qr' && (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
                    <b>📱 QR-блок</b> — отображает сканируемый QR-код прямо на вашей странице.<br />
                    Клиент наводит камеру Kaspi.kz — и сразу попадает на экран оплаты.
                    На Android также работает кнопка «Открыть в Kaspi» через прямой диплинк.
                  </div>
                )}
              </>
            )}


            {helpType === 'smart_qr' && (
              <>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><b>iOS:</b> App Store ссылка вида <span className="font-mono text-xs">apps.apple.com/app/…</span> — или любой Universal Link вашего приложения</p>
                  <p><b>Android:</b> Play Store вида <span className="font-mono text-xs">play.google.com/store/apps/…</span> — или App Link вашего приложения</p>
                  <p><b>Web:</b> сайт или страница на случай если приложение не установлено (Desktop пользователи всегда попадают сюда)</p>
                </div>
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700 space-y-1.5">
                  <p><b>📲 Как работает Smart QR:</b> QR-код кодирует постоянный адрес <span className="font-mono">tapni.kz/qr/l/…</span>. Когда кто-то сканирует — сервер определяет OS и мгновенно перенаправляет: iOS → App Store, Android → Play Store / приложение напрямую, Desktop → веб.</p>
                  <p>Смените ссылки в дашборде — QR перепечатывать не нужно. Каждый скан считается отдельно от обычных кликов.</p>
                </div>
              </>
            )}

            {helpType === 'twogis' && (
              <ol className="space-y-3 text-sm text-gray-600">
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
              className="mt-5 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-200"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

    </main>

    {profile?.username && accessToken && (
      <OnboardingWizard
        username={profile.username}
        accessToken={accessToken}
        linksCount={links.length}
        onComplete={() => { if (user) loadData(user.id) }}
      />
    )}
    </>
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

  const KASPI_PAY = KASPI_PAY_URL
  const HALYK_PHONE = SUPPORT_PHONE
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
      const { data: { session: s } } = await getSupabase().auth.getSession()
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(s?.access_token ? { 'Authorization': `Bearer ${s.access_token}` } : {}) },
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
      const { data: { session: sInv } } = await getSupabase().auth.getSession()
      const res = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(sInv?.access_token ? { 'Authorization': `Bearer ${sInv.access_token}` } : {}) },
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
        <p className="mb-3 text-sm font-semibold text-violet-700">⚡ Premium</p>
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
            <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
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
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-base font-extrabold text-gray-900">1 000 ₸</p>
          <p className="text-[11px] text-gray-400">в месяц</p>
        </button>
        <button
          type="button"
          onClick={() => setPlan('annual')}
          className={`relative rounded-xl border p-3 text-center transition-all duration-200 ${
            plan === 'annual'
              ? 'border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/30'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-black">ВЫГОДНЕЕ</span>
          </div>
          <p className="text-base font-extrabold text-gray-900">10 000 ₸</p>
          <p className="text-[11px] text-gray-400">в год · −2 000 ₸</p>
        </button>
      </div>

      {/* Reference code */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Код платежа (укажите при переводе)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm font-bold tracking-wider text-gray-900">
            {REF_CODE}
          </code>
          <button
            type="button"
            onClick={copyRef}
            className="flex-shrink-0 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
          >
            {refCopied ? '✓' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Kaspi Pay */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-900">💳 Оплата через Kaspi</p>
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
          После оплаты укажите код <span className="font-mono font-bold text-amber-700">{REF_CODE}</span> в WhatsApp
        </p>
      </div>

      {/* Halyk Bank */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-900">🏦 Перевод через Halyk Bank</p>
        <div className="mb-3 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3">
          <p className="mb-0.5 text-[11px] text-gray-500">Номер для перевода</p>
          <p className="text-lg font-extrabold tracking-widest text-gray-900">{HALYK_PHONE}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Получатель: Голденбит Казахстан</p>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-xs text-gray-400">Сумма</p>
            <p className="text-sm font-bold text-gray-900">{price} ₸</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-xs text-gray-400">Комментарий</p>
            <p className="font-mono text-sm font-bold text-amber-700">{REF_CODE}</p>
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

      {/* Telegram auto-activation — PRIMARY CTA */}
      <div className="rounded-2xl border border-[#2AABEE]/30 bg-[#2AABEE]/[0.07] p-4">
        <p className="mb-1 text-sm font-bold text-[#2AABEE]">⚡ Автоматическая активация через Telegram</p>
        <p className="mb-3 text-xs text-gray-400">
          Самый быстрый способ. Отправьте скриншот чека боту — Premium активируется автоматически за 10 секунд.
        </p>
        <a
          href={`/go/tg?u=Tapnikzbot&start=receipt_${username}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] py-3 text-sm font-bold text-white transition-all hover:bg-[#1a9bde] active:scale-[0.98]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
          Отправить чек в Telegram бот
        </a>
      </div>

      {/* Notify admin after payment */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-gray-900">✅ Уже оплатили? (ручная активация)</p>
        <p className="mb-3 text-xs text-gray-400">
          Уведомим администратора — активируем Premium за 15 минут ({days} дней доступа)
        </p>
        {msg && (
          <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
            msg.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
              : 'border-red-500/30 bg-red-500/10 text-red-600'
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500/60"
            />
            <input
              type="text"
              inputMode="numeric"
              value={invoiceForm.bin}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, bin: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
              placeholder="БИН компании (12 цифр)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500/60"
            />
            {invoiceMsg && (
              <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                invoiceMsg.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                  : 'border-red-500/30 bg-red-500/10 text-red-600'
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
  const referralUrl = `https://tapni.kz/auth?ref=${username}&utm_source=referral&utm_medium=bot`

  function copy() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-violet-700">
        <Users className="h-4 w-4" />
        Программа менеджеров
      </p>
      <p className="mb-3 text-xs text-gray-500">
        Рекомендуйте tapni.kz и получайте <b className="text-gray-900">20% комиссии</b> с первой оплаты каждого клиента.
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
        <span className="flex-1 truncate text-xs font-mono text-gray-600">{referralUrl}</span>
        <button
          onClick={copy}
          className="flex-shrink-0 rounded-lg bg-violet-600/30 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-600/50"
        >
          {copied ? '✓ Скопировано' : 'Копировать'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-600">
        Комиссия начисляется один раз — за первую оплату привлечённого клиента.{' '}
        <a href="/partners" className="text-violet-600 hover:underline font-medium">Подробнее →</a>
      </p>
    </div>
  )
}
