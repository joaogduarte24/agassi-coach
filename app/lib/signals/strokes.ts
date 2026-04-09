import type { Match } from '@/app/types'
import type { Signal, StrokeSignal, StrokeKey, StrokeTag } from './types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function avgNonNull(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
}

function winRate(matches: Match[]): number {
  if (!matches.length) return 0
  return Math.round(matches.filter(m => m.score?.winner === 'JD').length / matches.length * 100)
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── STROKE LABELS ───────────────────────────────────────────────────────────
const STROKE_LABELS: Record<StrokeKey, string> = {
  fh_cc: 'Forehand Cross-Court',
  fh_dtl: 'Forehand Down-the-Line',
  bh_cc: 'Backhand Cross-Court',
  bh_dtl: 'Backhand Down-the-Line',
}

// ─── STROKE SIGNAL COMPUTATION ───────────────────────────────────────────────
export function computeStrokes(matches: Match[]): StrokeSignal[] {
  const withStats = matches.filter(m => m.shot_stats != null && m.forehand != null)
  if (withStats.length < 3) return []

  const strokes: StrokeSignal[] = []

  // Compute per-stroke metrics
  // Usage: prefer actual CC/DTL counts from xlsx (stored in shot_stats as fh_cc_pct etc.)
  // Fall back to conservative estimate for screenshot-only matches
  const strokeDefs: { key: StrokeKey; pctIn: (m: Match) => number | null; speed: (m: Match) => number | null; usageFn: (m: Match) => number | null }[] = [
    {
      key: 'fh_cc',
      pctIn: m => m.forehand?.cc_in ?? null,
      speed: m => m.forehand?.spd_cc ?? null,
      usageFn: m => {
        const actual = (m.shot_stats as any)?.fh_cc_pct
        if (actual != null) return actual
        // Fallback: conservative 60/40 estimate for screenshot-only matches
        return m.shot_stats?.fh_pct != null ? Math.round(m.shot_stats.fh_pct * 0.60) : null
      },
    },
    {
      key: 'fh_dtl',
      pctIn: m => m.forehand?.dtl_in ?? null,
      speed: m => m.forehand?.spd_dtl ?? null,
      usageFn: m => {
        const actual = (m.shot_stats as any)?.fh_dtl_pct
        if (actual != null) return actual
        return m.shot_stats?.fh_pct != null ? Math.round(m.shot_stats.fh_pct * 0.40) : null
      },
    },
    {
      key: 'bh_cc',
      pctIn: m => m.backhand?.cc_in ?? null,
      speed: m => m.backhand?.spd_cc ?? null,
      usageFn: m => {
        const actual = (m.shot_stats as any)?.bh_cc_pct
        if (actual != null) return actual
        return m.shot_stats?.bh_pct != null ? Math.round(m.shot_stats.bh_pct * 0.60) : null
      },
    },
    {
      key: 'bh_dtl',
      pctIn: m => m.backhand?.dtl_in ?? null,
      speed: m => m.backhand?.spd_dtl ?? null,
      usageFn: m => {
        const actual = (m.shot_stats as any)?.bh_dtl_pct
        if (actual != null) return actual
        return m.shot_stats?.bh_pct != null ? Math.round(m.shot_stats.bh_pct * 0.40) : null
      },
    },
  ]

  // Winner/UE rates per wing (only available as fh_winners, bh_winners, fh_ue, bh_ue)
  const avgFhWinners = avgNonNull(withStats.map(m => m.shot_stats?.fh_winners))
  const avgBhWinners = avgNonNull(withStats.map(m => m.shot_stats?.bh_winners))
  const avgFhUE = avgNonNull(withStats.map(m => m.shot_stats?.fh_ue))
  const avgBhUE = avgNonNull(withStats.map(m => m.shot_stats?.bh_ue))
  const avgTotalShots = avgNonNull(withStats.map(m => m.shot_stats?.total_shots))

  for (const def of strokeDefs) {
    const pctInVals = withStats.map(m => def.pctIn(m)).filter((v): v is number => v != null)
    const speedVals = withStats.map(m => def.speed(m)).filter((v): v is number => v != null)
    const usageVals = withStats.map(m => def.usageFn(m)).filter((v): v is number => v != null)

    if (pctInVals.length < 3) continue

    const avgPctIn = avgNonNull(pctInVals)!
    const avgSpeed = avgNonNull(speedVals)
    const avgUsage = avgNonNull(usageVals) // null when no real data available
    const hasRealUsage = avgUsage != null

    // Effectiveness: approximate from wing-level winner/UE rates
    // CC gets ~65% of wing winners/UE, DTL gets ~35% (proportional to usage)
    const isFh = def.key.startsWith('fh')
    const isCC = def.key.endsWith('cc')
    const wingWinners = isFh ? avgFhWinners : avgBhWinners
    const wingUE = isFh ? avgFhUE : avgBhUE
    const shareOfWing = isCC ? 0.65 : 0.35
    const usageForCalc = avgUsage ?? 25 // only for effectiveness math, not displayed

    let effectiveness = 0
    if (wingWinners != null && wingUE != null && avgTotalShots != null && avgTotalShots > 0) {
      const estShotCount = (avgTotalShots * (usageForCalc / 100))
      if (estShotCount > 0) {
        const winnerRate = (wingWinners * shareOfWing) / estShotCount
        const ueRate = (wingUE * shareOfWing) / estShotCount
        effectiveness = Math.round((winnerRate - ueRate) * 100 * 10) / 10
      }
    }

    // Tagging — usage-aware when real data available, pctIn-only otherwise
    let tag: StrokeTag
    if (hasRealUsage) {
      if (avgPctIn >= 75 && effectiveness > 0 && avgUsage! < 25) {
        tag = 'hidden_weapon'
      } else if (avgPctIn < 65 && avgUsage! >= 25) {
        tag = 'overused'
      } else if (avgPctIn < 60) {
        tag = 'liability'
      } else {
        tag = 'reliable'
      }
    } else {
      // No usage data — tag purely on accuracy
      if (avgPctIn < 60) {
        tag = 'liability'
      } else if (avgPctIn >= 75) {
        tag = 'reliable' // could be weapon but can't tell without usage
      } else {
        tag = 'reliable'
      }
    }

    // Insight generation
    let insight: string
    switch (tag) {
      case 'hidden_weapon':
        insight = `${STROKE_LABELS[def.key]} is ${Math.round(avgPctIn)}% in with positive winner production — but only ~${Math.round(avgUsage!)}% of your shots. Use it more.`
        break
      case 'overused':
        insight = `${STROKE_LABELS[def.key]} is only ${Math.round(avgPctIn)}% in but ~${Math.round(avgUsage!)}% of your shots — you're leaking points here.`
        break
      case 'liability':
        insight = `${STROKE_LABELS[def.key]} at ${Math.round(avgPctIn)}% in — this shot is costing you.`
        break
      default:
        insight = `${STROKE_LABELS[def.key]}: ${Math.round(avgPctIn)}% in${avgSpeed ? `, avg ${Math.round(avgSpeed)} km/h` : ''} — solid and reliable.`
    }

    strokes.push({
      stroke: def.key,
      label: STROKE_LABELS[def.key],
      usage: hasRealUsage ? Math.round(avgUsage!) : null,
      effectiveness,
      pctIn: Math.round(avgPctIn),
      pace: avgSpeed != null ? Math.round(avgSpeed) : null,
      tag,
      insight,
    })
  }

  // Sort by effectiveness descending
  strokes.sort((a, b) => b.effectiveness - a.effectiveness)

  return strokes
}

// ─── SHOT-MIX WIN CORRELATION ────────────────────────────────────────────────
export function computeShotMixCorrelations(matches: Match[]): Signal[] {
  const withStats = matches.filter(m => m.shot_stats?.fh_pct != null)
  if (withStats.length < 6) return []

  const signals: Signal[] = []

  const mixCandidates: { key: string; label: string; extract: (m: Match) => number | null }[] = [
    { key: 'fh_usage', label: 'Forehand Usage %', extract: m => m.shot_stats?.fh_pct ?? null },
    { key: 'bh_usage', label: 'Backhand Usage %', extract: m => m.shot_stats?.bh_pct ?? null },
    { key: 'topspin_usage', label: 'Topspin %', extract: m => m.shot_stats?.topspin_pct ?? null },
    { key: 'slice_usage', label: 'Slice %', extract: m => m.shot_stats?.slice_pct ?? null },
  ]

  for (const cand of mixCandidates) {
    const pairs: { match: Match; value: number }[] = []
    for (const m of withStats) {
      const v = cand.extract(m)
      if (v != null) pairs.push({ match: m, value: v })
    }
    if (pairs.length < 6) continue

    const med = median(pairs.map(p => p.value))
    const above = pairs.filter(p => p.value >= med)
    const below = pairs.filter(p => p.value < med)
    if (above.length < 2 || below.length < 2) continue

    const wrAbove = winRate(above.map(p => p.match))
    const wrBelow = winRate(below.map(p => p.match))
    const lift = wrAbove - wrBelow

    if (Math.abs(lift) < 10) continue

    const direction = lift > 0 ? 'more' : 'less'
    signals.push({
      key: `${cand.key}_mix_driver`,
      label: cand.label,
      insight: `Hitting ${direction} ${cand.label.toLowerCase().replace(' %', '')} boosts your win chance by ${Math.abs(lift)}%`,
      detail: `${wrAbove}% win rate when ${cand.label.toLowerCase()} above ${Math.round(med)}% vs ${wrBelow}% below`,
      category: 'stroke',
      direction: lift > 0 ? 'positive' : 'negative',
      confidence: pairs.length >= 10 ? 'moderate' : 'low',
      lift,
      value: Math.round(med),
      threshold: Math.round(med),
      winRateAbove: wrAbove,
      winRateBelow: wrBelow,
      matchesUsed: pairs.length,
    })
  }

  signals.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))
  return signals
}
