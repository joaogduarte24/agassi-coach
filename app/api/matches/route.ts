import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SEED_MATCHES } from '@/lib/seed'

const DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

// Server-side supabase client (lazy — avoids build-time env errors)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function matchToDb(m: any) {
  return {
    id: m.id,
    date: m.date,
    opponent_name: (m.opponent?.name || 'Unknown').trim(),
    opponent_utr: m.opponent?.utr ?? null,
    surface: m.surface,
    score_sets: m.score?.sets,
    score_sets_arr: m.score?.sets_arr,
    score_winner: m.score?.winner,
    serve: m.serve,
    return: m.return,
    forehand: m.forehand,
    backhand: m.backhand,
    shot_stats: m.shot_stats,
    opp_shots: m.opp_shots ?? null,
    what_worked: m.what_worked,
    what_didnt: m.what_didnt,
    key_number: m.key_number,
    journal: m.journal ?? null,
  }
}

function toArr(v: any): string[] | null {
  if (!v) return null
  if (Array.isArray(v)) return v
  // Supabase can deserialise JSON arrays as objects with numeric keys — normalise
  return Object.values(v).filter((x): x is string => typeof x === 'string')
}

// Normalise score_sets_arr — stored as [[6,3],[6,2]] but Supabase may return
// {"0":{"0":6,"1":3},"1":{"0":6,"1":2}} (nested objects with numeric keys)
function toSetsArr(v: any): [number, number][] | null {
  if (!v) return null
  const rows: any[] = Array.isArray(v) ? v : Object.values(v)
  return rows.map((x: any) => {
    if (Array.isArray(x)) return [Number(x[0]), Number(x[1])]
    const vals = Object.values(x as object).map(Number)
    return [vals[0], vals[1]] as [number, number]
  })
}

function dbToMatch(row: any) {
  return {
    id: row.id,
    date: row.date,
    opponent: { name: row.opponent_name, utr: row.opponent_utr },
    surface: row.surface,
    score: { sets: row.score_sets, sets_arr: toSetsArr(row.score_sets_arr), winner: row.score_winner },
    serve: row.serve,
    return: row.return,
    forehand: row.forehand,
    backhand: row.backhand,
    shot_stats: row.shot_stats,
    opp_shots: row.opp_shots ?? null,
    what_worked: toArr(row.what_worked),
    what_didnt: toArr(row.what_didnt),
    key_number: row.key_number,
    journal: row.journal ?? null,
  }
}

// GET — fetch all matches (seed if empty)
export async function GET() {
  if (DEV_MODE) return NextResponse.json({ matches: SEED_MATCHES })
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error

    // Auto-seed if empty
    if (!data || data.length === 0) {
      const seedRows = SEED_MATCHES.map(matchToDb)
      const { error: seedErr } = await supabase.from('matches').upsert(seedRows)
      if (seedErr) throw seedErr
      return NextResponse.json({ matches: SEED_MATCHES })
    }

    return NextResponse.json({ matches: data.map(dbToMatch) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — save a new match
export async function POST(req: NextRequest) {
  if (DEV_MODE) return NextResponse.json({ ok: true, dev: true })
  try {
    const supabase = getSupabase()
    const { match } = await req.json()
    const { error } = await supabase.from('matches').upsert(matchToDb(match))
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove a match
export async function DELETE(req: NextRequest) {
  if (DEV_MODE) return NextResponse.json({ ok: true, dev: true })
  try {
    const supabase = getSupabase()
    const { id } = await req.json()
    const { error } = await supabase.from('matches').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
