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

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const { xlsxExtras, shotsRows, pointsRows, meta } = parseSwingVisionXlsx(buffer)

    const supabase = getSupabase()

    // Fetch existing match — screenshots are ground truth for all aggregated stats.
    // xlsx only contributes fields that screenshots cannot provide.
    const { data: existing, error: fetchErr } = await supabase
      .from('matches')
      .select('shot_stats, opp_shots')
      .eq('id', matchId)
      .single()

    if (fetchErr) throw fetchErr

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
        opp_shots: mergedOppShots,
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

    return NextResponse.json({
      ok: true,
      matchId,
      shots: meta.totalShots,
      points: meta.totalPoints,
      xlsxExtras,
    })
  } catch (err: any) {
    console.error('upload-csv error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
