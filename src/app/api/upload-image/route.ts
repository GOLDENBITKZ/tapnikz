import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (!user || authErr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let form: FormData
  try { form = await request.formData() } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file') as File | null
  const type = form.get('type') as string | null
  if (!file || !type) return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })

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

  const bytes = await file.arrayBuffer()
  const { error: upErr } = await admin
    .storage.from('avatars')
    .upload(path, bytes, { upsert, contentType: 'image/jpeg' })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, path })
}
