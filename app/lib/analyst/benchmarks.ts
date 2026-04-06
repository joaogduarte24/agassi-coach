// UTR-band benchmarks — SYNTHETIC v1.
//
// These are hand-tuned medians for amateur tennis stats per UTR band, derived
// from USTA NTRP-equivalent published data and SwingVision community averages.
// They are NOT scraped from a real dataset. v2 will replace this with a Tennis
// Abstract Match Charting Project scrape (see DATA-ANALYST-PLAN.md §6).
//
// Source attribution: every benchmark carries `source: 'synthetic'` so the UI
// can disclose data quality. When real data ships, source flips to 'tennis_abstract'.
//
// Bands cover the amateur sweet spot (UTR 2.0–6.0). Outside this range we
// extrapolate by clamping.

export type UtrBand = '2.0-2.5' | '2.5-3.0' | '3.0-3.5' | '3.5-4.0' | '4.0-4.5' | '4.5-5.0' | '5.0-5.5' | '5.5-6.0'

export type BenchmarkStat =
  | 'ue_per_match'
  | 'winners_per_match'
  | 'first_serve_pct'
  | 'first_serve_pts_won_pct'
  | 'second_serve_pts_won_pct'
  | 'return_pts_won_pct'
  | 'bp_won_pct'
  | 'total_pts_won_pct'
  | 'fh_cc_in'
  | 'fh_dtl_in'
  | 'bh_cc_in'
  | 'bh_dtl_in'

export type Benchmark = {
  stat: BenchmarkStat
  label: string
  // Median value per band (the p50 of amateur players in that band)
  bands: Record<UtrBand, number>
  // true = higher value is better
  higherBetter: boolean
  unit?: 'pct' | 'count'
  source: 'synthetic' | 'tennis_abstract'
}

// ─── BENCHMARK TABLE ─────────────────────────────────────────────────────────
// Numbers reflect what a *median* player in each band averages per match.
// Hand-tuned from USTA NTRP descriptors (3.0/3.5/4.0 = recreational ladder),
// SwingVision community averages, and Tennis Abstract amateur summaries.
export const BENCHMARKS: Benchmark[] = [
  {
    stat: 'ue_per_match',
    label: 'Unforced errors',
    higherBetter: false,
    unit: 'count',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 48, '2.5-3.0': 42, '3.0-3.5': 36, '3.5-4.0': 30,
      '4.0-4.5': 26, '4.5-5.0': 22, '5.0-5.5': 19, '5.5-6.0': 17,
    },
  },
  {
    stat: 'winners_per_match',
    label: 'Winners',
    higherBetter: true,
    unit: 'count',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 6,  '2.5-3.0': 8,  '3.0-3.5': 11, '3.5-4.0': 14,
      '4.0-4.5': 17, '4.5-5.0': 21, '5.0-5.5': 25, '5.5-6.0': 29,
    },
  },
  {
    stat: 'first_serve_pct',
    label: '1st serve %',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 50, '2.5-3.0': 55, '3.0-3.5': 60, '3.5-4.0': 63,
      '4.0-4.5': 65, '4.5-5.0': 65, '5.0-5.5': 64, '5.5-6.0': 63,
    },
  },
  {
    stat: 'first_serve_pts_won_pct',
    label: '1st serve pts won',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 50, '2.5-3.0': 55, '3.0-3.5': 58, '3.5-4.0': 61,
      '4.0-4.5': 64, '4.5-5.0': 67, '5.0-5.5': 70, '5.5-6.0': 72,
    },
  },
  {
    stat: 'second_serve_pts_won_pct',
    label: '2nd serve pts won',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 35, '2.5-3.0': 38, '3.0-3.5': 42, '3.5-4.0': 45,
      '4.0-4.5': 48, '4.5-5.0': 50, '5.0-5.5': 52, '5.5-6.0': 54,
    },
  },
  {
    stat: 'return_pts_won_pct',
    label: 'Return pts won',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 32, '2.5-3.0': 36, '3.0-3.5': 39, '3.5-4.0': 42,
      '4.0-4.5': 44, '4.5-5.0': 45, '5.0-5.5': 46, '5.5-6.0': 47,
    },
  },
  {
    stat: 'bp_won_pct',
    label: 'BP won',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 32, '2.5-3.0': 36, '3.0-3.5': 40, '3.5-4.0': 42,
      '4.0-4.5': 44, '4.5-5.0': 45, '5.0-5.5': 46, '5.5-6.0': 47,
    },
  },
  {
    stat: 'total_pts_won_pct',
    label: 'Total pts won',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 44, '2.5-3.0': 47, '3.0-3.5': 49, '3.5-4.0': 51,
      '4.0-4.5': 53, '4.5-5.0': 55, '5.0-5.5': 57, '5.5-6.0': 58,
    },
  },
  {
    stat: 'fh_cc_in',
    label: 'FH cross-court %',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 60, '2.5-3.0': 65, '3.0-3.5': 70, '3.5-4.0': 74,
      '4.0-4.5': 77, '4.5-5.0': 80, '5.0-5.5': 82, '5.5-6.0': 84,
    },
  },
  {
    stat: 'fh_dtl_in',
    label: 'FH down-the-line %',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 50, '2.5-3.0': 55, '3.0-3.5': 60, '3.5-4.0': 64,
      '4.0-4.5': 67, '4.5-5.0': 70, '5.0-5.5': 72, '5.5-6.0': 74,
    },
  },
  {
    stat: 'bh_cc_in',
    label: 'BH cross-court %',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 55, '2.5-3.0': 60, '3.0-3.5': 65, '3.5-4.0': 69,
      '4.0-4.5': 72, '4.5-5.0': 75, '5.0-5.5': 78, '5.5-6.0': 80,
    },
  },
  {
    stat: 'bh_dtl_in',
    label: 'BH down-the-line %',
    higherBetter: true,
    unit: 'pct',
    source: 'synthetic',
    bands: {
      '2.0-2.5': 45, '2.5-3.0': 50, '3.0-3.5': 55, '3.5-4.0': 59,
      '4.0-4.5': 63, '4.5-5.0': 66, '5.0-5.5': 68, '5.5-6.0': 70,
    },
  },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const ALL_BANDS: UtrBand[] = ['2.0-2.5', '2.5-3.0', '3.0-3.5', '3.5-4.0', '4.0-4.5', '4.5-5.0', '5.0-5.5', '5.5-6.0']

export function utrToBand(utr: number | null): UtrBand {
  if (utr == null) return '3.0-3.5'
  if (utr < 2.5) return '2.0-2.5'
  if (utr < 3.0) return '2.5-3.0'
  if (utr < 3.5) return '3.0-3.5'
  if (utr < 4.0) return '3.5-4.0'
  if (utr < 4.5) return '4.0-4.5'
  if (utr < 5.0) return '4.5-5.0'
  if (utr < 5.5) return '5.0-5.5'
  return '5.5-6.0'
}

export function nextBand(band: UtrBand): UtrBand | null {
  const i = ALL_BANDS.indexOf(band)
  return i >= 0 && i < ALL_BANDS.length - 1 ? ALL_BANDS[i + 1] : null
}

export function getBenchmark(stat: BenchmarkStat): Benchmark | null {
  return BENCHMARKS.find(b => b.stat === stat) ?? null
}

export type BenchmarkPoint = {
  current: number
  next: number | null
  higherBetter: boolean
  source: 'synthetic' | 'tennis_abstract'
}

export function getBandMedians(stat: BenchmarkStat, utr: number | null): BenchmarkPoint | null {
  const b = getBenchmark(stat)
  if (!b) return null
  const band = utrToBand(utr)
  const next = nextBand(band)
  return {
    current: b.bands[band],
    next: next ? b.bands[next] : null,
    higherBetter: b.higherBetter,
    source: b.source,
  }
}

// Compute the "gap to next band" for ranking which stats matter most.
// Returns positive number = how much you need to improve. 0 = at or above next band.
export function gapToNext(you: number, point: BenchmarkPoint): number {
  if (point.next == null) return 0
  if (point.higherBetter) return Math.max(0, point.next - you)
  return Math.max(0, you - point.next)
}
