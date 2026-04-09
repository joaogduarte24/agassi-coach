/**
 * Shot pattern aggregation for §5 "Your moves".
 *
 * Walks raw `match_shots` rows for matches with `has_shot_data=true`,
 * identifies winner shots by JD (`player='jd'`, `result='In'`, point won by JD),
 * and grabs the prior 1–2 strokes to build N-shot patterns.
 *
 * Returns the top patterns by frequency, with star marker on the dominant one.
 *
 * NOTE: Walking shots requires either pre-fetching shots for ALL matches
 * (expensive) or scoping to a recent subset. v1 expects the caller to fetch
 * shots for a chosen set of matches and pass them in. The function is pure.
 */

export type ShotRow = {
  match_id: string
  player: 'jd' | 'opponent'
  shot_number: number
  shot_type: string | null
  stroke: string | null
  speed_kmh: number | null
  point_number: number
  game_number: number
  set_number: number
  direction: string | null   // 'cross court' | 'down the line' | 'out wide' | 'down the T'
  result: string | null      // 'In' | 'Out' | 'Net' | 'Winner' (varies by export)
  shot_context: string | null
}

export type Pattern = {
  label: string              // "FH CC → FH DTL"
  steps: string[]            // ['FH CC', 'FH DTL']
  count: number              // how many times this exact sequence ended in a JD winner
  pctOfWinners: number       // 0..100
  star: boolean              // top pattern
  desc?: string              // optional human description
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function abbrevDirection(d: string | null): string {
  if (!d) return ''
  const lower = d.toLowerCase()
  if (lower.includes('cross')) return 'CC'
  if (lower.includes('down the line') || lower.includes('dtl')) return 'DTL'
  if (lower.includes('wide')) return 'WIDE'
  if (lower.includes('down the t') || lower === 't') return 'T'
  if (lower.includes('inside')) return 'INSIDE'
  return d.toUpperCase().slice(0, 4)
}

function abbrevStroke(stroke: string | null, type: string | null): string {
  const s = (stroke || type || '').toLowerCase()
  if (s.includes('serve')) return 'Serve'
  if (s.includes('forehand') || s.startsWith('fh')) return 'FH'
  if (s.includes('backhand') || s.startsWith('bh')) return 'BH'
  if (s.includes('volley')) return 'V'
  if (s.includes('overhead') || s.includes('smash')) return 'OH'
  return s.slice(0, 2).toUpperCase() || '?'
}

function shotKey(row: ShotRow): string {
  const stroke = abbrevStroke(row.stroke, row.shot_type)
  const dir = abbrevDirection(row.direction)
  return dir ? `${stroke} ${dir}` : stroke
}

function isWinner(row: ShotRow): boolean {
  if (row.player !== 'jd') return false
  const r = (row.result || '').toLowerCase()
  return r === 'winner'
  // The caller is responsible for marking winner shots. The backfill route
  // and upload-csv route join match_points to find JD-won points and mark
  // the last JD 'In' shot as 'winner' before calling this function.
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Aggregate shot patterns from a flat list of shot rows.
 *
 * @param rows  All `match_shots` rows for the matches to analyze, ordered
 *              by (set, game, point, shot_number).
 * @param windowSize  How many strokes back to include in each pattern (default 2).
 * @param topN  Return top N patterns.
 */
export function computeShotPatterns(
  rows: ShotRow[],
  windowSize = 2,
  topN = 5,
): { patterns: Pattern[]; totalWinners: number; matchesAnalyzed: number } {
  if (rows.length === 0) {
    return { patterns: [], totalWinners: 0, matchesAnalyzed: 0 }
  }

  // Group by (match_id, set_number, game_number, point_number)
  const points = new Map<string, ShotRow[]>()
  for (const r of rows) {
    const key = `${r.match_id}|${r.set_number}|${r.game_number}|${r.point_number}`
    if (!points.has(key)) points.set(key, [])
    points.get(key)!.push(r)
  }

  // For each point, sort by shot_number
  const matchIds = new Set<string>()
  const counter = new Map<string, { count: number; steps: string[] }>()
  let totalWinners = 0

  for (const shots of Array.from(points.values())) {
    shots.sort((a: ShotRow, b: ShotRow) => a.shot_number - b.shot_number)
    matchIds.add(shots[0].match_id)
    // Look at the last shot — is it a JD winner?
    const last = shots[shots.length - 1]
    if (!isWinner(last)) continue

    // Walk back to grab JD's prior strokes (skip opponent shots)
    const jdShots: ShotRow[] = []
    for (let i = shots.length - 1; i >= 0 && jdShots.length < windowSize; i--) {
      if (shots[i].player === 'jd') jdShots.unshift(shots[i])
    }
    if (jdShots.length === 0) continue

    totalWinners++
    const steps = jdShots.map(shotKey)
    const label = steps.join(' → ')
    if (!counter.has(label)) counter.set(label, { count: 0, steps })
    counter.get(label)!.count++
  }

  if (totalWinners === 0) {
    return { patterns: [], totalWinners: 0, matchesAnalyzed: matchIds.size }
  }

  const patterns: Pattern[] = Array.from(counter.entries())
    .map(([label, { count, steps }]: [string, { count: number; steps: string[] }]) => ({
      label,
      steps,
      count,
      pctOfWinners: Math.round((count / totalWinners) * 100),
      star: false,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)

  if (patterns.length > 0) patterns[0].star = true

  return { patterns, totalWinners, matchesAnalyzed: matchIds.size }
}
