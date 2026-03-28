import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('match_shots')
      .select('*')
      .eq('match_id', params.id)
      .order('set_number', { ascending: true })
      .order('game_number', { ascending: true })
      .order('point_number', { ascending: true })
      .order('shot_number', { ascending: true })

    if (error) throw error
    return NextResponse.json({ shots: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
