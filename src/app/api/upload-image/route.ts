import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// Per-user rate limit: max 20 uploads per hour (prevents storage spam)
const uploadRateMap = new Map<string, { count: number; resetAt: number }>()
function checkUploadRate(userId: string): boolean {
  const now = Date.now()
  const entry = uploadRateMap.get(userId)
  if (!entry || now > entry.resetAt) {
    // Prune map if it grows too large (>500 entries = unlikely normal usage)
    if (uploadRateMap.size > 500) {
      for (const [k, v] of uploadRateMap) { if (now > v.resetAt) uploadRateMap.delete(k) }
    }
    uploadRateMap.set(userId, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

function detectImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png'
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  if (riff === 'RIFF' && webp === 'WEBP') return 'webp'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice(7)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getSupabaseAdmin() as any
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (!user || authErr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!checkUploadRate(user.id)) {
      return NextResponse.json({ error: 'Слишком много загрузок. Попробуйте через час.' }, { status: 429 })
    }

    let form: FormData
    try { form = await request.formData() } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = form.get('file') as File | null
    const type = form.get('type') as string | null
    if (!file || !type) return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })

    // Server-side size check before reading into memory
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 10 МБ)' }, { status: 413 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
    }

    let path: string
    let upsert = false
    if (type === 'avatar') {
      path = `${user.id}/avatar.jpg`
      upsert = true
    } else if (type === 'banner') {
      path = `${user.id}/banner_${Date.now()}.jpg`
    } else if (type === 'product') {
      path = `${user.id}/products/${Date.now()}.jpg`
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    // Magic bytes validation — reject non-image content regardless of Content-Type header
    if (!detectImageType(bytes)) {
      return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
    }

    const { error: upErr } = await admin
      .storage.from('avatars')
      .upload(path, bytes, { upsert, contentType: 'image/jpeg' })

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl, path })
  } catch (err) {
    console.error('[upload-image]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
