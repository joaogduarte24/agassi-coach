import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { parseSwingVisionXlsx } from '@/app/lib/parseSwingVision'
import { computeShotPatterns, type ShotRow } from '@/app/lib/signals/patterns'
import { invalidateForMatch, invalidateForOpponent } from '@/app/lib/coach/cache'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id

  try {
    const formData = await req.formData()
    const file      = formData.get('file')      as File   | null
    const oppName   = formData.get('oppName')   as string | null
    const oppUtr    = formData.get('oppUtr')    as string | null
    const surface   = formData.get('surface')   as string | null
    const matchDate = formData.get('matchDate') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const { xlsxExtras, shotsRows, pointsRows, meta } = parseSwingVisionXlsx(buffer)

    const supabase = getSupabase()

    // Fetch existing match — screenshots are ground truth for all aggregated stats.
    // xlsx only contributes fields that screenshots cannot provide.
    // PGRST116 = no row found = new match, that's OK.
    const { data: existing, error: fetchErr } = await supabase
      .from('matches')
      .select('shot_stats, opp_shots')
      .eq('id', matchId)
      .single()

    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr

    // New match — create a minimal record so FK constraints on shots/points hold
    if (!existing) {
      const date = matchDate || matchId.split('-').slice(0, 3).join('-')
      const { error: insertErr } = await supabase.from('matches').insert({
        id:           matchId,
        date,
        opponent_name: oppName || 'Unknown',
        opponent_utr:  oppUtr ? parseFloat(oppUtr) : null,
        surface:       surface || 'Clay',
      })
      if (insertErr) throw insertErr
    }

    // Merge xlsx-unique analytics into existing shot_stats (never overwrite screenshot-sourced fields)
    const mergedShotStats = {
      ...(existing?.shot_stats ?? {}),
      ...xlsxExtras.shot_stats_extras,
    }

    // Merge opp serve direction into existing opp_shots.serve
    const existingOppShots = existing?.opp_shots ?? {}
    const mergedOppShots = {
      ...existingOppShots,
      serve: {
        ...(existingOppShots.serve ?? {}),
        ...xlsxExtras.opp_serve_direction,
      },
    }

    const { error: matchErr } = await supabase
      .from('matches')
      .update({
        shot_stats: mergedShotStats,
        opp_shots:  mergedOppShots,
        has_shot_data: true,
      })
      .eq('id', matchId)

    if (matchErr) throw matchErr

    // Replace shots: delete existing, insert new
    const { error: delShotsErr } = await supabase.from('match_shots').delete().eq('match_id', matchId)
    if (delShotsErr) throw delShotsErr

    const { error: delPtsErr } = await supabase.from('match_points').delete().eq('match_id', matchId)
    if (delPtsErr) throw delPtsErr

    // Batch insert shots
    if (shotsRows.length) {
      const BATCH = 500
      for (let i = 0; i < shotsRows.length; i += BATCH) {
        const batch = shotsRows.slice(i, i + BATCH).map(s => ({ ...s, match_id: matchId }))
        const { error } = await supabase.from('match_shots').insert(batch)
        if (error) throw error
      }
    }

    // Batch insert points
    if (pointsRows.length) {
      const BATCH = 500
      for (let i = 0; i < pointsRows.length; i += BATCH) {
        const batch = pointsRows.slice(i, i + BATCH).map(p => ({ ...p, match_id: matchId }))
        const { error } = await supabase.from('match_points').insert(batch)
        if (error) throw error
      }
    }

    // Precompute shot patterns: join points to mark winners, then aggregate
    if (shotsRows.length > 0 && pointsRows.length > 0) {
      // Build set of JD-won points
      const jdWonPts = new Set<string>()
      for (const p of pointsRows) {
        if ((p as any).server === 'host' ? (p as any).point_winner === 'host' : (p as any).point_winner === 'guest') {
          // The parser maps host=JD — check parseSwingVision for mapping
        }
        // Simpler: just use point_winner field which is already mapped to 'jd'/'opponent' by parser
        if ((p as any).point_winner === 'jd') {
          jdWonPts.add(`${(p as any).set_number}|${(p as any).game_number}|${(p as any).point_number}`)
        }
      }

      const patternRows: ShotRow[] = shotsRows.map((s: any) => ({
        match_id: matchId,
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
        shot_context: s.shot_context ?? null,
      }))

      // Mark last JD 'In' shot on JD-won points as winner
      const ptGroups = new Map<string, ShotRow[]>()
      for (const r of patternRows) {
        const k = `${r.set_number}|${r.game_number}|${r.point_number}`
        if (!ptGroups.has(k)) ptGroups.set(k, [])
        ptGroups.get(k)!.push(r)
      }
      for (const [k, list] of Array.from(ptGroups.entries())) {
        if (!jdWonPts.has(k)) continue
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].player === 'jd' && list[i].result === 'In') {
            list[i].result = 'winner'
            break
          }
        }
      }

      const { patterns, totalWinners } = computeShotPatterns(patternRows, 2, 5)
      if (patterns.length > 0) {
        const { data: currentMatch } = await supabase.from('matches').select('shot_stats').eq('id', matchId).single()
        const updatedStats = {
          ...(currentMatch?.shot_stats ?? {}),
          top_patterns: patterns,
          total_winners_from_patterns: totalWinners,
        }
        await supabase.from('matches').update({ shot_stats: updatedStats }).eq('id', matchId)
      }
    }

    // Return the full updated match so the UI doesn't need to reconstruct it
    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    // xlsx upload adds new shot-level data and can backfill shot_stats fields,
    // so the coaching prompt input changes. Invalidate any cached debrief for
    // this match + any cached pre-match brief against this opponent.
    invalidateForMatch(matchId).catch(() => {})
    if (updatedMatch?.opponent_name) invalidateForOpponent(updatedMatch.opponent_name).catch(() => {})

    return NextResponse.json({
      ok: true,
      matchId,
      shots:  meta.totalShots,
      points: meta.totalPoints,
      xlsxExtras,
      match:  updatedMatch,
    })
  } catch (err: any) {
    console.error('upload-csv error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
