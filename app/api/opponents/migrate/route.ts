import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// One-off migration: pulls opp_style / opp_weapon / opp_weakness / net_game /
// mental_game / opp_lefty out of every matches.journal, groups by opponent_name,
// and upserts one row per opponent into the new `opponents` table.
// Strategy: most-recent non-null wins per field (matches sorted desc by date).
// Idempotent — safe to run multiple times.
//
// Run once: POST /api/opponents/migrate

const DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST() {
  if (DEV_MODE) return NextResponse.json({ ok: true, dev: true, migrated: 0 })
  try {
    const supabase = getSupabase()

    const { data: rows, error } = await supabase
      .from('matches')
      .select('opponent_name, date, journal')
      .order('date', { ascending: false })
    if (error) throw error

    type OppAgg = {
      name: string
      style: string | null
      weapon: string | null
      weakness: string | null
      notes: string | null
    }
    const agg: Record<string, OppAgg> = {}

    for (const row of rows || []) {
      const name = (row.opponent_name || '').trim()
      if (!name || name === 'Unknown') continue
      const j: any = row.journal || {}
      if (!agg[name]) agg[name] = { name, style: null, weapon: null, weakness: null, notes: null }
      const a = agg[name]
      // Most-recent first (already sorted desc) — only fill if still empty.
      if (a.style == null && j.opp_style) a.style = j.opp_style
      if (a.weapon == null && j.opp_weapon) a.weapon = j.opp_weapon
      if (a.weakness == null && j.opp_weakness) a.weakness = j.opp_weakness
    }

    const upserts = Object.values(agg).filter(o => o.style || o.weapon || o.weakness)
    if (upserts.length > 0) {
      const { error: upErr } = await supabase
        .from('opponents')
        .upsert(
          upserts.map(o => ({ ...o, updated_at: new Date().toISOString() })),
          { onConflict: 'name' }
        )
      if (upErr) throw upErr
    }

    return NextResponse.json({
      ok: true,
      scanned: rows?.length ?? 0,
      migrated: upserts.length,
      opponents: upserts.map(o => o.name),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
