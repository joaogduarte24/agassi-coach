// parseSwingVision.ts — server-side only (API routes)
// Parses a SwingVision .xlsx export into structured match data + shot/point rows

import * as XLSX from 'xlsx'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function sumSets(row: any, prefix: 'Host' | 'Guest'): number {
  return [1, 2, 3, 4, 5].reduce((acc, i) => {
    const v = row?.[`${prefix} Set ${i}`]
    return acc + (typeof v === 'number' ? v : 0)
  }, 0)
}

function avg(arr: number[]): number | null {
  const valid = arr.filter(v => typeof v === 'number' && !isNaN(v) && v > 0)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

function pct(n: number, total: number): number | null {
  return total > 0 ? Math.round((n / total) * 100) : null
}

function std(arr: number[]): number | null {
  const valid = arr.filter(v => typeof v === 'number' && !isNaN(v) && v > 0)
  if (valid.length < 2) return null
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length
  const variance = valid.reduce((acc, v) => acc + (v - mean) ** 2, 0) / valid.length
  return Math.round(Math.sqrt(variance))
}

function round1(n: number | null): number | null {
  return n != null ? Math.round(n * 10) / 10 : null
}

// ─── SERVE STATS ──────────────────────────────────────────────────────────────
function computeServe(shots: any[], type: 'first_serve' | 'second_serve') {
  const serves = shots.filter(s => s.Type === type)
  if (!serves.length) return { pct_ad: null, pct_deuce: null, spd_ad: null, spd_deuce: null }

  // Bucket by side: 'ad' zone family vs 'deuce' zone family
  const adZones = new Set(['ad', 'ad_alley', 'ad_out'])
  const deuceZones = new Set(['deuce', 'deuce_alley', 'deuce_out', 'center_line'])

  const adServes = serves.filter(s => adZones.has(s['Bounce Zone']))
  const deuceServes = serves.filter(s => deuceZones.has(s['Bounce Zone']))

  const adIn = adServes.filter(s => s.Result === 'In')
  const deuceIn = deuceServes.filter(s => s.Result === 'In')

  return {
    pct_ad: pct(adIn.length, adServes.length),
    pct_deuce: pct(deuceIn.length, deuceServes.length),
    spd_ad: round1(avg(adIn.map(s => s['Speed (KM/H)']))),
    spd_deuce: round1(avg(deuceIn.map(s => s['Speed (KM/H)']))),
  }
}

// ─── RETURN STATS ─────────────────────────────────────────────────────────────
function computeReturn(shots: any[], type: 'first_return' | 'second_return') {
  const returns = shots.filter(s => s.Type === type)
  if (!returns.length) return { pct_ad: null, pct_deuce: null, spd_ad: null, spd_deuce: null, deep_ad: null, deep_deuce: null }

  const adZones = new Set(['ad', 'ad_alley', 'ad_out'])
  const deuceZones = new Set(['deuce', 'deuce_alley', 'deuce_out', 'center_line'])

  const adRet = returns.filter(s => adZones.has(s['Bounce Zone']))
  const deuceRet = returns.filter(s => deuceZones.has(s['Bounce Zone']))

  const adIn = adRet.filter(s => s.Result === 'In')
  const deuceIn = deuceRet.filter(s => s.Result === 'In')
  const adDeep = adIn.filter(s => s['Bounce Depth'] === 'deep')
  const deuceDeep = deuceIn.filter(s => s['Bounce Depth'] === 'deep')

  return {
    pct_ad: pct(adIn.length, adRet.length),
    pct_deuce: pct(deuceIn.length, deuceRet.length),
    spd_ad: round1(avg(adIn.map(s => s['Speed (KM/H)']))),
    spd_deuce: round1(avg(deuceIn.map(s => s['Speed (KM/H)']))),
    deep_ad: pct(adDeep.length, adIn.length),
    deep_deuce: pct(deuceDeep.length, deuceIn.length),
  }
}

// ─── GROUNDSTROKE STATS ───────────────────────────────────────────────────────
function computeGroundstroke(shots: any[], stroke: 'Forehand' | 'Backhand') {
  const gs = shots.filter(s => s.Stroke === stroke && s.Type !== 'first_serve' && s.Type !== 'second_serve')
  if (!gs.length) return { cc_in: null, dtl_in: null, spd_cc: null, spd_dtl: null, depth_cc: null, depth_dtl: null }

  const ccDirs = new Set(['cross court', 'inside out'])
  const dtlDirs = new Set(['down the line', 'inside in'])

  const cc = gs.filter(s => ccDirs.has(s.Direction))
  const dtl = gs.filter(s => dtlDirs.has(s.Direction))

  const ccIn = cc.filter(s => s.Result === 'In')
  const dtlIn = dtl.filter(s => s.Result === 'In')
  const ccDeep = ccIn.filter(s => s['Bounce Depth'] === 'deep')
  const dtlDeep = dtlIn.filter(s => s['Bounce Depth'] === 'deep')

  return {
    cc_in: pct(ccIn.length, cc.length),
    dtl_in: pct(dtlIn.length, dtl.length),
    spd_cc: round1(avg(ccIn.map(s => s['Speed (KM/H)']))),
    spd_dtl: round1(avg(dtlIn.map(s => s['Speed (KM/H)']))),
    depth_cc: pct(ccDeep.length, ccIn.length),
    depth_dtl: pct(dtlDeep.length, dtlIn.length),
  }
}

// ─── SCORE FROM POINTS ────────────────────────────────────────────────────────
function computeScore(pointsRaw: any[]): { sets: string | null; sets_arr: [number, number][] | null; winner: string | null } {
  if (!pointsRaw.length) return { sets: null, sets_arr: null, winner: null }

  // Group points by Set+Game, last point in group = game winner
  const gameMap = new Map<string, string>()
  for (const pt of pointsRaw) {
    const key = `${pt.Set}-${pt.Game}`
    gameMap.set(key, pt['Point Winner']) // overwrites until last point
  }

  const maxSet = Math.max(...pointsRaw.map(p => p.Set || 0))
  const sets_arr: [number, number][] = []

  for (let s = 1; s <= maxSet; s++) {
    const setGames = Array.from(gameMap.entries()).filter(([k]) => k.startsWith(`${s}-`))
    const hostGames = setGames.filter(([, w]) => w === 'host').length
    const guestGames = setGames.filter(([, w]) => w === 'guest').length
    if (hostGames + guestGames > 0) sets_arr.push([hostGames, guestGames])
  }

  if (!sets_arr.length) return { sets: null, sets_arr: null, winner: null }

  const sets = sets_arr.map(([h, g]) => `${h}-${g}`).join(' ')
  // Winner = who won more sets (or the final set if deciding set)
  const hostSetsWon = sets_arr.filter(([h, g]) => h > g).length
  const guestSetsWon = sets_arr.filter(([h, g]) => g > h).length
  const winner = hostSetsWon > guestSetsWon ? 'JD' : guestSetsWon > hostSetsWon ? 'opponent' : null

  return { sets, sets_arr, winner }
}

// ─── MAIN PARSER ──────────────────────────────────────────────────────────────
export function parseSwingVisionXlsx(buffer: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })

  const settingsRaw = XLSX.utils.sheet_to_json(wb.Sheets['Settings']) as any[]
  const shotsRaw = XLSX.utils.sheet_to_json(wb.Sheets['Shots']) as any[]
  const pointsRaw = XLSX.utils.sheet_to_json(wb.Sheets['Points']) as any[]
  const statsRaw = XLSX.utils.sheet_to_json(wb.Sheets['Stats']) as any[]

  const s0 = settingsRaw[0] || {}
  const jdName = (s0['Host Team'] as string) || ''
  const oppName = (s0['Guest Team'] as string) || ''

  // Split shots by player
  const jdShots = shotsRaw.filter(s => s.Player === jdName)
  const oppShots = shotsRaw.filter(s => s.Player === oppName)

  // Points by who serves
  const jdServing = pointsRaw.filter(p => p['Match Server'] === 'host')
  const jdServingWon = jdServing.filter(p => p['Point Winner'] === 'host')
  const jdReturning = pointsRaw.filter(p => p['Match Server'] === 'guest')
  const jdReturningWon = jdReturning.filter(p => p['Point Winner'] === 'host')
  const oppServingWon = jdReturning.filter(p => p['Point Winner'] === 'guest')

  const bpFaced = pointsRaw.filter(p => p['Break Point'] === true && p['Match Server'] === 'host')
  const bpSaved = bpFaced.filter(p => p['Point Winner'] === 'host')
  const bpOpps = pointsRaw.filter(p => p['Break Point'] === true && p['Match Server'] === 'guest')
  const bpWon = bpOpps.filter(p => p['Point Winner'] === 'host')

  const H = (i: number) => sumSets(statsRaw[i], 'Host')
  const G = (i: number) => sumSets(statsRaw[i], 'Guest')

  // ── shot_stats (aggregate) ─────────────────────────────────────────────────
  const jdTotal = jdShots.length
  const maxSpd = Math.max(0, ...jdShots.map(s => s['Speed (KM/H)'] || 0))

  // Rally length
  const rallyMap = new Map<string, number>()
  for (const s of shotsRaw) {
    const key = `${s.Set}-${s.Game}-${s.Point}`
    rallyMap.set(key, (rallyMap.get(key) || 0) + 1)
  }
  const rallies = Array.from(rallyMap.values())
  const rallyMean = avg(rallies)
  const rallyShortN = rallies.filter(r => r <= 3).length
  const rallyLongN = rallies.filter(r => r >= 7).length

  // Serve direction
  const jdFirst = jdShots.filter(s => s.Type === 'first_serve' && s.Result === 'In')
  const s1TotalIn = jdFirst.length
  const s1T = jdFirst.filter(s => s.Direction === 'down the T').length
  const s1Wide = jdFirst.filter(s => s.Direction === 'out wide').length

  // Serve+1 direction
  const jdS1 = jdShots.filter(s => s.Type === 'serve_plus_one')
  const s1AfterDtl = jdS1.filter(s => ['down the line', 'inside in'].includes(s.Direction)).length

  // FH contact height + speed std
  const jdFH = jdShots.filter(s => s.Stroke === 'Forehand' && s.Result === 'In')
  const jdBH = jdShots.filter(s => s.Stroke === 'Backhand' && s.Result === 'In')

  const shot_stats: any = {
    aces: H(19),
    service_winners: H(20),
    winners: H(20) + H(21) + H(22),
    fh_winners: H(21),
    bh_winners: H(22),
    ue: H(23) + H(24),
    fh_ue: H(23),
    bh_ue: H(24),
    df: pointsRaw.filter(p => p.Detail === 'Double Fault' && p['Match Server'] === 'host').length,
    s1_in_n: H(1),
    s1_in_total: H(0),
    s2_in_n: H(4),
    s2_in_total: H(3),
    serve_pts_won_n: jdServingWon.length,
    serve_pts_won_total: jdServing.length,
    serve_pts_won_pct: pct(jdServingWon.length, jdServing.length),
    s1_pts_won_n: H(2),
    s1_pts_won_total: H(1),
    s1_pts_won_pct: pct(H(2), H(1)),
    s2_pts_won_n: H(5),
    s2_pts_won_total: H(4),
    s2_pts_won_pct: pct(H(5), H(4)),
    return_pts_won_n: jdReturningWon.length,
    return_pts_won_total: jdReturning.length,
    return_pts_won_pct: pct(jdReturningWon.length, jdReturning.length),
    ret1_pts_won_n: H(9),
    ret1_pts_won_total: G(0),
    ret1_pts_won_pct: pct(H(9), G(0)),
    ret2_pts_won_n: H(11),
    ret2_pts_won_total: G(3),
    ret2_pts_won_pct: pct(H(11), G(3)),
    total_pts_won_n: jdServingWon.length + jdReturningWon.length,
    total_pts_won_total: pointsRaw.length,
    total_pts_won_pct: pct(jdServingWon.length + jdReturningWon.length, pointsRaw.length),
    bp_saved_n: bpSaved.length,
    bp_saved_total: bpFaced.length,
    bp_saved_pct: pct(bpSaved.length, bpFaced.length),
    bp_won_n: bpWon.length,
    bp_won_total: bpOpps.length,
    bp_won_pct: pct(bpWon.length, bpOpps.length),
    set_pts_saved_n: H(14),
    set_pts_saved_total: H(15),
    max_ball_spd: maxSpd > 0 ? Math.round(maxSpd) : null,
    total_shots: jdTotal,
    fh_pct: pct(jdShots.filter(s => s.Stroke === 'Forehand').length, jdTotal),
    bh_pct: pct(jdShots.filter(s => s.Stroke === 'Backhand').length, jdTotal),
    flat_pct: pct(jdShots.filter(s => s.Spin === 'Flat').length, jdTotal),
    topspin_pct: pct(jdShots.filter(s => s.Spin === 'Topspin').length, jdTotal),
    slice_pct: pct(jdShots.filter(s => s.Spin === 'Slice').length, jdTotal),
    // CSV-exclusive insights (stored in shot_stats for Debrief)
    rally_mean: round1(rallyMean),
    rally_pct_short: pct(rallyShortN, rallies.length),
    rally_pct_long: pct(rallyLongN, rallies.length),
    s1_t_pct: pct(s1T, s1TotalIn),
    s1_wide_pct: pct(s1Wide, s1TotalIn),
    s1_after_dtl_pct: pct(s1AfterDtl, jdS1.length),
    fh_spd_std: std(jdFH.map(s => s['Speed (KM/H)'])),
    fh_contact_z: round1(avg(jdFH.map(s => s['Hit (z)']))),
    bh_contact_z: round1(avg(jdBH.map(s => s['Hit (z)']))),
  }

  // ── JD aggregate shot stats ────────────────────────────────────────────────
  const serve = {
    first: computeServe(jdShots, 'first_serve'),
    second: computeServe(jdShots, 'second_serve'),
  }
  const returnStats = {
    first: computeReturn(jdShots, 'first_return'),
    second: computeReturn(jdShots, 'second_return'),
  }
  const forehand = computeGroundstroke(jdShots, 'Forehand')
  const backhand = computeGroundstroke(jdShots, 'Backhand')

  // ── Opponent stats ─────────────────────────────────────────────────────────
  const goTotal = oppShots.length
  const opp_shots: any = {
    serve: { first: computeServe(oppShots, 'first_serve'), second: computeServe(oppShots, 'second_serve') },
    return: { first: computeReturn(oppShots, 'first_return'), second: computeReturn(oppShots, 'second_return') },
    forehand: computeGroundstroke(oppShots, 'Forehand'),
    backhand: computeGroundstroke(oppShots, 'Backhand'),
    stats: {
      aces: G(19), service_winners: G(20),
      winners: G(20) + G(21) + G(22), fh_winners: G(21), bh_winners: G(22),
      ue: G(23) + G(24), fh_ue: G(23), bh_ue: G(24),
      df: pointsRaw.filter(p => p.Detail === 'Double Fault' && p['Match Server'] === 'guest').length,
      s1_in_n: G(1), s1_in_total: G(0),
      s2_in_n: G(4), s2_in_total: G(3),
      serve_pts_won_n: oppServingWon.length, serve_pts_won_total: jdReturning.length,
      serve_pts_won_pct: pct(oppServingWon.length, jdReturning.length),
      s1_pts_won_n: G(2), s1_pts_won_total: G(1), s1_pts_won_pct: pct(G(2), G(1)),
      s2_pts_won_n: G(5), s2_pts_won_total: G(4), s2_pts_won_pct: pct(G(5), G(4)),
      return_pts_won_n: jdServing.length - jdServingWon.length,
      return_pts_won_total: jdServing.length,
      return_pts_won_pct: pct(jdServing.length - jdServingWon.length, jdServing.length),
      ret1_pts_won_n: G(9), ret1_pts_won_total: H(0), ret1_pts_won_pct: pct(G(9), H(0)),
      ret2_pts_won_n: G(11), ret2_pts_won_total: H(3), ret2_pts_won_pct: pct(G(11), H(3)),
      total_pts_won_n: pointsRaw.length - (jdServingWon.length + jdReturningWon.length),
      total_pts_won_total: pointsRaw.length,
      total_pts_won_pct: pct(pointsRaw.length - (jdServingWon.length + jdReturningWon.length), pointsRaw.length),
      bp_saved_n: bpOpps.filter(p => p['Point Winner'] === 'guest').length,
      bp_saved_total: bpOpps.length,
      bp_saved_pct: pct(bpOpps.filter(p => p['Point Winner'] === 'guest').length, bpOpps.length),
      bp_won_n: bpFaced.filter(p => p['Point Winner'] === 'guest').length,
      bp_won_total: bpFaced.length,
      bp_won_pct: pct(bpFaced.filter(p => p['Point Winner'] === 'guest').length, bpFaced.length),
      max_ball_spd: Math.max(0, ...oppShots.map(s => s['Speed (KM/H)'] || 0)) || null,
    },
    distribution: {
      total_shots: goTotal,
      fh_pct: pct(oppShots.filter(s => s.Stroke === 'Forehand').length, goTotal),
      bh_pct: pct(oppShots.filter(s => s.Stroke === 'Backhand').length, goTotal),
      flat_pct: pct(oppShots.filter(s => s.Spin === 'Flat').length, goTotal),
      topspin_pct: pct(oppShots.filter(s => s.Spin === 'Topspin').length, goTotal),
      slice_pct: pct(oppShots.filter(s => s.Spin === 'Slice').length, goTotal),
    },
  }

  // ── Shot rows for match_shots table ───────────────────────────────────────
  const shotsRows = shotsRaw.map((s: any) => ({
    player: s.Player === jdName ? 'jd' : 'opponent',
    shot_number: s.Shot ?? null,
    shot_type: s.Type ?? null,
    stroke: s.Stroke ?? null,
    spin: s.Spin ?? null,
    speed_kmh: s['Speed (KM/H)'] ?? null,
    point_number: s.Point ?? null,
    game_number: s.Game ?? null,
    set_number: s.Set ?? null,
    bounce_depth: s['Bounce Depth'] ?? null,
    bounce_zone: s['Bounce Zone'] ?? null,
    bounce_x: s['Bounce (x)'] ?? null,
    bounce_y: s['Bounce (y)'] ?? null,
    hit_x: s['Hit (x)'] ?? null,
    hit_y: s['Hit (y)'] ?? null,
    hit_z: s['Hit (z)'] ?? null,
    direction: s.Direction !== '---' ? (s.Direction ?? null) : null,
    result: s.Result ?? null,
    video_time: s['Video Time'] ?? null,
  }))

  // ── Point rows for match_points table ────────────────────────────────────
  const pointsRows = pointsRaw.map((p: any) => ({
    point_number: p.Point ?? null,
    game_number: p.Game ?? null,
    set_number: p.Set ?? null,
    serve_state: p['Serve State'] ?? null,
    server: p['Match Server'] === 'host' ? 'jd' : 'opponent',
    jd_game_score: p['Host Game Score'] != null ? String(p['Host Game Score']) : null,
    opp_game_score: p['Guest Game Score'] != null ? String(p['Guest Game Score']) : null,
    point_winner: p['Point Winner'] === 'host' ? 'jd' : 'opponent',
    detail: p.Detail ?? null,
    break_point: p['Break Point'] === true,
    set_point: p['Set Point'] === true,
    duration_seconds: p.Duration ?? null,
    video_time: p['Video Time'] ?? null,
  }))

  const score = computeScore(pointsRaw)

  return {
    matchData: { serve, return: returnStats, forehand, backhand, shot_stats, opp_shots, score, oppName },
    shotsRows,
    pointsRows,
    settings: { jdName, oppName },
    meta: { totalShots: shotsRaw.length, totalPoints: pointsRaw.length },
  }
}
