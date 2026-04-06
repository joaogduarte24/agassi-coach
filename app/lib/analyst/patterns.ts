// Pattern mining — derives top winning + losing pattern per stroke from
// existing match-level aggregates (no match_shots required for v1).
//
// For v1 we ship templated patterns parameterized by JD's averages and
// win-correlation. Real n-gram mining over match_shots is a v2 follow-up.

import type { Match } from '@/app/types'
import type { Insight, ShotStep, StrokeCardKey } from './types'

const COORD = 'normalized_jd_bottom' as const

// Court coordinate convention:
//   x: 0 = left sideline, 1 = right sideline
//   y: 0 = JD baseline, 1 = opponent baseline
//   service boxes: y in [0.5, 0.74], split by x at 0.5
//   For the purposes of the v1 PatternCard the geometry just needs to
//   *look right* — sequences are illustrative templates, not literal traces.

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function avgN(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

function isWin(m: Match): boolean { return m.score?.winner === 'JD' }

function correlationLift(matches: Match[], extract: (m: Match) => number | null): number | null {
  const vals = matches
    .map(m => ({ v: extract(m), w: isWin(m) }))
    .filter(x => x.v != null) as { v: number; w: boolean }[]
  if (vals.length < 4) return null
  const sorted = [...vals].sort((a, b) => a.v - b.v)
  const median = sorted[Math.floor(sorted.length / 2)].v
  const above = vals.filter(x => x.v >= median)
  const below = vals.filter(x => x.v < median)
  if (!above.length || !below.length) return null
  const winAbove = above.filter(x => x.w).length / above.length
  const winBelow = below.filter(x => x.w).length / below.length
  return Math.round((winAbove - winBelow) * 100)
}

function mkId(seed: string): string {
  return `ins_${seed}`
}

function confidenceFromN(n: number): number {
  if (n <= 2) return 0.3
  if (n <= 5) return 0.55
  if (n <= 10) return 0.72
  if (n <= 20) return 0.85
  return 0.92
}

// ─── PATTERN TEMPLATES ──────────────────────────────────────────────────────
// Each function returns 0-2 insights for its stroke (top winning + losing).

function servePatterns(matches: Match[]): Insight[] {
  const out: Insight[] = []
  const withServe = matches.filter(m => m.serve != null)
  if (withServe.length < 2) return out

  const s1Ad = avgN(withServe.map(m => m.serve?.first?.pct_ad))
  const s1Deuce = avgN(withServe.map(m => m.serve?.first?.pct_deuce))
  const spdAd = avgN(withServe.map(m => m.serve?.first?.spd_ad))
  const spdDeuce = avgN(withServe.map(m => m.serve?.first?.spd_deuce))

  const adBetter = (s1Ad ?? 0) >= (s1Deuce ?? 0)
  const winSide = adBetter ? 'ad' : 'deuce'
  const lossSide = adBetter ? 'deuce' : 'ad'
  const winPct = adBetter ? s1Ad : s1Deuce
  const lossPct = adBetter ? s1Deuce : s1Ad
  const winSpd = adBetter ? spdAd : spdDeuce

  // Winning serve pattern — wide on stronger side
  if (winPct != null) {
    const fromX = winSide === 'ad' ? 0.42 : 0.58
    const toX = winSide === 'ad' ? 0.04 : 0.96
    const toY = winSide === 'ad' ? 0.62 : 0.62
    out.push({
      id: mkId('serve_win'),
      kind: 'sequence_pattern',
      stroke: 'serve',
      name: `Wide ${winSide === 'ad' ? 'on the ad' : 'on the deuce'}`,
      verdict: 'winning',
      sequence: [
        { shot: 'serve', from: [fromX, 0], to: [toX, toY], speed: winSpd ?? null },
      ],
      coord_system: COORD,
      win_pct: Math.round(winPct),
      sample_n: withServe.length,
      confidence: confidenceFromN(withServe.length),
      blurb: `${Math.round(winPct)}% in${winSpd ? ` · ${Math.round(winSpd)} km/h` : ''} — your most reliable side`,
    })
  }

  // Losing serve pattern — second serve / weaker side
  if (lossPct != null && lossPct < (winPct ?? 100)) {
    const fromX = lossSide === 'ad' ? 0.42 : 0.58
    const toX = lossSide === 'ad' ? 0.18 : 0.82
    out.push({
      id: mkId('serve_loss'),
      kind: 'sequence_pattern',
      stroke: 'serve',
      name: `${lossSide === 'ad' ? 'Ad side' : 'Deuce side'} drops off`,
      verdict: 'losing',
      sequence: [
        { shot: 'serve', from: [fromX, 0], to: [toX, 0.6], speed: null },
      ],
      coord_system: COORD,
      win_pct: Math.round(lossPct),
      sample_n: withServe.length,
      confidence: confidenceFromN(withServe.length),
      blurb: `Only ${Math.round(lossPct)}% in — ${Math.round((winPct ?? 0) - lossPct)} pts behind your strong side`,
    })
  }

  return out
}

function returnPatterns(matches: Match[]): Insight[] {
  const out: Insight[] = []
  const withRet = matches.filter(m => m.return != null)
  if (withRet.length < 2) return out

  const deepAd = avgN(withRet.map(m => m.return?.first?.deep_ad))
  const deepDeuce = avgN(withRet.map(m => m.return?.first?.deep_deuce))
  const adBetter = (deepAd ?? 0) >= (deepDeuce ?? 0)
  const winDeep = adBetter ? deepAd : deepDeuce
  const winSide = adBetter ? 'ad' : 'deuce'
  const lossDeep = adBetter ? deepDeuce : deepAd
  const lossSide = adBetter ? 'deuce' : 'ad'

  if (winDeep != null) {
    const fromX = winSide === 'ad' ? 0.06 : 0.94
    out.push({
      id: mkId('return_win'),
      kind: 'sequence_pattern',
      stroke: 'return',
      name: `Deep return ${winSide === 'ad' ? 'on the ad' : 'on the deuce'}`,
      verdict: 'winning',
      sequence: [
        { shot: 'return', from: [fromX, 0.05], to: [0.5, 0.85], speed: null },
      ],
      coord_system: COORD,
      win_pct: Math.round(winDeep),
      sample_n: withRet.length,
      confidence: confidenceFromN(withRet.length),
      blurb: `${Math.round(winDeep)}% deep — pins them behind the baseline`,
    })
  }

  if (lossDeep != null && lossDeep < (winDeep ?? 100)) {
    const fromX = lossSide === 'ad' ? 0.06 : 0.94
    out.push({
      id: mkId('return_loss'),
      kind: 'sequence_pattern',
      stroke: 'return',
      name: `Short returns ${lossSide === 'ad' ? 'on the ad' : 'on the deuce'}`,
      verdict: 'losing',
      sequence: [
        { shot: 'return', from: [fromX, 0.05], to: [0.5, 0.55], speed: null },
      ],
      coord_system: COORD,
      win_pct: Math.round(lossDeep),
      sample_n: withRet.length,
      confidence: confidenceFromN(withRet.length),
      blurb: `Only ${Math.round(lossDeep)}% deep — gives them an attacking ball`,
    })
  }

  return out
}

function groundstrokePatterns(matches: Match[], stroke: 'forehand' | 'backhand'): Insight[] {
  const out: Insight[] = []
  const key = stroke === 'forehand' ? 'forehand' : 'backhand'
  const withStroke = matches.filter(m => (m as any)[key] != null)
  if (withStroke.length < 2) return out

  const ccIn = avgN(withStroke.map(m => (m as any)[key]?.cc_in))
  const dtlIn = avgN(withStroke.map(m => (m as any)[key]?.dtl_in))
  const ccLift = correlationLift(matches, m => (m as any)[key]?.cc_in)
  const dtlLift = correlationLift(matches, m => (m as any)[key]?.dtl_in)

  // Winning pattern: the direction with the higher %in (your reliable shot)
  const ccBetter = (ccIn ?? 0) >= (dtlIn ?? 0)
  const winDir = ccBetter ? 'cc' : 'dtl'
  const winPct = ccBetter ? ccIn : dtlIn
  const winLift = ccBetter ? ccLift : dtlLift
  const lossDir = ccBetter ? 'dtl' : 'cc'
  const lossPct = ccBetter ? dtlIn : ccIn

  // Geometry: forehand played from JD's left half (x ~0.3), backhand from right half (x ~0.7)
  // (Convention assumes right-handed JD; CC goes diagonal, DTL goes straight up the line)
  const isFH = stroke === 'forehand'
  const fromX = isFH ? 0.28 : 0.72
  const ccToX = isFH ? 0.85 : 0.15
  const dtlToX = isFH ? 0.18 : 0.82

  const strokeShot = isFH ? 'fh' as const : 'bh' as const
  const label = isFH ? 'FH' : 'BH'

  if (winPct != null) {
    out.push({
      id: mkId(`${stroke}_win`),
      kind: 'sequence_pattern',
      stroke: key as StrokeCardKey,
      name: `${label} ${winDir === 'cc' ? 'cross-court' : 'down the line'}`,
      verdict: 'winning',
      sequence: [
        {
          shot: strokeShot,
          from: [fromX, 0.18],
          to: [winDir === 'cc' ? ccToX : dtlToX, 0.85],
          speed: null,
        },
      ],
      coord_system: COORD,
      win_pct: Math.round(winPct),
      sample_n: withStroke.length,
      confidence: confidenceFromN(withStroke.length),
      blurb: `${Math.round(winPct)}% in${winLift && winLift > 5 ? ` · +${winLift}pts win lift when on` : ''}`,
    })
  }

  if (lossPct != null && lossPct < (winPct ?? 100)) {
    out.push({
      id: mkId(`${stroke}_loss`),
      kind: 'sequence_pattern',
      stroke: key as StrokeCardKey,
      name: `${label} ${lossDir === 'cc' ? 'cross-court' : 'down the line'}`,
      verdict: 'losing',
      sequence: [
        {
          shot: strokeShot,
          from: [fromX, 0.18],
          to: [lossDir === 'cc' ? ccToX : dtlToX, 0.85],
          speed: null,
        },
      ],
      coord_system: COORD,
      win_pct: Math.round(lossPct),
      sample_n: withStroke.length,
      confidence: confidenceFromN(withStroke.length),
      blurb: `Only ${Math.round(lossPct)}% in — ${Math.round((winPct ?? 0) - lossPct)} pts behind your other side`,
    })
  }

  return out
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
export function minePatterns(matches: Match[]): Insight[] {
  return [
    ...servePatterns(matches),
    ...returnPatterns(matches),
    ...groundstrokePatterns(matches, 'forehand'),
    ...groundstrokePatterns(matches, 'backhand'),
  ]
}
