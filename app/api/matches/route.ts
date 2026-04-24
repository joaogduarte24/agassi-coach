import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SEED_MATCHES } from '@/lib/seed'
import { invalidateForMatch, invalidateForOpponent } from '@/app/lib/coach/cache'

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
    has_shot_data: m.has_shot_data ?? false,
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

// Journal v2 migration: "Luck" values in decided_by arrays are rewritten to
// "Close margin" on read. Safe because old taxonomy → new taxonomy is 1:1.
function migrateJournal(j: any): any {
  if (!j) return j
  if (Array.isArray(j.decided_by)) {
    j = { ...j, decided_by: j.decided_by.map((v: string) => v === 'Luck' ? 'Close margin' : v) }
  } else if (j.decided_by && typeof j.decided_by === 'object') {
    // Supabase JSONB array-as-object quirk
    const arr = Object.values(j.decided_by).filter((x): x is string => typeof x === 'string')
    j = { ...j, decided_by: arr.map(v => v === 'Luck' ? 'Close margin' : v) }
  }
  return j
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
    journal: migrateJournal(row.journal ?? null),
    has_shot_data: row.has_shot_data ?? false,
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

// POST — save a new match (also used for updates / journal edits via upsert)
export async function POST(req: NextRequest) {
  if (DEV_MODE) return NextResponse.json({ ok: true, dev: true })
  try {
    const supabase = getSupabase()
    const { match } = await req.json()
    const { error } = await supabase.from('matches').upsert(matchToDb(match))
    if (error) throw error
    // Invalidate coach_cache entries tied to this match + opponent. Any
    // cached pre-match brief vs this opponent is now stale (new data to
    // consume), and any debrief for this match must be regenerated.
    // Fire-and-forget — don't block the response on cache cleanup.
    if (match?.id) invalidateForMatch(match.id).catch(() => {})
    if (match?.opponent?.name) invalidateForOpponent(match.opponent.name).catch(() => {})
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
    // Fetch opponent before deletion so we know what to invalidate.
    // (ON DELETE CASCADE on coach_cache.match_id takes care of match-scoped
    // rows automatically, but opponent-scoped rows need an explicit pass.)
    const { data: existing } = await supabase.from('matches').select('opponent_name').eq('id', id).maybeSingle()
    const { error } = await supabase.from('matches').delete().eq('id', id)
    if (error) throw error
    if (existing?.opponent_name) invalidateForOpponent(existing.opponent_name).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
