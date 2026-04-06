import type { Match } from '@/app/types'
import type { Signal } from './types'

export type KeyStat = {
  label: string
  val: number
  valStr: string
  avg: number
  opp?: number
  oppStr?: string
  tag: string
  tagColor: string   // G, A, R, or B constant
  isCount: boolean    // true = UE/winners/aces/DF (no bar), false = percentage/speed (bar)
  good: boolean       // for bar: above/below threshold. for count: whether the value is favorable
  gThresh: number
  aThresh: number
  max: number
  lower?: boolean     // true = lower is better (UE, DF)
}

const G = '#4ade80', A = '#fbbf24', R = '#f87171', B = '#60a5fa', MUTED = '#666'

type Candidate = {
  key: string
  label: string
  category: 'serve' | 'return' | 'groundstroke' | 'clutch' | 'error' | 'overview'
  isCount: boolean
  lower?: boolean
  extract: (m: Match) => number | null
  oppExtract?: (m: Match) => number | null
  gThresh: number
  aThresh: number
  max: number
  suffix?: string
}

const CANDIDATES: Candidate[] = [
  { key: 'ue', label: 'Unforced Errors', category: 'error', isCount: true, lower: true,
    extract: m => m.shot_stats?.ue ?? null, oppExtract: m => (m.opp_shots as any)?.stats?.ue ?? null,
    gThresh: 25, aThresh: 35, max: 60 },
  { key: 'winners', label: 'Winners', category: 'error', isCount: true,
    extract: m => m.shot_stats?.winners ?? null, oppExtract: m => (m.opp_shots as any)?.stats?.winners ?? null,
    gThresh: 12, aThresh: 8, max: 30 },
  { key: 'df', label: 'Double Faults', category: 'serve', isCount: true, lower: true,
    extract: m => m.shot_stats?.df ?? null, oppExtract: m => (m.opp_shots as any)?.stats?.df ?? null,
    gThresh: 2, aThresh: 4, max: 10 },
  { key: 'aces', label: 'Aces', category: 'serve', isCount: true,
    extract: m => m.shot_stats?.aces ?? null, oppExtract: m => (m.opp_shots as any)?.stats?.aces ?? null,
    gThresh: 3, aThresh: 1, max: 15 },
  { key: 's1_pct', label: '1st Serve %', category: 'serve', isCount: false,
    extract: m => {
      const ad = m.serve?.first?.pct_ad, d = m.serve?.first?.pct_deuce
      if (ad == null && d == null) return null
      return Math.round(((ad ?? 0) + (d ?? 0)) / ((ad != null ? 1 : 0) + (d != null ? 1 : 0)))
    },
    oppExtract: m => {
      const o = m.opp_shots as any
      const ad = o?.serve?.first?.pct_ad, d = o?.serve?.first?.pct_deuce
      if (ad == null && d == null) return null
      return Math.round(((ad ?? 0) + (d ?? 0)) / ((ad != null ? 1 : 0) + (d != null ? 1 : 0)))
    },
    gThresh: 66, aThresh: 55, max: 100 },
  { key: 'serve_pts_won', label: 'Serve Pts Won', category: 'serve', isCount: false,
    extract: m => m.shot_stats?.serve_pts_won_pct ?? null,
    oppExtract: m => (m.opp_shots as any)?.stats?.serve_pts_won_pct ?? null,
    gThresh: 60, aThresh: 50, max: 100 },
  { key: 'return_pts_won', label: 'Return Pts Won', category: 'return', isCount: false,
    extract: m => m.shot_stats?.return_pts_won_pct ?? null,
    oppExtract: m => (m.opp_shots as any)?.stats?.return_pts_won_pct ?? null,
    gThresh: 45, aThresh: 35, max: 100 },
  { key: 'bp_saved', label: 'BP Saved', category: 'clutch', isCount: false,
    extract: m => m.shot_stats?.bp_saved_pct ?? null,
    oppExtract: m => (m.opp_shots as any)?.stats?.bp_saved_pct ?? null,
    gThresh: 60, aThresh: 40, max: 100 },
  { key: 'bp_won', label: 'BP Won', category: 'clutch', isCount: false,
    extract: m => m.shot_stats?.bp_won_pct ?? null,
    oppExtract: m => (m.opp_shots as any)?.stats?.bp_won_pct ?? null,
    gThresh: 50, aThresh: 35, max: 100 },
  { key: 'fh_cc', label: 'FH CC In', category: 'groundstroke', isCount: false,
    extract: m => m.forehand?.cc_in ?? null,
    oppExtract: m => (m.opp_shots as any)?.forehand?.cc_in ?? null,
    gThresh: 80, aThresh: 70, max: 100 },
  { key: 'bh_cc', label: 'BH CC In', category: 'groundstroke', isCount: false,
    extract: m => m.backhand?.cc_in ?? null,
    oppExtract: m => (m.opp_shots as any)?.backhand?.cc_in ?? null,
    gThresh: 75, aThresh: 65, max: 100 },
  { key: 'bh_dtl', label: 'BH DTL In', category: 'groundstroke', isCount: false,
    extract: m => m.backhand?.dtl_in ?? null,
    oppExtract: m => (m.opp_shots as any)?.backhand?.dtl_in ?? null,
    gThresh: 70, aThresh: 60, max: 100 },
  { key: 'total_pts', label: 'Total Pts Won', category: 'overview', isCount: false,
    extract: m => m.shot_stats?.total_pts_won_pct ?? null,
    oppExtract: m => (m.opp_shots as any)?.stats?.total_pts_won_pct ?? null,
    gThresh: 55, aThresh: 45, max: 100 },
]

function computeAvg(matches: Match[], extract: (m: Match) => number | null): number | null {
  const vals = matches.map(extract).filter((v): v is number => v != null)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
}

function computeStd(matches: Match[], extract: (m: Match) => number | null): number | null {
  const vals = matches.map(extract).filter((v): v is number => v != null)
  if (vals.length < 3) return null
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.sqrt(vals.reduce((acc, x) => acc + (x - mean) ** 2, 0) / vals.length)
}

export function pickKeyStats(m: Match, allMatches: Match[], signals: Signal[]): KeyStat[] {
  const isWin = m.score?.winner === 'JD'
  const scored: { cand: Candidate; val: number; avg: number; opp: number | null; score: number; tag: string; tagColor: string }[] = []

  for (const cand of CANDIDATES) {
    const val = cand.extract(m)
    if (val == null) continue
    const avg = computeAvg(allMatches.filter(x => x.id !== m.id), cand.extract)
    if (avg == null) continue
    const std = computeStd(allMatches.filter(x => x.id !== m.id), cand.extract)
    const opp = cand.oppExtract ? cand.oppExtract(m) : null

    // 1. Deviation score (0-100)
    const z = std != null && std > 0 ? (val - avg) / std : (val - avg) / (avg * 0.15 || 1)
    const deviationScore = Math.min(Math.abs(z) * 33, 100)

    // 2. Outcome alignment (0-100)
    const isPositiveDeviation = cand.lower ? val < avg : val > avg
    let alignmentScore = 0
    if (isWin && isPositiveDeviation) alignmentScore = deviationScore
    if (!isWin && !isPositiveDeviation) alignmentScore = deviationScore

    // 3. Correlation score (0-100)
    const matchingSig = signals.find(s => s.key.includes(cand.key))
    const corrScore = matchingSig
      ? matchingSig.confidence === 'strong' ? 100 : matchingSig.confidence === 'moderate' ? 60 : 30
      : 0

    const totalScore = deviationScore * 0.5 + alignmentScore * 0.3 + corrScore * 0.2

    // Tag selection
    let tag = '', tagColor = MUTED
    const absZ = Math.abs(z)
    if (!isWin && !isPositiveDeviation && totalScore >= 50) { tag = 'Cost you the match'; tagColor = R }
    else if (isWin && isPositiveDeviation && totalScore >= 50) { tag = 'Won it here'; tagColor = G }
    else if (absZ >= 1.5 && isPositiveDeviation) { tag = 'Way above average'; tagColor = G }
    else if (absZ >= 1.5 && !isPositiveDeviation) { tag = 'Way below average'; tagColor = R }
    else if (corrScore >= 60) { tag = 'Your win predictor'; tagColor = B }
    else if (isWin && !isPositiveDeviation) { tag = 'Watch out'; tagColor = A }
    else if (!isWin && isPositiveDeviation) { tag = 'Bright spot'; tagColor = G }
    else { tag = 'Key stat'; tagColor = MUTED }

    scored.push({ cand, val, avg, opp, score: totalScore, tag, tagColor })
  }

  // Sort by score, enforce diversity (max 2 per category)
  scored.sort((a, b) => b.score - a.score)
  const result: KeyStat[] = []
  const categoryCounts: Record<string, number> = {}

  for (const item of scored) {
    if (result.length >= 4) break
    const cat = item.cand.category
    if ((categoryCounts[cat] ?? 0) >= 2) continue
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1

    const good = item.cand.lower ? item.val <= item.cand.gThresh : item.val >= item.cand.gThresh

    result.push({
      label: item.cand.label,
      val: item.val,
      valStr: item.cand.isCount ? `${item.val}` : `${item.val}%`,
      avg: item.avg,
      opp: item.opp ?? undefined,
      oppStr: item.opp != null ? (item.cand.isCount ? `${item.opp}` : `${item.opp}%`) : undefined,
      tag: item.tag,
      tagColor: item.tagColor,
      isCount: item.cand.isCount,
      good,
      gThresh: item.cand.gThresh,
      aThresh: item.cand.aThresh,
      max: item.cand.max,
      lower: item.cand.lower,
    })
  }

  return result
}
