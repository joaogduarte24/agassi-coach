import type { Match } from '@/app/types'
import type { Signal } from './types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function avgNonNull(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
}

function trend(vals: { date: string; value: number }[]): 'rising' | 'falling' | 'stable' | null {
  if (vals.length < 4) return null
  const sorted = [...vals].sort((a, b) => a.date.localeCompare(b.date))
  const half = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, half).reduce((s, v) => s + v.value, 0) / half
  const secondHalf = sorted.slice(half).reduce((s, v) => s + v.value, 0) / (sorted.length - half)
  const diff = secondHalf - firstHalf
  if (Math.abs(diff) < 2) return 'stable'
  return diff > 0 ? 'rising' : 'falling'
}

// ─── TENDENCY SIGNALS ────────────────────────────────────────────────────────
export function computeTendencies(matches: Match[]): Signal[] {
  const signals: Signal[] = []
  // Only xlsx matches have these fields
  const xlsxMatches = matches.filter(m => (m as any).has_shot_data)

  // === SERVE DIRECTION BIAS ===
  const tPcts = xlsxMatches.map(m => (m.shot_stats as any)?.s1_t_pct).filter((v): v is number => v != null)
  const widePcts = xlsxMatches.map(m => (m.shot_stats as any)?.s1_wide_pct).filter((v): v is number => v != null)
  if (tPcts.length >= 2) {
    const avgT = avgNonNull(tPcts)!
    const avgWide = avgNonNull(widePcts)
    const dominant = avgT >= (avgWide ?? 0) ? 'T' : 'wide'
    const dominantPct = dominant === 'T' ? avgT : avgWide!
    const isPredictable = dominantPct >= 60

    signals.push({
      key: 'serve_direction',
      label: 'Serve Direction',
      insight: isPredictable
        ? `You go ${dominant} ${Math.round(dominantPct)}% of the time — predictable. Mix it up.`
        : `Serve direction balanced: ${Math.round(avgT)}% T, ${Math.round(avgWide ?? 0)}% wide`,
      detail: `Avg across ${tPcts.length} matches: ${Math.round(avgT)}% T, ${Math.round(avgWide ?? 0)}% wide`,
      category: 'tendency',
      direction: isPredictable ? 'negative' : 'positive',
      confidence: tPcts.length >= 6 ? 'strong' : tPcts.length >= 3 ? 'moderate' : 'low',
      lift: 0,
      value: dominantPct,
      matchesUsed: tPcts.length,
    })
  }

  // === OPPONENT SERVE DIRECTION ===
  const oppTPcts = xlsxMatches.map(m => (m as any).opp_shots?.stats?.opp_s1_t_pct ?? (m as any).shot_stats?.opp_s1_t_pct).filter((v): v is number => v != null)
  const oppWidePcts = xlsxMatches.map(m => (m as any).opp_shots?.stats?.opp_s1_wide_pct ?? (m as any).shot_stats?.opp_s1_wide_pct).filter((v): v is number => v != null)
  if (oppTPcts.length >= 2) {
    const avgOppT = avgNonNull(oppTPcts)!
    const avgOppWide = avgNonNull(oppWidePcts)
    const oppDominant = avgOppT >= (avgOppWide ?? 0) ? 'T' : 'wide'
    const oppDominantPct = oppDominant === 'T' ? avgOppT : avgOppWide!

    signals.push({
      key: 'opp_serve_direction',
      label: 'Opponent Serve Direction',
      insight: oppDominantPct >= 60
        ? `Opponents tend to go ${oppDominant} ${Math.round(oppDominantPct)}% — cheat that way on return`
        : `Opponent serve direction varies: ${Math.round(avgOppT)}% T, ${Math.round(avgOppWide ?? 0)}% wide`,
      detail: `Avg across ${oppTPcts.length} opponents`,
      category: 'tendency',
      direction: oppDominantPct >= 60 ? 'positive' : 'neutral',
      confidence: oppTPcts.length >= 5 ? 'moderate' : 'low',
      lift: 0,
      value: oppDominantPct,
      matchesUsed: oppTPcts.length,
    })
  }

  // === FH SPEED CONSISTENCY ===
  const fhStds = xlsxMatches.map(m => (m.shot_stats as any)?.fh_spd_std).filter((v): v is number => v != null)
  if (fhStds.length >= 2) {
    const avgStd = avgNonNull(fhStds)!
    const isErratic = avgStd >= 18

    signals.push({
      key: 'fh_speed_consistency',
      label: 'Forehand Pace Consistency',
      insight: isErratic
        ? `Forehand pace is erratic (±${Math.round(avgStd)} km/h std dev) — inconsistent contact`
        : `Forehand pace is controlled (±${Math.round(avgStd)} km/h) — consistent ball striking`,
      detail: `Avg std dev across ${fhStds.length} matches`,
      category: 'tendency',
      direction: isErratic ? 'negative' : 'positive',
      confidence: fhStds.length >= 5 ? 'moderate' : 'low',
      lift: 0,
      value: avgStd,
      matchesUsed: fhStds.length,
    })
  }

  // === CONTACT HEIGHT TREND ===
  const fhContactVals = xlsxMatches
    .filter(m => (m.shot_stats as any)?.fh_contact_z != null)
    .map(m => ({ date: m.date, value: (m.shot_stats as any).fh_contact_z as number }))
  const bhContactVals = xlsxMatches
    .filter(m => (m.shot_stats as any)?.bh_contact_z != null)
    .map(m => ({ date: m.date, value: (m.shot_stats as any).bh_contact_z as number }))

  if (fhContactVals.length >= 3) {
    const fhTrend = trend(fhContactVals)
    const avgFhContact = avgNonNull(fhContactVals.map(v => v.value))!
    if (fhTrend && fhTrend !== 'stable') {
      signals.push({
        key: 'fh_contact_height',
        label: 'FH Contact Height',
        insight: fhTrend === 'rising'
          ? `You're taking the forehand higher (avg ${Math.round(avgFhContact)} cm) — more offensive stance`
          : `Forehand contact dropping (avg ${Math.round(avgFhContact)} cm) — getting pushed back`,
        detail: `Trend across ${fhContactVals.length} matches`,
        category: 'tendency',
        direction: fhTrend === 'rising' ? 'positive' : 'negative',
        confidence: fhContactVals.length >= 6 ? 'moderate' : 'low',
        lift: 0,
        value: avgFhContact,
        matchesUsed: fhContactVals.length,
      })
    }
  }

  if (bhContactVals.length >= 3) {
    const bhTrend = trend(bhContactVals)
    const avgBhContact = avgNonNull(bhContactVals.map(v => v.value))!
    if (bhTrend && bhTrend !== 'stable') {
      signals.push({
        key: 'bh_contact_height',
        label: 'BH Contact Height',
        insight: bhTrend === 'rising'
          ? `Backhand contact rising (avg ${Math.round(avgBhContact)} cm) — taking it earlier`
          : `Backhand contact dropping (avg ${Math.round(avgBhContact)} cm) — opponent may be pushing you back`,
        detail: `Trend across ${bhContactVals.length} matches`,
        category: 'tendency',
        direction: bhTrend === 'rising' ? 'positive' : 'negative',
        confidence: bhContactVals.length >= 6 ? 'moderate' : 'low',
        lift: 0,
        value: avgBhContact,
        matchesUsed: bhContactVals.length,
      })
    }
  }

  // === SERVE+1 PATTERN ===
  const s1DtlPcts = xlsxMatches.map(m => (m.shot_stats as any)?.s1_after_dtl_pct).filter((v): v is number => v != null)
  if (s1DtlPcts.length >= 2) {
    const avgDtl = avgNonNull(s1DtlPcts)!
    signals.push({
      key: 'serve_plus_one',
      label: 'Serve+1 Pattern',
      insight: avgDtl >= 55
        ? `After serve, you go DTL ${Math.round(avgDtl)}% — attacking but predictable`
        : avgDtl <= 30
          ? `After serve, you go DTL only ${Math.round(avgDtl)}% — mostly cross-court`
          : `Serve+1 balanced: ${Math.round(avgDtl)}% DTL`,
      detail: `Avg across ${s1DtlPcts.length} matches`,
      category: 'tendency',
      direction: avgDtl >= 55 || avgDtl <= 30 ? 'negative' : 'neutral',
      confidence: s1DtlPcts.length >= 5 ? 'moderate' : 'low',
      lift: 0,
      value: avgDtl,
      matchesUsed: s1DtlPcts.length,
    })
  }

  // === RALLY PROFILE ===
  const rallyMeans = xlsxMatches.map(m => (m.shot_stats as any)?.rally_mean).filter((v): v is number => v != null)
  const rallyShorts = xlsxMatches.map(m => (m.shot_stats as any)?.rally_pct_short).filter((v): v is number => v != null)
  const rallyLongs = xlsxMatches.map(m => (m.shot_stats as any)?.rally_pct_long).filter((v): v is number => v != null)
  if (rallyMeans.length >= 2) {
    const avgMean = avgNonNull(rallyMeans)!
    const avgShort = avgNonNull(rallyShorts)
    const avgLong = avgNonNull(rallyLongs)
    const isServeHeavy = (avgShort ?? 0) >= 55
    const isGrindy = (avgLong ?? 0) >= 20

    signals.push({
      key: 'rally_profile',
      label: 'Rally Profile',
      insight: isServeHeavy
        ? `${Math.round(avgShort!)}% of points end in ≤3 shots — your matches are serve-dominated`
        : isGrindy
          ? `${Math.round(avgLong!)}% of points go 7+ shots — you play baseline battles`
          : `Avg ${avgMean} shots/point — balanced rally length`,
      detail: `${Math.round(avgShort ?? 0)}% short (≤3), ${Math.round(avgLong ?? 0)}% long (7+), avg ${avgMean} shots/point`,
      category: 'tendency',
      direction: 'neutral',
      confidence: rallyMeans.length >= 5 ? 'moderate' : 'low',
      lift: 0,
      value: avgMean,
      matchesUsed: rallyMeans.length,
    })
  }

  return signals
}
