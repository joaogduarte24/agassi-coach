import type { Match } from '@/app/types'
import type { Signal, CorrelationCandidate } from './types'

// ─── STATISTICAL HELPERS ─────────────────────────────────────────────────────
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function cohensD(group1: number[], group2: number[]): number {
  if (group1.length < 2 || group2.length < 2) return 0
  const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length
  const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length
  const var1 = group1.reduce((s, v) => s + (v - mean1) ** 2, 0) / (group1.length - 1)
  const var2 = group2.reduce((s, v) => s + (v - mean2) ** 2, 0) / (group2.length - 1)
  const pooledSD = Math.sqrt(((group1.length - 1) * var1 + (group2.length - 1) * var2) / (group1.length + group2.length - 2))
  return pooledSD === 0 ? 0 : (mean1 - mean2) / pooledSD
}

function winRate(matches: Match[]): number {
  if (!matches.length) return 0
  return Math.round(matches.filter(m => m.score?.winner === 'JD').length / matches.length * 100)
}

function getConfidence(n: number, d: number): 'strong' | 'moderate' | 'low' {
  const absD = Math.abs(d)
  if (n >= 12 && absD >= 0.8) return 'strong'
  if (n >= 8 && absD >= 0.5) return 'moderate'
  return 'low'
}

// ─── CANDIDATE DEFINITIONS ───────────────────────────────────────────────────
const CANDIDATES: CorrelationCandidate[] = [
  // Serve
  {
    key: 's1_pct', label: '1st Serve %', higherIsBetter: true,
    extract: m => {
      const ad = m.serve?.first?.pct_ad, deuce = m.serve?.first?.pct_deuce
      if (ad == null && deuce == null) return null
      return Math.round(((ad ?? 0) + (deuce ?? 0)) / ((ad != null ? 1 : 0) + (deuce != null ? 1 : 0)))
    },
  },
  {
    key: 's1_pts_won', label: '1st Serve Pts Won %', higherIsBetter: true,
    extract: m => m.shot_stats?.s1_pts_won_pct ?? null,
  },
  // Return
  {
    key: 'return_pts_won', label: 'Return Pts Won %', higherIsBetter: true,
    extract: m => m.shot_stats?.return_pts_won_pct ?? null,
  },
  // Errors
  {
    key: 'ue', label: 'Unforced Errors', higherIsBetter: false,
    extract: m => m.shot_stats?.ue ?? null,
  },
  {
    key: 'df', label: 'Double Faults', higherIsBetter: false,
    extract: m => m.shot_stats?.df ?? null,
  },
  // Aggression
  {
    key: 'winners', label: 'Winners', higherIsBetter: true,
    extract: m => m.shot_stats?.winners ?? null,
  },
  {
    key: 'net_aggression', label: 'Net Aggression (W-UE)', higherIsBetter: true,
    extract: m => {
      const w = m.shot_stats?.winners, ue = m.shot_stats?.ue
      return w != null && ue != null ? w - ue : null
    },
  },
  // Clutch
  {
    key: 'bp_saved', label: 'Break Points Saved %', higherIsBetter: true,
    extract: m => m.shot_stats?.bp_saved_pct ?? null,
  },
  {
    key: 'bp_won', label: 'Break Points Won %', higherIsBetter: true,
    extract: m => m.shot_stats?.bp_won_pct ?? null,
  },
  // Pace
  {
    key: 'fh_pace', label: 'Forehand Pace', higherIsBetter: true,
    extract: m => {
      const cc = m.forehand?.spd_cc, dtl = m.forehand?.spd_dtl
      if (cc == null && dtl == null) return null
      return Math.round(((cc ?? 0) + (dtl ?? 0)) / ((cc != null ? 1 : 0) + (dtl != null ? 1 : 0)))
    },
  },
  {
    key: 'bh_pace', label: 'Backhand Pace', higherIsBetter: true,
    extract: m => {
      const cc = m.backhand?.spd_cc, dtl = m.backhand?.spd_dtl
      if (cc == null && dtl == null) return null
      return Math.round(((cc ?? 0) + (dtl ?? 0)) / ((cc != null ? 1 : 0) + (dtl != null ? 1 : 0)))
    },
  },
  // Consistency
  {
    key: 'fh_cc_in', label: 'FH Cross-Court % In', higherIsBetter: true,
    extract: m => m.forehand?.cc_in ?? null,
  },
  {
    key: 'bh_cc_in', label: 'BH Cross-Court % In', higherIsBetter: true,
    extract: m => m.backhand?.cc_in ?? null,
  },
  // Overall
  {
    key: 'total_pts_won', label: 'Total Points Won %', higherIsBetter: true,
    extract: m => m.shot_stats?.total_pts_won_pct ?? null,
  },
  // Serve speed
  {
    key: 's1_speed', label: '1st Serve Speed', higherIsBetter: true,
    extract: m => {
      const ad = m.serve?.first?.spd_ad, deuce = m.serve?.first?.spd_deuce
      if (ad == null && deuce == null) return null
      return Math.round(((ad ?? 0) + (deuce ?? 0)) / ((ad != null ? 1 : 0) + (deuce != null ? 1 : 0)))
    },
  },
  // 2nd serve
  {
    key: 's2_pct', label: '2nd Serve %', higherIsBetter: true,
    extract: m => {
      const ad = m.serve?.second?.pct_ad, deuce = m.serve?.second?.pct_deuce
      if (ad == null && deuce == null) return null
      return Math.round(((ad ?? 0) + (deuce ?? 0)) / ((ad != null ? 1 : 0) + (deuce != null ? 1 : 0)))
    },
  },
]

// ─── MAIN COMPUTATION ────────────────────────────────────────────────────────
export function computeCorrelations(matches: Match[]): Signal[] {
  const withStats = matches.filter(m => m.shot_stats != null || m.serve != null)
  if (withStats.length < 6) return [] // need minimum sample

  const signals: Signal[] = []

  for (const cand of CANDIDATES) {
    // Extract values for matches that have this stat
    const pairs: { match: Match; value: number }[] = []
    for (const m of withStats) {
      const v = cand.extract(m)
      if (v != null) pairs.push({ match: m, value: v })
    }
    if (pairs.length < 6) continue

    // Split at median
    const values = pairs.map(p => p.value)
    const med = median(values)

    const above = pairs.filter(p => p.value >= med)
    const below = pairs.filter(p => p.value < med)

    // Avoid degenerate splits (all on one side)
    if (above.length < 2 || below.length < 2) continue

    const wrAbove = winRate(above.map(p => p.match))
    const wrBelow = winRate(below.map(p => p.match))

    // Compute lift — direction depends on whether higher is better
    let lift: number
    let dirWr: number // win rate in "good" direction
    let badWr: number
    if (cand.higherIsBetter) {
      lift = wrAbove - wrBelow
      dirWr = wrAbove
      badWr = wrBelow
    } else {
      // For stats where lower is better (UE, DF), "below median" is the good side
      lift = wrBelow - wrAbove
      dirWr = wrBelow
      badWr = wrAbove
    }

    // Skip trivial signals
    if (Math.abs(lift) < 10) continue

    // Cohen's d between wins and losses for this stat
    const winVals = pairs.filter(p => p.match.score?.winner === 'JD').map(p => p.value)
    const lossVals = pairs.filter(p => p.match.score?.winner !== 'JD').map(p => p.value)
    const d = cohensD(winVals, lossVals)

    // When lift is negative, the assumed direction was wrong —
    // flip so insight always describes the winning side
    const actualHigherIsBetter = cand.higherIsBetter ? lift >= 0 : lift < 0
    const absLift = Math.abs(lift)
    const goodWr = actualHigherIsBetter ? wrAbove : wrBelow
    const poorWr = actualHigherIsBetter ? wrBelow : wrAbove
    const thresholdLabel = actualHigherIsBetter ? 'above' : 'below'
    const thresholdAction = actualHigherIsBetter
      ? `Keeping ${cand.label.toLowerCase()} above ${Math.round(med)}`
      : `Keeping ${cand.label.toLowerCase()} below ${Math.round(med)}`

    signals.push({
      key: `${cand.key}_win_driver`,
      label: cand.label,
      insight: `${thresholdAction} boosts your win chance by ${absLift}%`,
      detail: `${goodWr}% win rate when ${thresholdLabel} ${Math.round(med)} vs ${poorWr}% when ${actualHigherIsBetter ? 'below' : 'above'}`,
      category: 'correlation',
      direction: 'positive',
      confidence: getConfidence(pairs.length, d),
      lift: absLift,
      value: Math.round(med * 10) / 10,
      threshold: Math.round(med * 10) / 10,
      winRateAbove: wrAbove,
      winRateBelow: wrBelow,
      matchesUsed: pairs.length,
    })
  }

  // Sort by |lift| descending
  signals.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))

  return signals
}
