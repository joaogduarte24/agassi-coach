/**
 * One-off backfill: reads match_shots from Supabase for all matches with
 * has_shot_data=true, runs computeShotPatterns(), writes top_patterns
 * back to shot_stats JSONB. Safe to run multiple times (idempotent).
 *
 * DELETE this file after running once.
 *
 * Usage: POST /api/backfill-patterns
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { computeShotPatterns, type ShotRow } from '@/app/lib/signals/patterns'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST() {
  const supabase = getSupabase()

  // Get all matches with shot data
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .eq('has_shot_data', true)

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })
  if (!matches || matches.length === 0) return NextResponse.json({ ok: true, message: 'No matches with shot data', updated: 0 })

  const results: { matchId: string; patterns: number; winners: number }[] = []

  for (const match of matches) {
    // Fetch all shots for this match
    const { data: shots, error: shotsErr } = await supabase
      .from('match_shots')
      .select('match_id, player, shot_number, shot_type, stroke, speed_kmh, point_number, game_number, set_number, direction, result')
      .eq('match_id', match.id)
      .order('set_number')
      .order('game_number')
      .order('point_number')
      .order('shot_number')

    if (shotsErr || !shots || shots.length === 0) continue

    // Fetch points to know which points JD won
    const { data: points } = await supabase
      .from('match_points')
      .select('point_number, set_number, game_number, point_winner')
      .eq('match_id', match.id)

    // Build a set of (set,game,point) keys where JD won
    const jdWonPoints = new Set<string>()
    if (points) {
      for (const p of points) {
        if (p.point_winner === 'jd') {
          jdWonPoints.add(`${p.set_number}|${p.game_number}|${p.point_number}`)
        }
      }
    }

    // Mark the last JD 'In' shot on JD-won points as a winner
    const rows: ShotRow[] = shots.map((s: any) => ({
      match_id: s.match_id,
      player: s.player,
      shot_number: s.shot_number,
      shot_type: s.shot_type,
      stroke: s.stroke,
      speed_kmh: s.speed_kmh,
      point_number: s.point_number,
      game_number: s.game_number,
      set_number: s.set_number,
      direction: s.direction,
      result: s.result,
      shot_context: null,
    }))

    // For each JD-won point, find the last JD shot with result='In' and mark it as winner
    const pointGroups = new Map<string, ShotRow[]>()
    for (const r of rows) {
      const key = `${r.set_number}|${r.game_number}|${r.point_number}`
      if (!pointGroups.has(key)) pointGroups.set(key, [])
      pointGroups.get(key)!.push(r)
    }
    for (const [key, shotList] of Array.from(pointGroups.entries())) {
      if (!jdWonPoints.has(key)) continue
      // Find last JD shot with result 'In'
      for (let i = shotList.length - 1; i >= 0; i--) {
        if (shotList[i].player === 'jd' && shotList[i].result === 'In') {
          shotList[i].result = 'winner'
          break
        }
      }
    }

    const { patterns, totalWinners } = computeShotPatterns(rows, 2, 5)

    if (patterns.length > 0) {
      // Merge into existing shot_stats
      const { data: current } = await supabase
        .from('matches')
        .select('shot_stats')
        .eq('id', match.id)
        .single()

      const updated = {
        ...(current?.shot_stats ?? {}),
        top_patterns: patterns,
        total_winners_from_patterns: totalWinners,
      }

      await supabase.from('matches').update({ shot_stats: updated }).eq('id', match.id)
      results.push({ matchId: match.id, patterns: patterns.length, winners: totalWinners })
    }
  }

  return NextResponse.json({ ok: true, updated: results.length, matches: results })
}
