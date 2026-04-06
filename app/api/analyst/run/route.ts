// /api/analyst/run — server-side analyst compute.
// GET  → returns the latest cached AnalystState
// POST → recomputes from current matches + stores a new run, returns the fresh state
//
// Dev mode (no Supabase env): computes on the fly from SEED_MATCHES, no persistence.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runAnalyst } from '@/app/lib/analyst/run'
import { SEED_MATCHES } from '@/lib/seed'

const DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function dbToMatch(row: any) {
  const toArr = (v: any) => !v ? null : Array.isArray(v) ? v : Object.values(v).filter((x: any) => typeof x === 'string')
  const toSetsArr = (v: any) => {
    if (!v) return null
    const rows: any[] = Array.isArray(v) ? v : Object.values(v)
    return rows.map((x: any) => {
      if (Array.isArray(x)) return [Number(x[0]), Number(x[1])]
      const vals = Object.values(x as object).map(Number)
      return [vals[0], vals[1]]
    })
  }
  return {
    id: row.id, date: row.date,
    opponent: { name: row.opponent_name, utr: row.opponent_utr },
    surface: row.surface,
    score: { sets: row.score_sets, sets_arr: toSetsArr(row.score_sets_arr), winner: row.score_winner },
    serve: row.serve, return: row.return, forehand: row.forehand, backhand: row.backhand,
    shot_stats: row.shot_stats, opp_shots: row.opp_shots ?? null,
    what_worked: toArr(row.what_worked), what_didnt: toArr(row.what_didnt),
    key_number: row.key_number, journal: row.journal ?? null,
    has_shot_data: row.has_shot_data ?? false,
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET() {
  if (DEV_MODE) {
    const state = runAnalyst({ matches: SEED_MATCHES as any, utr: 3.2, utrUpdatedAt: new Date().toISOString().slice(0, 10) })
    return NextResponse.json({ state, source: 'dev' })
  }
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('analyst_runs')
      .select('payload, generated_at')
      .eq('is_latest', true)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data?.payload) return NextResponse.json({ state: data.payload, source: 'cache' })
    // No cached run yet — compute one on the fly without persisting
    return await runAndStore(supabase, false)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST (refresh) ──────────────────────────────────────────────────────────
export async function POST() {
  if (DEV_MODE) {
    const state = runAnalyst({ matches: SEED_MATCHES as any, utr: 3.2, utrUpdatedAt: new Date().toISOString().slice(0, 10) })
    return NextResponse.json({ state, source: 'dev' })
  }
  try {
    const supabase = getSupabase()
    return await runAndStore(supabase, true)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function runAndStore(supabase: any, persist: boolean) {
  const [matchesRes, profileRes] = await Promise.all([
    supabase.from('matches').select('*').order('date', { ascending: true }),
    supabase.from('user_profile').select('utr, utr_updated_at').eq('id', 'jd').maybeSingle(),
  ])
  if (matchesRes.error) throw matchesRes.error
  const matches = (matchesRes.data || []).map(dbToMatch) as any[]
  const utr = profileRes.data?.utr ?? null
  const utrUpdatedAt = profileRes.data?.utr_updated_at ?? null

  const state = runAnalyst({ matches, utr, utrUpdatedAt })

  if (persist) {
    // Mark previous as not latest
    await supabase.from('analyst_runs').update({ is_latest: false }).eq('is_latest', true)
    const { error: insErr } = await supabase.from('analyst_runs').insert({
      schema_version: state.schema_version,
      match_count: state.match_count,
      shot_data_match_count: state.shot_data_match_count,
      payload: state,
      is_latest: true,
    })
    if (insErr) throw insErr
  }

  return NextResponse.json({ state, source: persist ? 'fresh' : 'on_demand' })
}
