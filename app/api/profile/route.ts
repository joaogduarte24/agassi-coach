// /api/profile — read/update JD's user profile (currently: UTR only)
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  if (DEV_MODE) {
    return NextResponse.json({ profile: { id: 'jd', display_name: 'JD', utr: 3.2, utr_updated_at: new Date().toISOString().slice(0, 10) } })
  }
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('user_profile').select('*').eq('id', 'jd').maybeSingle()
    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (DEV_MODE) return NextResponse.json({ ok: true, dev: true })
  try {
    const { utr } = await req.json()
    const supabase = getSupabase()
    const { error } = await supabase
      .from('user_profile')
      .update({ utr, utr_updated_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
      .eq('id', 'jd')
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
