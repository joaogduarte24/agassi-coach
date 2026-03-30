// parseSwingVision.ts — server-side only (API routes)
// Parses a SwingVision .xlsx export into structured match data + shot/point rows

import * as XLSX from 'xlsx'

const JD_NAME = 'João Duarte'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function avg(arr: number[]): number | null {
  const v = arr.filter(x => typeof x === 'number' && !isNaN(x) && x > 0)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

function pct(n: number, total: number): number | null {
  return total > 0 ? Math.round((n / total) * 100) : null
}

function round1(n: number | null): number | null {
  return n != null ? Math.round(n * 10) / 10 : null
}

function std(arr: number[]): number | null {
  const v = arr.filter(x => typeof x === 'number' && !isNaN(x) && x > 0)
  if (v.length < 2) return null
  const mean = v.reduce((a, b) => a + b, 0) / v.length
  return Math.round(Math.sqrt(v.reduce((acc, x) => acc + (x - mean) ** 2, 0) / v.length))
}

function isBool(v: any): boolean {
  return v === 'true' || v === 'false' || v === true || v === false
}

// Court y-axis: 0 = near baseline, 23.77 = far baseline, net ≈ 11.885
// Service lines at ≈6.4 (near) and ≈17.37 (far)
// "Deep" = landed within ~2m of either baseline (works for both JD and opponent shots)
function isDeep(s: Shot): boolean {
  if (s.bounce_y == null) return false
  return s.bounce_y > 17.37 || s.bounce_y < 6.4
}

function toBool(v: any): boolean {
  return v === 'true' || v === true
}

// ─── SHOT NORMALIZATION ───────────────────────────────────────────────────────
// Shots sheet positional mapping (header:1):
// [0]=shot_type  [1]=shot_number  [2]=spin        [5]=speed_kmh
// [6]=point_n    [7]=game_n       [8]=set_n        [9]=bounce_side
// [10]=bounce_depth  [11]=bounce_zone  [12]=bounce_x  [13]=bounce_y
// [15]=direction [16]=result      [17]=hit_x       [18]=hit_y  [19]=hit_z
// [20]=favorited [21]=start_time  [22]=player_name [23]=shot_context [24]=video_time

interface Shot {
  player:        string
  shot_type:     string
  shot_number:   number | null
  spin:          string | null
  speed:         number | null
  point_n:       number
  game_n:        number
  set_n:         number
  bounce_side:   string | null
  bounce_depth:  string | null
  bounce_zone:   string | null
  bounce_x:      number | null
  bounce_y:      number | null
  direction:     string | null
  result:        string | null
  hit_x:         number | null
  hit_y:         number | null
  hit_z:         number | null
  shot_context:  string | null
  video_time:    number | null
}

function normalizeShot(row: any[]): Shot | null {
  if (!Array.isArray(row) || typeof row[22] !== 'string') return null
  if (typeof row[6] !== 'number') return null // must have point number
  if (row[0] === 'Feed') return null           // warm-up/feed shots — exclude
  const dir = row[15]
  return {
    player:       row[22],
    shot_type:    row[0]  ?? null,
    shot_number:  typeof row[1]  === 'number' ? row[1]  : null,
    spin:         row[2]  ?? null,
    speed:        typeof row[5]  === 'number' ? row[5]  : null,
    point_n:      row[6],
    game_n:       row[7]  ?? null,
    set_n:        row[8]  ?? null,
    bounce_side:  row[9]  ?? null,
    bounce_depth: row[10] ?? null,
    bounce_zone:  row[11] ?? null,
    bounce_x:     typeof row[12] === 'number' ? row[12] : null,
    bounce_y:     typeof row[13] === 'number' ? row[13] : null,
    direction:    typeof dir === 'string' && dir !== '---' ? dir : null,
    result:       row[16] ?? null,
    hit_x:        typeof row[17] === 'number' ? row[17] : null,
    hit_y:        typeof row[18] === 'number' ? row[18] : null,
    hit_z:        typeof row[19] === 'number' ? row[19] : null,
    shot_context: row[23] ?? null,
    video_time:   typeof row[24] === 'number' ? row[24] : null,
  }
}

// ─── POINT NORMALIZATION (scan-based) ────────────────────────────────────────
// Points rows have variable width due to missing game score cells.
// We scan for known value patterns rather than fixed positions.

interface Point {
  point_n:     number
  game_n:      number
  set_n:       number
  host_score:  string | null
  guest_score: string | null
  server:      string | null   // 'host' | 'guest'
  detail:      string | null
  bp:          boolean
  sp:          boolean
  serve_state: string | null   // 'first' | 'second'
  winner:      string | null   // 'host' | 'guest'
  duration:    number | null
}

const GAME_SCORES = new Set(['0', '15', '30', '40', 'Ad', 'AD'])
const DETAIL_PATTERNS = ['Winner', 'Error', 'Fault', 'Ace', 'Overhead', 'Drop Shot']

function normalizePoint(row: any[]): Point | null {
  if (!Array.isArray(row) || row.length < 10) return null
  if (typeof row[0] !== 'number' || typeof row[1] !== 'number') return null

  const end = row.length - 3 // exclude VideoTime and Duration at tail

  // Server = FIRST 'host'|'guest' in row; Winner = LAST 'host'|'guest' in row
  // Rows have variable column ordering due to missing cells, but first=server and
  // last=winner holds across all observed structures in SwingVision exports.
  let server: string | null = null
  let winner: string | null = null
  for (let i = 3; i <= end; i++) {
    if (row[i] === 'host' || row[i] === 'guest') { server = row[i]; break }
  }
  for (let i = end; i >= 3; i--) {
    if (row[i] === 'host' || row[i] === 'guest') { winner = row[i]; break }
  }

  if (!server || !winner) return null

  // Game scores: first two consecutive game-score strings anywhere in the row
  let hostScore: string | null = null
  let guestScore: string | null = null
  for (let i = 3; i <= end; i++) {
    if (typeof row[i] === 'string' && GAME_SCORES.has(row[i])) {
      if (!hostScore) hostScore = row[i]
      else if (!guestScore) { guestScore = row[i]; break }
    }
  }

  // Detail: first detail-pattern string anywhere in the row
  let detail: string | null = null
  for (let i = 3; i <= end; i++) {
    if (typeof row[i] === 'string' && DETAIL_PATTERNS.some(p => row[i].includes(p))) {
      detail = row[i]; break
    }
  }

  // BP / SP: first pair of consecutive boolean values
  let bp = false, sp = false
  for (let i = 3; i <= end; i++) {
    if (isBool(row[i]) && isBool(row[i + 1])) {
      bp = toBool(row[i])
      sp = toBool(row[i + 1])
      break
    }
  }

  // Serve state: first 'first'|'second' string anywhere in the row
  let serve_state: string | null = null
  for (let i = 3; i <= end; i++) {
    if (row[i] === 'first' || row[i] === 'second') { serve_state = row[i]; break }
  }

  // Duration: last numeric value in row
  let duration: number | null = null
  if (typeof row[row.length - 1] === 'number') duration = row[row.length - 1]

  return {
    point_n:     row[0],
    game_n:      row[1],
    set_n:       row[2],
    host_score:  hostScore,
    guest_score: guestScore,
    server,
    detail,
    bp,
    sp,
    serve_state,
    winner,
    duration,
  }
}

// ─── SERVE STATS ──────────────────────────────────────────────────────────────
function computeServe(serves: Shot[]) {
  const deuce = serves.filter(s => s.bounce_zone === 'deuce')
  const ad    = serves.filter(s => s.bounce_zone === 'ad')
  const dIn   = deuce.filter(s => s.result === 'In')
  const aIn   = ad.filter(s => s.result === 'In')
  return {
    pct_deuce: pct(dIn.length, deuce.length),
    pct_ad:    pct(aIn.length, ad.length),
    spd_deuce: round1(avg(dIn.map(s => s.speed!))),
    spd_ad:    round1(avg(aIn.map(s => s.speed!))),
  }
}

// ─── RETURN STATS ─────────────────────────────────────────────────────────────
// Returns are FH/BH shots with shot_context 'first_return' or 'second_return'
function computeReturn(returns: Shot[]) {
  const deuce = returns.filter(s => s.bounce_zone === 'deuce')
  const ad    = returns.filter(s => s.bounce_zone === 'ad')
  const dIn   = deuce.filter(s => s.result === 'In')
  const aIn   = ad.filter(s => s.result === 'In')
  const dDeep = dIn.filter(s => isDeep(s))
  const aDeep = aIn.filter(s => isDeep(s))
  return {
    pct_deuce:  pct(dIn.length, deuce.length),
    pct_ad:     pct(aIn.length, ad.length),
    spd_deuce:  round1(avg(dIn.map(s => s.speed!))),
    spd_ad:     round1(avg(aIn.map(s => s.speed!))),
    deep_deuce: pct(dDeep.length, dIn.length),
    deep_ad:    pct(aDeep.length, aIn.length),
  }
}

// ─── GROUNDSTROKE STATS ───────────────────────────────────────────────────────
function computeGroundstroke(shots: Shot[], stroke: 'Forehand' | 'Backhand') {
  const gs = shots.filter(s => s.shot_type === stroke)
  if (!gs.length) return { cc_in: null, dtl_in: null, spd_cc: null, spd_dtl: null, depth_cc: null, depth_dtl: null }

  const CC_DIRS  = new Set(['cross court', 'inside out'])
  const DTL_DIRS = new Set(['down the line', 'inside in'])

  const cc  = gs.filter(s => s.direction && CC_DIRS.has(s.direction))
  const dtl = gs.filter(s => s.direction && DTL_DIRS.has(s.direction))
  const ccIn  = cc.filter(s => s.result === 'In')
  const dtlIn = dtl.filter(s => s.result === 'In')
  const ccDeep  = ccIn.filter(s => isDeep(s))
  const dtlDeep = dtlIn.filter(s => isDeep(s))

  return {
    cc_in:    pct(ccIn.length, cc.length),
    dtl_in:   pct(dtlIn.length, dtl.length),
    spd_cc:   round1(avg(ccIn.map(s => s.speed!))),
    spd_dtl:  round1(avg(dtlIn.map(s => s.speed!))),
    depth_cc:  pct(ccDeep.length, ccIn.length),
    depth_dtl: pct(dtlDeep.length, dtlIn.length),
  }
}

// ─── MAIN PARSER ──────────────────────────────────────────────────────────────
export function parseSwingVisionXlsx(buffer: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })

  // ── 1. Settings → oppName ──────────────────────────────────────────────────
  const settingsArr = XLSX.utils.sheet_to_json(wb.Sheets['Settings'], { header: 1 }) as any[][]
  const settingsRow = settingsArr[1] || []
  const hostTeam  = settingsRow[3] as string | null
  const guestTeam = settingsRow[4] as string | null
  const oppName   = (hostTeam !== JD_NAME ? hostTeam : guestTeam) ?? 'Opponent'

  // ── 2. Normalize shots ─────────────────────────────────────────────────────
  const shotsRaw  = XLSX.utils.sheet_to_json(wb.Sheets['Shots'],  { header: 1 }) as any[][]
  const pointsRaw = XLSX.utils.sheet_to_json(wb.Sheets['Points'], { header: 1 }) as any[][]

  const shots:  Shot[]  = []
  const points: Point[] = []

  const validPlayers = new Set([JD_NAME, oppName])
  for (let i = 1; i < shotsRaw.length; i++) {
    const s = normalizeShot(shotsRaw[i])
    if (s && validPlayers.has(s.player)) shots.push(s)
  }
  for (let i = 1; i < pointsRaw.length; i++) {
    const p = normalizePoint(pointsRaw[i])
    if (p) points.push(p)
  }

  // ── 3. Determine jdRole (host|guest) in Points encoding ───────────────────
  // Cross-ref: find first JD serve shot → look up its point in Points → read server
  let jdRole: 'host' | 'guest' = 'host'
  const firstJdServe = shots.find(s => s.player === JD_NAME && s.shot_type === 'Serve')
  if (firstJdServe) {
    const servePoint = points.find(p => p.point_n === firstJdServe.point_n)
    if (servePoint?.server === 'host' || servePoint?.server === 'guest') {
      jdRole = servePoint.server as 'host' | 'guest'
    }
  }
  const oppRole = jdRole === 'host' ? 'guest' : 'host'

  // ── 4. Split shots by player ───────────────────────────────────────────────
  const jdShots  = shots.filter(s => s.player === JD_NAME)
  const oppShots = shots.filter(s => s.player !== JD_NAME)

  // ── 5. Classify JD serves as first / second by sequence within point ───────
  // Group JD serve shots by point number; first in array = first serve, second = second serve
  const jdServesByPoint = new Map<number, Shot[]>()
  for (const s of jdShots.filter(s => s.shot_type === 'Serve')) {
    const arr = jdServesByPoint.get(s.point_n) ?? []
    arr.push(s)
    jdServesByPoint.set(s.point_n, arr)
  }
  const jdFirstServes  = Array.from(jdServesByPoint.values()).map(a => a[0])
  const jdSecondServes = Array.from(jdServesByPoint.values()).flatMap(a => a.length > 1 ? [a[1]] : [])

  // Same for opponent serves
  const oppServesByPoint = new Map<number, Shot[]>()
  for (const s of oppShots.filter(s => s.shot_type === 'Serve')) {
    const arr = oppServesByPoint.get(s.point_n) ?? []
    arr.push(s)
    oppServesByPoint.set(s.point_n, arr)
  }
  const oppFirstServes  = Array.from(oppServesByPoint.values()).map(a => a[0])
  const oppSecondServes = Array.from(oppServesByPoint.values()).flatMap(a => a.length > 1 ? [a[1]] : [])

  // ── 6. Return shots (by rally position) ───────────────────────────────────
  // Returns are identified as the first non-serve shot from the returner in each point.
  // ctx='first_return' on SERVE shots means "this serve was returned" — NOT the return itself.
  // Returns that go out/net end the point and get ctx='first_serve'/'second_serve', not
  // 'serve_plus_one', so ctx-based filtering has survivor bias (inflated in-rate).
  // Fix: group shots by point, find the first shot from each player, use Points for serve state.

  // Build point_n → serve_state map from Points sheet (reliable denominator for 1st/2nd)
  const pointServeState = new Map<number, string>()
  for (const p of points) {
    if (p.serve_state) pointServeState.set(p.point_n, p.serve_state)
  }

  // Group shots by point, sorted by shot_number within each point
  const shotsByPoint = new Map<number, Shot[]>()
  for (const s of shots) {
    const arr = shotsByPoint.get(s.point_n) ?? []
    arr.push(s)
    shotsByPoint.set(s.point_n, arr)
  }
  for (const arr of Array.from(shotsByPoint.values())) {
    arr.sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))
  }

  const jdFirstReturns:   Shot[] = []
  const jdSecondReturns:  Shot[] = []
  const oppFirstReturns:  Shot[] = []
  const oppSecondReturns: Shot[] = []

  for (const [point_n, shotArr] of Array.from(shotsByPoint.entries())) {
    const firstShot = shotArr[0]
    // Only process points where first tracked shot is a serve
    if (!firstShot || firstShot.shot_type !== 'Serve') continue

    const serveState = pointServeState.get(point_n) ?? 'first'

    if (firstShot.player !== JD_NAME) {
      // Opponent serving → JD's first non-serve shot is the return
      const jdReturn = shotArr.find(s => s.player === JD_NAME)
      if (jdReturn) {
        if (serveState === 'first') jdFirstReturns.push(jdReturn)
        else jdSecondReturns.push(jdReturn)
      }
    } else {
      // JD serving → opponent's first non-serve shot is the return
      const oppReturn = shotArr.find(s => s.player !== JD_NAME)
      if (oppReturn) {
        if (serveState === 'first') oppFirstReturns.push(oppReturn)
        else oppSecondReturns.push(oppReturn)
      }
    }
  }

  // ── 7. Point-level stats ───────────────────────────────────────────────────
  const jdServing      = points.filter(p => p.server === jdRole)
  const jdReturning    = points.filter(p => p.server === oppRole)
  const jdServeWon     = jdServing.filter(p => p.winner === jdRole)
  const jdReturnWon    = jdReturning.filter(p => p.winner === jdRole)
  const oppServeWon    = jdReturning.filter(p => p.winner === oppRole)

  const s1Points  = jdServing.filter(p => p.serve_state === 'first')
  const s2Points  = jdServing.filter(p => p.serve_state === 'second')
  const r1Points  = jdReturning.filter(p => p.serve_state === 'first')
  const r2Points  = jdReturning.filter(p => p.serve_state === 'second')

  const s1Won  = s1Points.filter(p => p.winner === jdRole)
  const s2Won  = s2Points.filter(p => p.winner === jdRole)
  const r1Won  = r1Points.filter(p => p.winner === jdRole)
  const r2Won  = r2Points.filter(p => p.winner === jdRole)

  const bpFaced = jdServing.filter(p => p.bp)
  const bpSaved = bpFaced.filter(p => p.winner === jdRole)
  const bpOpps  = jdReturning.filter(p => p.bp)
  const bpWon   = bpOpps.filter(p => p.winner === jdRole)

  // Detail-based stats — attributed by who won/served
  const aces            = jdServing.filter(p => p.detail?.includes('Ace'))
  const df              = jdServing.filter(p => p.detail?.includes('Fault'))
  const jdWinnerPts     = points.filter(p => p.winner === jdRole && p.detail?.includes('Winner') && !p.detail?.includes('Service'))
  const jdServiceWinners = jdServing.filter(p => p.detail?.includes('Service Winner') || p.detail?.includes('Service winner'))
  const jdFHWinners     = jdWinnerPts.filter(p => p.detail?.startsWith('Forehand'))
  const jdBHWinners     = jdWinnerPts.filter(p => p.detail?.startsWith('Backhand'))
  const jdUEPts         = points.filter(p => p.winner === oppRole && p.detail?.includes('Unforced Error'))
  const jdFHUE          = jdUEPts.filter(p => p.detail?.startsWith('Forehand'))
  const jdBHUE          = jdUEPts.filter(p => p.detail?.startsWith('Backhand'))

  const oppAces         = jdReturning.filter(p => p.detail?.includes('Ace'))
  const oppDF           = jdReturning.filter(p => p.detail?.includes('Fault'))
  const oppWinnerPts    = points.filter(p => p.winner === oppRole && p.detail?.includes('Winner') && !p.detail?.includes('Service'))
  const oppServiceWinners = jdReturning.filter(p => p.detail?.includes('Service Winner') || p.detail?.includes('Service winner'))
  const oppFHWinners    = oppWinnerPts.filter(p => p.detail?.startsWith('Forehand'))
  const oppBHWinners    = oppWinnerPts.filter(p => p.detail?.startsWith('Backhand'))
  const oppUEPts        = points.filter(p => p.winner === jdRole && p.detail?.includes('Unforced Error'))
  const oppFHUE         = oppUEPts.filter(p => p.detail?.startsWith('Forehand'))
  const oppBHUE         = oppUEPts.filter(p => p.detail?.startsWith('Backhand'))

  // ── 8. Rally length ────────────────────────────────────────────────────────
  const rallyMap = new Map<string, number>()
  for (const s of shots) {
    const key = `${s.set_n}-${s.game_n}-${s.point_n}`
    rallyMap.set(key, (rallyMap.get(key) ?? 0) + 1)
  }
  const rallies       = Array.from(rallyMap.values())
  const rallyMean     = avg(rallies)
  const rallyShortN   = rallies.filter(r => r <= 3).length
  const rallyLongN    = rallies.filter(r => r >= 7).length

  // ── 9. Serve direction ─────────────────────────────────────────────────────
  const s1In      = jdFirstServes.filter(s => s.result === 'In')
  const s1T       = s1In.filter(s => s.direction === 'down the T').length
  const s1Wide    = s1In.filter(s => s.direction === 'out wide').length
  const jdS1Plus1 = jdShots.filter(s => s.shot_context === 'serve_plus_one')
  const s1After   = jdS1Plus1.filter(s => s.direction === 'down the line' || s.direction === 'inside in').length

  // ── 10. Shot distribution ──────────────────────────────────────────────────
  const jdTotal  = jdShots.length
  const oppTotal = oppShots.length
  const maxSpd   = Math.max(0, ...jdShots.map(s => s.speed ?? 0))
  const oppMaxSpd = Math.max(0, ...oppShots.map(s => s.speed ?? 0))

  const jdFH  = jdShots.filter(s => s.shot_type === 'Forehand'  && s.result === 'In')
  const jdBH  = jdShots.filter(s => s.shot_type === 'Backhand'  && s.result === 'In')

  // ── 11. Aggregate shot_stats (JD) ─────────────────────────────────────────
  const shot_stats = {
    aces:                aces.length,
    service_winners:     jdServiceWinners.length,
    winners:             jdWinnerPts.length + jdServiceWinners.length,
    fh_winners:          jdFHWinners.length,
    bh_winners:          jdBHWinners.length,
    ue:                  jdUEPts.length,
    fh_ue:               jdFHUE.length,
    bh_ue:               jdBHUE.length,
    df:                  df.length,
    s1_in_n:             jdFirstServes.filter(s => s.result === 'In').length,
    s1_in_total:         jdServing.length,     // every point has a 1st serve attempt (Points sheet)
    s2_in_n:             jdSecondServes.filter(s => s.result === 'In').length,
    s2_in_total:         s2Points.length,      // points that reached 2nd serve (Points sheet)
    serve_pts_won_n:     jdServeWon.length,
    serve_pts_won_total: jdServing.length,
    serve_pts_won_pct:   pct(jdServeWon.length, jdServing.length),
    s1_pts_won_n:        s1Won.length,
    s1_pts_won_total:    s1Points.length,
    s1_pts_won_pct:      pct(s1Won.length, s1Points.length),
    s2_pts_won_n:        s2Won.length,
    s2_pts_won_total:    s2Points.length,
    s2_pts_won_pct:      pct(s2Won.length, s2Points.length),
    return_pts_won_n:    jdReturnWon.length,
    return_pts_won_total: jdReturning.length,
    return_pts_won_pct:  pct(jdReturnWon.length, jdReturning.length),
    ret1_pts_won_n:      r1Won.length,
    ret1_pts_won_total:  r1Points.length,
    ret1_pts_won_pct:    pct(r1Won.length, r1Points.length),
    ret2_pts_won_n:      r2Won.length,
    ret2_pts_won_total:  r2Points.length,
    ret2_pts_won_pct:    pct(r2Won.length, r2Points.length),
    total_pts_won_n:     jdServeWon.length + jdReturnWon.length,
    total_pts_won_total: points.length,
    total_pts_won_pct:   pct(jdServeWon.length + jdReturnWon.length, points.length),
    bp_saved_n:          bpSaved.length,
    bp_saved_total:      bpFaced.length,
    bp_saved_pct:        pct(bpSaved.length, bpFaced.length),
    bp_won_n:            bpWon.length,
    bp_won_total:        bpOpps.length,
    bp_won_pct:          pct(bpWon.length, bpOpps.length),
    max_ball_spd:        maxSpd > 0 ? Math.round(maxSpd) : null,
    total_shots:         jdTotal,
    fh_pct:              pct(jdShots.filter(s => s.shot_type === 'Forehand').length, jdTotal),
    bh_pct:              pct(jdShots.filter(s => s.shot_type === 'Backhand').length, jdTotal),
    volley_pct:          pct(jdShots.filter(s => s.shot_type === 'Volley').length, jdTotal),
    flat_pct:            pct(jdShots.filter(s => s.spin === 'Flat').length, jdTotal),
    topspin_pct:         pct(jdShots.filter(s => s.spin === 'Topspin').length, jdTotal),
    slice_pct:           pct(jdShots.filter(s => s.spin === 'Slice').length, jdTotal),
    rally_mean:          round1(rallyMean),
    rally_pct_short:     pct(rallyShortN, rallies.length),
    rally_pct_long:      pct(rallyLongN, rallies.length),
    s1_t_pct:            pct(s1T, s1In.length),
    s1_wide_pct:         pct(s1Wide, s1In.length),
    s1_after_dtl_pct:    pct(s1After, jdS1Plus1.length),
    fh_spd_std:          std(jdFH.map(s => s.speed!)),
    fh_contact_z:        round1(avg(jdFH.map(s => s.hit_z!))),
    bh_contact_z:        round1(avg(jdBH.map(s => s.hit_z!))),
  }

  // ── 12. JD serve/return/forehand/backhand ──────────────────────────────────
  const serve = {
    first:  computeServe(jdFirstServes),
    second: computeServe(jdSecondServes),
  }
  const returnStats = {
    first:  computeReturn(jdFirstReturns),
    second: computeReturn(jdSecondReturns),
  }
  const forehand = computeGroundstroke(jdShots, 'Forehand')
  const backhand = computeGroundstroke(jdShots, 'Backhand')

  // ── 13. Opponent aggregate stats ──────────────────────────────────────────
  const opp_shots = {
    serve: {
      first:  computeServe(oppFirstServes),
      second: computeServe(oppSecondServes),
    },
    return: {
      first:  computeReturn(oppFirstReturns),
      second: computeReturn(oppSecondReturns),
    },
    forehand: computeGroundstroke(oppShots, 'Forehand'),
    backhand: computeGroundstroke(oppShots, 'Backhand'),
    stats: {
      aces:                oppAces.length,
      service_winners:     oppServiceWinners.length,
      winners:             oppWinnerPts.length + oppServiceWinners.length,
      fh_winners:          oppFHWinners.length,
      bh_winners:          oppBHWinners.length,
      ue:                  oppUEPts.length,
      fh_ue:               oppFHUE.length,
      bh_ue:               oppBHUE.length,
      df:                  oppDF.length,
      s1_in_n:             oppFirstServes.filter(s => s.result === 'In').length,
      s1_in_total:         oppFirstServes.length,
      s2_in_n:             oppSecondServes.filter(s => s.result === 'In').length,
      s2_in_total:         oppSecondServes.length,
      serve_pts_won_n:     oppServeWon.length,
      serve_pts_won_total: jdReturning.length,
      serve_pts_won_pct:   pct(oppServeWon.length, jdReturning.length),
      return_pts_won_n:    jdServing.length - jdServeWon.length,
      return_pts_won_total: jdServing.length,
      return_pts_won_pct:  pct(jdServing.length - jdServeWon.length, jdServing.length),
      total_pts_won_n:     points.length - (jdServeWon.length + jdReturnWon.length),
      total_pts_won_total: points.length,
      total_pts_won_pct:   pct(points.length - (jdServeWon.length + jdReturnWon.length), points.length),
      bp_saved_n:          bpOpps.filter(p => p.winner === oppRole).length,
      bp_saved_total:      bpOpps.length,
      bp_saved_pct:        pct(bpOpps.filter(p => p.winner === oppRole).length, bpOpps.length),
      bp_won_n:            bpFaced.filter(p => p.winner === oppRole).length,
      bp_won_total:        bpFaced.length,
      bp_won_pct:          pct(bpFaced.filter(p => p.winner === oppRole).length, bpFaced.length),
      max_ball_spd:        oppMaxSpd > 0 ? Math.round(oppMaxSpd) : null,
    },
    distribution: {
      total_shots:      oppTotal,
      fh_pct:           pct(oppShots.filter(s => s.shot_type === 'Forehand').length, oppTotal),
      bh_pct:           pct(oppShots.filter(s => s.shot_type === 'Backhand').length, oppTotal),
      first_serve_pct:  pct(oppFirstServes.filter(s => s.result === 'In').length, oppFirstServes.length),
      second_serve_pct: pct(oppSecondServes.filter(s => s.result === 'In').length, oppSecondServes.length),
      volley_pct:       pct(oppShots.filter(s => s.shot_type === 'Volley').length, oppTotal),
      flat_pct:         pct(oppShots.filter(s => s.spin === 'Flat').length, oppTotal),
      topspin_pct:      pct(oppShots.filter(s => s.spin === 'Topspin').length, oppTotal),
      slice_pct:        pct(oppShots.filter(s => s.spin === 'Slice').length, oppTotal),
    },
  }

  // ── 14. DB rows for match_shots ────────────────────────────────────────────
  const shotsRows = shots.map(s => ({
    player:       s.player === JD_NAME ? 'jd' : 'opponent',
    shot_number:  s.shot_number,
    shot_type:    s.shot_type,
    stroke:       s.shot_type,   // same field, keep column populated
    spin:         s.spin,
    speed_kmh:    s.speed,
    point_number: s.point_n,
    game_number:  s.game_n,
    set_number:   s.set_n,
    bounce_depth: s.bounce_depth,
    bounce_zone:  s.bounce_zone,
    bounce_x:     s.bounce_x,
    bounce_y:     s.bounce_y,
    direction:    s.direction,
    result:       s.result,
    hit_x:        s.hit_x,
    hit_y:        s.hit_y,
    hit_z:        s.hit_z,
    shot_context: s.shot_context,
    video_time:   s.video_time,
  }))

  // ── 15. DB rows for match_points ──────────────────────────────────────────
  const pointsRows = points.map(p => ({
    point_number:  p.point_n,
    game_number:   p.game_n,
    set_number:    p.set_n,
    serve_state:   p.serve_state,
    server:        p.server === jdRole ? 'jd' : 'opponent',
    jd_game_score: p.server === jdRole
      ? (jdRole === 'host' ? p.host_score : p.guest_score)
      : (jdRole === 'host' ? p.guest_score : p.host_score),
    opp_game_score: p.server === jdRole
      ? (jdRole === 'host' ? p.guest_score : p.host_score)
      : (jdRole === 'host' ? p.host_score : p.guest_score),
    point_winner:  p.winner === jdRole ? 'jd' : 'opponent',
    detail:        p.detail,
    break_point:   p.bp,
    set_point:     p.sp,
    duration_seconds: p.duration,
  }))

  return {
    matchData: { serve, return: returnStats, forehand, backhand, shot_stats, opp_shots, oppName },
    shotsRows,
    pointsRows,
    settings: { jdName: JD_NAME, oppName, jdRole },
    meta: { totalShots: shots.length, totalPoints: points.length },
  }
}
