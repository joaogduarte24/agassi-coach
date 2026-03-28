import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { parseSwingVisionXlsx } from '@/app/lib/parseSwingVision'

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
    const file = formData.get('file') as File | null
    const oppName = formData.get('oppName') as string | null
    const oppUtr = formData.get('oppUtr') as string | null
    const surface = formData.get('surface') as string | null
    const matchDate = formData.get('matchDate') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const { matchData, shotsRows, pointsRows, meta } = parseSwingVisionXlsx(buffer)

    const supabase = getSupabase()

    // Upsert match with computed aggregate stats + basic metadata
    const { error: matchErr } = await supabase.from('matches').upsert({
      id: matchId,
      date: matchDate || matchData.score?.sets ? matchDate : new Date().toISOString().split('T')[0],
      opponent_name: oppName || matchData.oppName || 'Unknown',
      opponent_utr: oppUtr ? parseFloat(oppUtr) : null,
      surface: surface || 'Clay',
      score_sets: matchData.score.sets,
      score_sets_arr: matchData.score.sets_arr,
      score_winner: matchData.score.winner,
      serve: matchData.serve,
      return: matchData.return,
      forehand: matchData.forehand,
      backhand: matchData.backhand,
      shot_stats: matchData.shot_stats,
      opp_shots: matchData.opp_shots,
      has_shot_data: true,
    }, { onConflict: 'id', ignoreDuplicates: false })

    if (matchErr) throw matchErr

    // Replace shots: delete existing, insert new
    const { error: delShotsErr } = await supabase.from('match_shots').delete().eq('match_id', matchId)
    if (delShotsErr) throw delShotsErr

    const { error: delPtsErr } = await supabase.from('match_points').delete().eq('match_id', matchId)
    if (delPtsErr) throw delPtsErr

    // Batch insert shots (Supabase handles up to 1000 rows per call)
    if (shotsRows.length) {
      const BATCH = 500
      for (let i = 0; i < shotsRows.length; i += BATCH) {
        const batch = shotsRows.slice(i, i + BATCH).map(s => ({ ...s, match_id: matchId }))
        const { error } = await supabase.from('match_shots').insert(batch)
        if (error) throw error
      }
    }

    if (pointsRows.length) {
      const BATCH = 500
      for (let i = 0; i < pointsRows.length; i += BATCH) {
        const batch = pointsRows.slice(i, i + BATCH).map(p => ({ ...p, match_id: matchId }))
        const { error } = await supabase.from('match_points').insert(batch)
        if (error) throw error
      }
    }

    return NextResponse.json({
      ok: true,
      matchId,
      shots: meta.totalShots,
      points: meta.totalPoints,
      matchData,
    })
  } catch (err: any) {
    console.error('upload-csv error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
