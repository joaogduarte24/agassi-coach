/**
 * Outlier selector for §3 "The numbers that define you".
 *
 * Picks the top N stats by |delta vs UTR-band median|, regardless of
 * direction. Returns each pick with its value, delta, lower-is-better flag,
 * trend (rising / falling / flat), trendGood flag, and a chronological series
 * for the sparkline.
 *
 * v1 only considers stats that have band data in benchmarks.ts. If/when more
 * stats get bands, they'll automatically be eligible.
 */
import type { Match } from '@/app/types'
import { getBandMedians, type BenchmarkStat } from '@/app/lib/analyst/benchmarks'

// Map: which match field corresponds to each BenchmarkStat
type StatExtractor = {
  key: BenchmarkStat
  label: string
  unit: '%' | '/m'
  pull: (m: Match) => number | null | undefined
}

const EXTRACTORS: StatExtractor[] = [
  { key: 'ue_per_match',           label: 'Unforced Errors', unit: '/m', pull: m => m.shot_stats?.ue },
  { key: 'winners_per_match',      label: 'Winners',         unit: '/m', pull: m => m.shot_stats?.winners },
  { key: 'first_serve_pct',        label: '1st Serve %',     unit: '%',  pull: m => {
    const ad = m.serve?.first?.pct_ad, dc = m.serve?.first?.pct_deuce
    if (ad == null && dc == null) return null
    return ((ad ?? 0) + (dc ?? 0)) / ((ad != null ? 1 : 0) + (dc != null ? 1 : 0))
  }},
  { key: 'first_serve_pts_won_pct',  label: '1st Serve Pts Won', unit: '%', pull: m => m.shot_stats?.s1_pts_won_pct },
  { key: 'second_serve_pts_won_pct', label: '2nd Serve Pts Won', unit: '%', pull: m => m.shot_stats?.s2_pts_won_pct },
  { key: 'return_pts_won_pct',     label: 'Return Pts Won',  unit: '%',  pull: m => m.shot_stats?.return_pts_won_pct },
  { key: 'bp_won_pct',             label: 'BP Won %',        unit: '%',  pull: m => m.shot_stats?.bp_won_pct },
  { key: 'total_pts_won_pct',      label: 'Total Pts Won',   unit: '%',  pull: m => m.shot_stats?.total_pts_won_pct },
  { key: 'fh_cc_in',               label: 'FH CC in %',      unit: '%',  pull: m => m.forehand?.cc_in },
  { key: 'fh_dtl_in',              label: 'FH DTL in %',     unit: '%',  pull: m => m.forehand?.dtl_in },
  { key: 'bh_cc_in',               label: 'BH CC in %',      unit: '%',  pull: m => m.backhand?.cc_in },
  { key: 'bh_dtl_in',              label: 'BH DTL in %',     unit: '%',  pull: m => m.backhand?.dtl_in },
]

export type Outlier = {
  key: BenchmarkStat
  label: string
  unit: '%' | '/m'
  val: number              // current career median
  bandCurrent: number
  delta: number            // rounded
  lower: boolean           // lower-is-better stat
  trend: 'up' | 'down' | 'flat'
  trendGood: boolean | null
  series: number[]         // chronological series for sparkline (per match)
  matchCount: number
}

function avgRound(arr: number[]): number {
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function trendOf(series: number[], lower: boolean): { trend: 'up' | 'down' | 'flat'; trendGood: boolean | null } {
  if (series.length < 4) return { trend: 'flat', trendGood: null }
  const half = Math.max(1, Math.floor(series.length / 3))
  const firstAvg = series.slice(0, half).reduce((a, b) => a + b, 0) / half
  const lastAvg = series.slice(-half).reduce((a, b) => a + b, 0) / half
  const delta = lastAvg - firstAvg
  // Threshold: 5% of the value range, minimum 1.
  const range = Math.max(...series) - Math.min(...series)
  const threshold = Math.max(1, range * 0.1)
  if (delta > threshold) return { trend: 'up', trendGood: !lower }
  if (delta < -threshold) return { trend: 'down', trendGood: lower }
  return { trend: 'flat', trendGood: null }
}

/**
 * Pick the top N stats by absolute delta vs UTR-band median.
 * Sorted highest |delta| first.
 */
export function pickTopOutliers(matches: Match[], utr: number | null, n = 4): Outlier[] {
  if (matches.length === 0) return []

  // Sort matches chronologically once
  const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const candidates: Outlier[] = []

  for (const ex of EXTRACTORS) {
    const series = sorted
      .map(m => ex.pull(m))
      .filter((v): v is number => v != null && !isNaN(v))
      .map(v => Math.round(v))

    if (series.length < 3) continue

    const bench = getBandMedians(ex.key, utr)
    if (!bench) continue

    const val = avgRound(series)
    const delta = Math.round(val - bench.current)
    const lower = !bench.higherBetter
    const { trend, trendGood } = trendOf(series, lower)

    candidates.push({
      key: ex.key,
      label: ex.label,
      unit: ex.unit,
      val,
      bandCurrent: bench.current,
      delta,
      lower,
      trend,
      trendGood,
      series,
      matchCount: series.length,
    })
  }

  return candidates
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, n)
}
