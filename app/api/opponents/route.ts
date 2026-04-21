import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/opponents           → list all opponents
// GET /api/opponents?name=foo  → fetch one by name
export async function GET(req: NextRequest) {
  if (DEV_MODE) return NextResponse.json({ opponents: [] })
  try {
    const supabase = getSupabase()
    const name = req.nextUrl.searchParams.get('name')

    if (name) {
      const { data, error } = await supabase
        .from('opponents')
        .select('*')
        .eq('name', name.trim())
        .maybeSingle()
      if (error) throw error
      return NextResponse.json({ opponent: data ?? null })
    }

    const { data, error } = await supabase.from('opponents').select('*').order('name')
    if (error) throw error
    return NextResponse.json({ opponents: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/opponents  — upsert by name
// Body: { name, style?, weapon?, weakness?, notes? }
export async function PUT(req: NextRequest) {
  if (DEV_MODE) return NextResponse.json({ ok: true, dev: true })
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const name = (body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const row = {
      name,
      style: body.style ?? null,
      weapon: body.weapon ?? null,
      weakness: body.weakness ?? null,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('opponents').upsert(row, { onConflict: 'name' })
    if (error) throw error
    return NextResponse.json({ ok: true, opponent: row })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
