'use client'
import { useEffect, useMemo, useState } from 'react'
import { G, R, A, B, FONT_BODY, FONT_DATA, FONT_DISPLAY,
         BG, BG2, BG3, BORDER, BORDER2, WHITE, MUTED, DIM, GOLD } from '@/app/lib/helpers'
import type { Match } from '@/app/types'
import { computeSignals } from '@/app/lib/signals/compute'
import { getBandMedians, gapToNext, utrToBand, type BenchmarkStat, type BenchmarkPoint } from '@/app/lib/analyst/benchmarks'
import { closestAtp } from '@/app/lib/signals/closestAtp'
import { computeStamina } from '@/app/lib/signals/stamina'
import { computeTempo } from '@/app/lib/signals/tempo'
import { computeVariety } from '@/app/lib/signals/variety'
import { pickTopOutliers } from '@/app/lib/signals/outliers'
import { generateVerdict } from '@/app/lib/signals/verdict'
import { strokesCoachRead, swingsCoachRead, bigMomentsCoachRead } from '@/app/lib/signals/coachReads'
import JDStats from './JDStats'

const FB = FONT_BODY, FD = FONT_DATA, FX = FONT_DISPLAY

// ─── SECTION HEADER ────────────────────────────────────────────────────────
const SH = ({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: MUTED }}>{children}</div>
    {sub && <div style={{ fontSize: 10, fontFamily: FD, color: '#555', marginTop: 4 }}>{sub}</div>}
  </div>
)

// ─── SPARKLINE ─────────────────────────────────────────────────────────────
function Sparkline({ data, color, w = 80, h = 16, showArrow = true, lower }: {
  data: (number | null | undefined)[]; color: string; w?: number; h?: number; showArrow?: boolean; lower?: boolean
}) {
  const valid = data.filter((v): v is number => v != null && !isNaN(v))
  if (valid.length < 2) return <div style={{ height: h }} />
  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 1
  const pts = data.map((v, i) => v == null ? null : { x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 2) - 1 })
  const path = pts.filter((p): p is { x: number; y: number } => p != null).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  if (!showArrow) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ overflow: 'visible', marginTop: 4, display: 'block' }}>
        <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      </svg>
    )
  }
  const half = Math.max(1, Math.floor(valid.length / 3))
  const firstAvg = valid.slice(0, half).reduce((a, b) => a + b, 0) / half
  const lastAvg = valid.slice(-half).reduce((a, b) => a + b, 0) / Math.min(half, valid.slice(-half).length)
  const delta = lastAvg - firstAvg
  const improving = lower ? delta < -1 : delta > 1
  const worsening = lower ? delta > 1 : delta < -1
  const arrow = improving ? '\u2191' : worsening ? '\u2193' : '\u2192'
  const arrowColor = improving ? G : worsening ? R : MUTED
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      </svg>
      <span style={{ fontSize: 10, color: arrowColor, fontFamily: FD }}>{arrow}</span>
    </div>
  )
}

// ─── TAG COLORS ────────────────────────────────────────────────────────────
const tagColors = (tag: string) => {
  if (tag === 'hidden_weapon' || tag === 'WEAPON' || tag === 'STRENGTH' || tag === 'RISING') return { c: G, bg: 'rgba(74,222,128,0.10)' }
  if (tag === 'reliable' || tag === 'RELIABLE') return { c: B, bg: 'rgba(96,165,250,0.10)' }
  if (tag === 'overused' || tag === 'OVERUSED' || tag === 'SLIPPING') return { c: A, bg: 'rgba(251,191,36,0.10)' }
  return { c: R, bg: 'rgba(248,113,113,0.10)' }
}

const tagLabel = (tag: string) => {
  if (tag === 'hidden_weapon') return 'WEAPON'
  if (tag === 'reliable') return 'RELIABLE'
  if (tag === 'overused') return 'OVERUSED'
  if (tag === 'liability') return 'FIX'
  return tag.toUpperCase()
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function avgN(matches: Match[], fn: (m: Match) => number | null | undefined): number | null {
  const v = matches.map(fn).filter((x): x is number => x != null && !isNaN(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

// ─── COACH READ BOX ────────────────────────────────────────────────────────
function CoachRead({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(196,169,106,0.04)', border: '1px solid rgba(196,169,106,0.15)', borderRadius: 10 }}>
      <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6, opacity: 0.7 }}>Coach read</div>
      <div style={{ fontSize: 12, color: '#cdd1c8', lineHeight: 1.5, fontStyle: 'italic' }}>
        &ldquo;{text}&rdquo;
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface MyGameProps {
  matches: Match[]
  avgs: any
}

export default function MyGame({ matches, avgs }: MyGameProps) {
  const [showStats, setShowStats] = useState(false)
  const [editingUtr, setEditingUtr] = useState(false)
  const [utrInput, setUtrInput] = useState('')
  const [utr, setUtr] = useState<{ value: number | null; updatedAt: string | null }>({ value: null, updatedAt: null })

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setUtr({ value: d.profile?.utr ?? null, updatedAt: d.profile?.utr_updated_at ?? null }))
      .catch(() => {})
  }, [])

  const saveUtr = async () => {
    const v = parseFloat(utrInput)
    if (isNaN(v) || v < 0 || v > 16) { setEditingUtr(false); return }
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utr: v }) })
    setUtr({ value: v, updatedAt: new Date().toISOString().slice(0, 10) })
    setEditingUtr(false)
  }

  // ─── SIGNALS ──────────────────────────────────────────────────────────
  const signals = useMemo(() => computeSignals(matches), [matches])
  const profile = signals.jdProfile
  const sortedMatches = useMemo(() => [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [matches])

  // ─── HERO DATA ────────────────────────────────────────────────────────
  const wins = matches.filter(m => m.score?.winner === 'JD').length
  const losses = matches.filter(m => m.score?.winner && m.score.winner !== 'JD').length
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : null
  const winRateColor = winRate == null ? MUTED : winRate >= 60 ? G : winRate >= 40 ? A : R
  const verdict = useMemo(() => generateVerdict(signals), [signals])

  // ─── PROFILE CHIPS ────────────────────────────────────────────────────
  const atpResult = useMemo(() => closestAtp(matches), [matches])
  const staminaResult = useMemo(() => computeStamina(matches), [matches])
  const tempoResult = useMemo(() => computeTempo(matches, utr.value), [matches, utr.value])
  const varietyResult = useMemo(() => computeVariety(signals.strokes), [signals.strokes])

  // ─── §3 OUTLIERS ──────────────────────────────────────────────────────
  const outliers = useMemo(() => pickTopOutliers(matches, utr.value, 4), [matches, utr.value])
  const careerFrame = useMemo(() => {
    if (outliers.length < 2) return null
    const good = outliers.find(o => o.lower ? o.delta < 0 : o.delta > 0)
    const bad = outliers.find(o => o.lower ? o.delta > 0 : o.delta < 0)
    if (good && bad) return `Your ${good.label.toLowerCase()} is built. Your ${bad.label.toLowerCase()} is leaking.`
    if (good) return `Your ${good.label.toLowerCase()} defines you.`
    if (bad) return `Your ${bad.label.toLowerCase()} is holding you back.`
    return null
  }, [outliers])

  // ─── §4 STROKES ───────────────────────────────────────────────────────
  const strokeCards = useMemo(() => {
    const cards: Array<{
      label: string; tag: string; pctIn: number; pctInDelta: number | null
      weRatio: string; weColor: string; usage: number | null; usageDelta: number | null
      pace: number | null; paceDelta: number | null; depth: number | null; depthDelta: number | null
      insight: string
    }> = []

    // Groundstroke cards from signals.strokes
    for (const s of signals.strokes) {
      // W/E ratio from shot_stats
      let weRatio = '\u2014'
      let weColor = MUTED
      const avgShotStats = matches.reduce<{ fhW: number; fhUE: number; bhW: number; bhUE: number; n: number }>(
        (acc, m) => {
          if (!m.shot_stats) return acc
          acc.fhW += m.shot_stats.fh_winners ?? 0
          acc.fhUE += m.shot_stats.fh_ue ?? 0
          acc.bhW += m.shot_stats.bh_winners ?? 0
          acc.bhUE += m.shot_stats.bh_ue ?? 0
          acc.n++
          return acc
        },
        { fhW: 0, fhUE: 0, bhW: 0, bhUE: 0, n: 0 }
      )
      if (avgShotStats.n > 0) {
        const isFH = s.stroke.startsWith('fh')
        const w = isFH ? avgShotStats.fhW / avgShotStats.n : avgShotStats.bhW / avgShotStats.n
        const e = isFH ? avgShotStats.fhUE / avgShotStats.n : avgShotStats.bhUE / avgShotStats.n
        if (e > 0) {
          const ratio = w / e
          weRatio = ratio.toFixed(1)
          weColor = ratio >= 1 ? G : R
        }
      }

      // Band deltas for pctIn
      const benchKey = s.stroke === 'fh_cc' ? 'fh_cc_in' :
                       s.stroke === 'fh_dtl' ? 'fh_dtl_in' :
                       s.stroke === 'bh_cc' ? 'bh_cc_in' :
                       'bh_dtl_in' as BenchmarkStat
      const bench = getBandMedians(benchKey, utr.value)
      const pctInDelta = bench ? Math.round(s.pctIn - bench.current) : null

      // Pace delta: use bench rally pace from tempo as approximate reference
      const paceDelta: number | null = null // no per-stroke pace benchmark yet

      // Depth from groundstroke data
      const isFH = s.stroke.startsWith('fh')
      const isCC = s.stroke.endsWith('cc')
      const depthVals = sortedMatches.map(m => {
        const gs = isFH ? m.forehand : m.backhand
        return isCC ? gs?.depth_cc : gs?.depth_dtl
      }).filter((v): v is number => v != null && !isNaN(v))
      const depth = depthVals.length ? Math.round(depthVals.reduce((a, b) => a + b, 0) / depthVals.length) : null
      const depthDelta: number | null = null // no depth benchmark yet

      cards.push({
        label: s.label,
        tag: s.tag,
        pctIn: Math.round(s.pctIn),
        pctInDelta,
        weRatio,
        weColor,
        usage: s.usage != null ? Math.round(s.usage) : null,
        usageDelta: null, // no usage benchmark
        pace: s.pace != null ? Math.round(s.pace) : null,
        paceDelta,
        depth,
        depthDelta,
        insight: s.insight,
      })
    }

    // Serve cards
    const s1PctAd = avgN(matches, m => m.serve?.first?.pct_ad)
    const s1PctDu = avgN(matches, m => m.serve?.first?.pct_deuce)
    const s1Pct = s1PctAd != null || s1PctDu != null
      ? Math.round(((s1PctAd ?? 0) + (s1PctDu ?? 0)) / ((s1PctAd != null ? 1 : 0) + (s1PctDu != null ? 1 : 0)))
      : null
    const s1Bench = getBandMedians('first_serve_pct', utr.value)
    const s1Delta = s1Pct != null && s1Bench ? Math.round(s1Pct - s1Bench.current) : null
    const s1Pace = avgN(matches, m => {
      const ad = m.serve?.first?.spd_ad, du = m.serve?.first?.spd_deuce
      if (ad == null && du == null) return null
      return Math.round(((ad ?? 0) + (du ?? 0)) / ((ad != null ? 1 : 0) + (du != null ? 1 : 0)))
    })
    const s1PtsWon = avgN(matches, m => m.shot_stats?.s1_pts_won_pct)
    const s1Aces = avgN(matches, m => m.shot_stats?.aces)
    const s1Df = avgN(matches, m => m.shot_stats?.df)
    // W/E for serve: aces+service_winners / df
    let s1WeRatio = '\u2014'
    let s1WeColor = MUTED
    const s1Wins = (s1Aces ?? 0) + (avgN(matches, m => m.shot_stats?.service_winners) ?? 0)
    if (s1Df != null && s1Df > 0 && s1Wins > 0) {
      const r = s1Wins / s1Df
      s1WeRatio = r.toFixed(1)
      s1WeColor = r >= 1 ? G : R
    }

    if (s1Pct != null) {
      cards.push({
        label: '1st Serve',
        tag: s1Delta != null && s1Delta >= 0 ? 'reliable' : 'liability',
        pctIn: s1Pct,
        pctInDelta: s1Delta,
        weRatio: s1WeRatio,
        weColor: s1WeColor,
        usage: null,
        usageDelta: null,
        pace: s1Pace,
        paceDelta: null,
        depth: null,
        depthDelta: null,
        insight: s1Delta != null && s1Delta < -3 ? 'Pace is there but % is slipping.' :
                 s1Delta != null && s1Delta >= 3 ? 'Strong and reliable.' :
                 'Solid foundation.',
      })
    }

    const s2PctAd = avgN(matches, m => m.serve?.second?.pct_ad)
    const s2PctDu = avgN(matches, m => m.serve?.second?.pct_deuce)
    const s2Pct = s2PctAd != null || s2PctDu != null
      ? Math.round(((s2PctAd ?? 0) + (s2PctDu ?? 0)) / ((s2PctAd != null ? 1 : 0) + (s2PctDu != null ? 1 : 0)))
      : null
    const s2Pace = avgN(matches, m => {
      const ad = m.serve?.second?.spd_ad, du = m.serve?.second?.spd_deuce
      if (ad == null && du == null) return null
      return Math.round(((ad ?? 0) + (du ?? 0)) / ((ad != null ? 1 : 0) + (du != null ? 1 : 0)))
    })
    const s2PtsWon = avgN(matches, m => m.shot_stats?.s2_pts_won_pct)

    if (s2Pct != null) {
      cards.push({
        label: '2nd Serve',
        tag: s2PtsWon != null && s2PtsWon >= 45 ? 'reliable' : 'liability',
        pctIn: s2Pct,
        pctInDelta: null,
        weRatio: '\u2014',
        weColor: MUTED,
        usage: null,
        usageDelta: null,
        pace: s2Pace,
        paceDelta: null,
        depth: null,
        depthDelta: null,
        insight: s2PtsWon != null && s2PtsWon < 40 ? 'Safe but toothless \u2014 returners attack it.' :
                 'Gets the job done.',
      })
    }

    return cards
  }, [signals.strokes, matches, sortedMatches, utr.value])

  // ─── §6 SWINGS ────────────────────────────────────────────────────────
  const swings = useMemo(() => {
    const allSignals = [
      ...signals.correlations.map(s => ({ ...s, cat: 'stat' as const })),
      ...signals.journal.map(s => ({ ...s, cat: 'journal' as const })),
    ].sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift)).slice(0, 6)
    return allSignals
  }, [signals.correlations, signals.journal])

  // ─── §7 BIG MOMENTS ──────────────────────────────────────────────────
  const bigMoments = useMemo(() => {
    const moments: Array<{ label: string; record: string; context: string; baseline: string; good: boolean }> = []

    // Break points
    const bpWonAvg = avgN(matches, m => m.shot_stats?.bp_won_pct)
    const retAvg = avgN(matches, m => m.shot_stats?.return_pts_won_pct)
    if (bpWonAvg != null) {
      moments.push({
        label: 'Break points',
        record: `${bpWonAvg}%`,
        context: 'BP won',
        baseline: retAvg != null ? `vs ${retAvg}% return avg` : '',
        good: bpWonAvg >= (retAvg ?? 40),
      })
    }

    // Deciding sets
    const threeSetMatches = matches.filter(m => m.score?.sets_arr && m.score.sets_arr.length === 3)
    if (threeSetMatches.length >= 2) {
      const threeSetWins = threeSetMatches.filter(m => m.score?.winner === 'JD').length
      const threeSetLosses = threeSetMatches.length - threeSetWins
      const pct = Math.round((threeSetWins / threeSetMatches.length) * 100)
      moments.push({
        label: 'Deciding sets',
        record: `${threeSetWins}-${threeSetLosses}`,
        context: '3rd set record',
        baseline: `${pct}% W rate`,
        good: pct >= 50,
      })
    }

    // Tiebreaks
    const tbData = matches.reduce<{ w: number; l: number }>((acc, m) => {
      if (!m.score?.sets_arr) return acc
      for (const set of m.score.sets_arr) {
        if ((set[0] === 7 && set[1] === 6) || (set[0] === 6 && set[1] === 7)) {
          if (set[0] > set[1]) acc.w++
          else acc.l++
        }
      }
      return acc
    }, { w: 0, l: 0 })
    if (tbData.w + tbData.l >= 2) {
      const pct = Math.round((tbData.w / (tbData.w + tbData.l)) * 100)
      moments.push({
        label: 'Tiebreaks',
        record: `${tbData.w}-${tbData.l}`,
        context: 'TB record',
        baseline: `${pct}% W rate`,
        good: pct >= 50,
      })
    }

    // Tight matches (no set gap > 2)
    const tightMatches = matches.filter(m => {
      if (!m.score?.sets_arr || m.score.sets_arr.length === 0) return false
      return m.score.sets_arr.every(s => Math.abs(s[0] - s[1]) <= 2)
    })
    if (tightMatches.length >= 2) {
      const tightWins = tightMatches.filter(m => m.score?.winner === 'JD').length
      const tightLosses = tightMatches.length - tightWins
      const pct = Math.round((tightWins / tightMatches.length) * 100)
      moments.push({
        label: 'Tight matches',
        record: `${tightWins}-${tightLosses}`,
        context: 'no set gap > 2',
        baseline: `${pct}% W rate`,
        good: pct >= 50,
      })
    }

    return moments
  }, [matches])

  // ─── §8 PATH TO NEXT UTR ─────────────────────────────────────────────
  const utrBand = utrToBand(utr.value)
  const nextBandNum = utr.value != null ? (Math.floor(utr.value * 2) / 2 + 0.5).toFixed(1) : null
  const nextBandStr = utr.value != null ? `${(Math.floor(utr.value * 2) / 2 + 0.5).toFixed(1)}-${(Math.floor(utr.value * 2) / 2 + 1.0).toFixed(1)}` : null

  const topGaps = useMemo(() => {
    type GapRow = { verb: string; label: string; gap: number; you: number; target: number; unit: string }
    const gaps: GapRow[] = []
    const pushGap = (verb: string, label: string, you: number | null, bench: BenchmarkPoint | null, unit: string) => {
      if (you == null || !bench || bench.next == null) return
      const g = gapToNext(you, bench)
      if (g > 0) gaps.push({ verb, label, gap: g, you, target: bench.next, unit })
    }

    const ueAvg = avgN(matches, m => m.shot_stats?.ue)
    const winnersAvg = avgN(matches, m => m.shot_stats?.winners)
    const s1Avg = avgN(matches, m => {
      const ad = m.serve?.first?.pct_ad, dc = m.serve?.first?.pct_deuce
      if (ad == null && dc == null) return null
      return Math.round(((ad ?? 0) + (dc ?? 0)) / ((ad != null ? 1 : 0) + (dc != null ? 1 : 0)))
    })
    const retAvg = avgN(matches, m => m.shot_stats?.return_pts_won_pct)
    const bpWonAvg = avgN(matches, m => m.shot_stats?.bp_won_pct)
    const totalPtsAvg = avgN(matches, m => m.shot_stats?.total_pts_won_pct)

    const ueBench = getBandMedians('ue_per_match', utr.value)
    const winnersBench = getBandMedians('winners_per_match', utr.value)
    const s1Bench = getBandMedians('first_serve_pct', utr.value)
    const retBench = getBandMedians('return_pts_won_pct', utr.value)
    const bpWonBench = getBandMedians('bp_won_pct', utr.value)
    const totalPtsBench = getBandMedians('total_pts_won_pct', utr.value)

    pushGap(`Cut UE to ${ueBench?.next ?? '?'}/match`, 'Unforced errors', ueAvg, ueBench, '/match')
    pushGap(`Get winners to ${winnersBench?.next ?? '?'}/match`, 'Winners', winnersAvg, winnersBench, '/match')
    pushGap(`Get 1st serve to ${s1Bench?.next ?? '?'}%`, '1st serve %', s1Avg, s1Bench, '%')
    pushGap(`Get return pts to ${retBench?.next ?? '?'}%`, 'Return pts won', retAvg, retBench, '%')
    pushGap(`Get BP won to ${bpWonBench?.next ?? '?'}%`, 'BP won', bpWonAvg, bpWonBench, '%')
    pushGap(`Get total pts to ${totalPtsBench?.next ?? '?'}%`, 'Total pts won', totalPtsAvg, totalPtsBench, '%')

    return gaps
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2)
  }, [matches, utr.value])

  // ─── §9 MATCHUPS — group by data-derived style from opponentProfiles ──
  const styleMatchups = useMemo(() => {
    const byStyle: Record<string, Match[]> = {}
    for (const m of matches) {
      const oppName = m.opponent?.name
      if (!oppName) continue
      // Use data-derived style from signals, not journal
      const oppProfile = signals.opponentProfiles[oppName]
      const style = oppProfile?.style?.label
      if (!style || style === 'Unknown') continue
      if (!byStyle[style]) byStyle[style] = []
      byStyle[style].push(m)
    }
    return Object.entries(byStyle)
      .filter(([, ms]) => ms.length >= 2)
      .map(([style, ms]) => {
        const w = ms.filter(m => m.score?.winner === 'JD').length
        const l = ms.length - w
        // Edge stat: winners avg vs overall winners avg
        const winnersAvgStyle = avgN(ms, m => m.shot_stats?.winners) ?? 0
        const winnersAvgAll = avgN(matches, m => m.shot_stats?.winners) ?? 0
        // Leak stat: UE avg vs overall
        const ueAvgStyle = avgN(ms, m => m.shot_stats?.ue) ?? 0
        const ueAvgAll = avgN(matches, m => m.shot_stats?.ue) ?? 0
        return {
          style,
          n: ms.length,
          w, l,
          edge: { label: 'Winners', val: winnersAvgStyle, avg: winnersAvgAll, lower: false },
          weak: { label: 'UE', val: ueAvgStyle, avg: ueAvgAll, lower: true },
        }
      })
      .sort((a, b) => b.n - a.n)
  }, [matches])

  const rivals = useMemo(() => {
    return Object.values(signals.opponentProfiles)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 6)
      .map(o => {
        const oppMatches = [...matches.filter(m => m.opponent?.name === o.name)]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const w = oppMatches.filter(m => m.score?.winner === 'JD').length
        const l = oppMatches.length - w
        const h2h = oppMatches.map(m => m.score?.winner === 'JD' ? 1 : 0).reverse()
        return {
          name: o.name,
          style: o.style.label,
          w, l, h2h,
          lastMatchId: oppMatches[0]?.id ?? null,
        }
      })
  }, [matches, signals.opponentProfiles])

  const hasAnyStats = matches.some(m => m.shot_stats != null || m.serve != null)
  const hasShotData = matches.some(m => (m as any).has_shot_data)

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div>

      {/* ══════════════════════════════════════════════════════════════════
          S1 . HERO -- WIN% + UTR loud, gradient, sandwich verdict
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'radial-gradient(ellipse at top, #1a2a1f 0%, #0d0d0d 70%)',
        border: '1px solid rgba(196,169,106,0.30)',
        borderRadius: 24, padding: '28px 22px 24px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 0 60px rgba(74,222,128,0.04) inset, 0 0 0 1px rgba(196,169,106,0.06)',
      }}>
        {/* gold corner glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(196,169,106,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* style label */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: GOLD, letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.85 }}>
            {profile?.style.label ?? 'Log more matches'}
          </div>
          {profile && (
            <div style={{ fontSize: 9, fontFamily: FD, color: DIM, marginTop: 3, letterSpacing: '0.5px' }}>
              W/UE {profile.aggression.index > 0 ? '+' : ''}{profile.aggression.index} per match
            </div>
          )}
        </div>

        {/* TWO HERO STATS -- WIN % + UTR side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, alignItems: 'center', marginBottom: 22, position: 'relative' }}>
          {/* WIN RATE */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FX, fontSize: 72, color: winRateColor, lineHeight: 0.9, letterSpacing: '1px', textShadow: `0 0 40px ${winRateColor}33` }}>
              {winRate != null ? <>{winRate}<span style={{ fontSize: 38, marginLeft: 1 }}>%</span></> : '\u2014'}
            </div>
            <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 4 }}>Win rate</div>
            <div style={{ fontSize: 11, fontFamily: FD, color: DIM, marginTop: 4 }}>
              <span style={{ color: G }}>{wins}W</span> · <span style={{ color: R }}>{losses}L</span>
            </div>
          </div>

          {/* divider */}
          <div style={{ height: 80, width: 1, background: 'linear-gradient(180deg, transparent, rgba(196,169,106,0.30), transparent)' }} />

          {/* UTR */}
          <div style={{ textAlign: 'center' }}>
            {editingUtr ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" step={0.1} min={0} max={16}
                  value={utrInput}
                  onChange={e => setUtrInput(e.target.value)}
                  autoFocus
                  style={{ width: 64, background: BG3, color: WHITE, border: `1px solid ${BORDER2}`, borderRadius: 6, padding: '4px 8px', fontFamily: FD, fontSize: 13, textAlign: 'center' }}
                />
                <button onClick={saveUtr} style={{ background: GOLD, color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontFamily: FB, fontWeight: 600, cursor: 'pointer' }}>Save</button>
              </div>
            ) : (
              <div onClick={() => { setUtrInput(utr.value?.toString() ?? ''); setEditingUtr(true) }} style={{ cursor: 'pointer' }}>
                <div style={{ fontFamily: FX, fontSize: 72, color: GOLD, lineHeight: 0.9, letterSpacing: '1px', textShadow: '0 0 40px rgba(196,169,106,0.20)' }}>
                  {utr.value ?? '\u2014'}
                </div>
                <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 4 }}>UTR</div>
                <div style={{ fontSize: 11, fontFamily: FD, color: DIM, marginTop: 4 }}>
                  {utr.value != null ? `band ${utrBand}` : 'tap to set'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MOURINHO ONE-LINER */}
        <div style={{ borderTop: '1px solid rgba(196,169,106,0.15)', paddingTop: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#e0d8c4', lineHeight: 1.5, fontStyle: 'italic', fontFamily: FB }}>
            &ldquo;{verdict}&rdquo;
          </div>
          <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 10, opacity: 0.6 }}>
            &mdash; the read
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          S2 . PROFILE -- Weapon + Weak spot heroes + 6 chips
          ══════════════════════════════════════════════════════════════════ */}
      {profile ? (
        <div style={{ marginBottom: 28 }}>
          <SH>Profile</SH>

          {/* Hero pair: Weapon (green) + Weak spot (red) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ background: 'linear-gradient(160deg, rgba(74,222,128,0.08), rgba(74,222,128,0.02))', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, padding: '14px 14px' }}>
              <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: G, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>{'\u2191'} Weapon</div>
              <div style={{ fontSize: 14, color: WHITE, fontWeight: 700, lineHeight: 1.2 }}>{profile.weapon.label !== 'Unknown' ? profile.weapon.label : 'Developing'}</div>
              <div style={{ fontSize: 10, fontFamily: FD, color: G, marginTop: 6, opacity: 0.85, lineHeight: 1.3 }}>{profile.weapon.evidence}</div>
            </div>
            <div style={{ background: 'linear-gradient(160deg, rgba(248,113,113,0.08), rgba(248,113,113,0.02))', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '14px 14px' }}>
              <div style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: R, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>{'\u2193'} Weak spot</div>
              <div style={{ fontSize: 14, color: WHITE, fontWeight: 700, lineHeight: 1.2 }}>{profile.weakness.label !== 'Unknown' ? profile.weakness.label : 'Developing'}</div>
              <div style={{ fontSize: 10, fontFamily: FD, color: R, marginTop: 6, opacity: 0.85, lineHeight: 1.3 }}>{profile.weakness.evidence}</div>
            </div>
          </div>

          {/* 6 chips: Closest ATP, Engine, Tempo, Stamina, Clutch, Variety */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Closest ATP</div>
              <div style={{ fontSize: 11, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>{atpResult?.player.name.split(' ').pop() ?? '\u2014'}</div>
              <div style={{ fontSize: 9, fontFamily: FD, color: GOLD, marginTop: 4, opacity: 0.7, lineHeight: 1.3 }}>{atpResult ? `${atpResult.similarity}% match` : 'need more data'}</div>
            </div>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Engine</div>
              <div style={{ fontSize: 11, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>{profile.aggression.index >= 3 ? 'Aggressive' : profile.aggression.index >= 0 ? 'Balanced' : 'Conservative'}</div>
              <div style={{ fontSize: 9, fontFamily: FD, color: GOLD, marginTop: 4, opacity: 0.7, lineHeight: 1.3 }}>W/UE {profile.aggression.index > 0 ? '+' : ''}{profile.aggression.index}</div>
            </div>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Tempo</div>
              <div style={{ fontSize: 11, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>{tempoResult?.label ?? '\u2014'}</div>
              <div style={{ fontSize: 9, fontFamily: FD, color: GOLD, marginTop: 4, opacity: 0.7, lineHeight: 1.3 }}>{tempoResult?.insight ?? 'need more data'}</div>
            </div>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Stamina</div>
              <div style={{ fontSize: 11, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>
                {staminaResult ? (staminaResult.threeSetWinPct >= 65 ? 'Holds late' : staminaResult.threeSetWinPct >= 45 ? 'Even fade' : 'Drops late') : '\u2014'}
              </div>
              <div style={{ fontSize: 9, fontFamily: FD, color: GOLD, marginTop: 4, opacity: 0.7, lineHeight: 1.3 }}>{staminaResult?.insight ?? 'need 3-setters'}</div>
            </div>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Clutch</div>
              <div style={{ fontSize: 11, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>{profile.clutch.delta > 0 ? '+' : ''}{profile.clutch.delta} pts</div>
              <div style={{ fontSize: 9, fontFamily: FD, color: GOLD, marginTop: 4, opacity: 0.7, lineHeight: 1.3 }}>BP vs baseline</div>
            </div>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Variety</div>
              <div style={{ fontSize: 11, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>{varietyResult.label}</div>
              <div style={{ fontSize: 9, fontFamily: FD, color: GOLD, marginTop: 4, opacity: 0.7, lineHeight: 1.3 }}>{varietyResult.insight}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: MUTED }}>Log a few more matches to unlock your player profile.</div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S3 . THE NUMBERS THAT DEFINE YOU -- 4 outlier cards
          ══════════════════════════════════════════════════════════════════ */}
      {outliers.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SH>The numbers that define you</SH>
          {careerFrame && (
            <div style={{ fontSize: 13, color: '#cdd1c8', fontStyle: 'italic', lineHeight: 1.4, marginBottom: 14, marginTop: -4 }}>
              &ldquo;{careerFrame}&rdquo;
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {outliers.map(o => {
              // STATE vs band
              const deltaGood = o.lower ? o.delta < 0 : o.delta > 0
              const deltaColor = o.delta === 0 ? MUTED : (deltaGood ? G : R)
              // TREND
              const trendColor = o.trend === 'flat' ? MUTED : (o.trendGood ? G : R)
              const arrow = o.trend === 'up' ? '\u2191' : o.trend === 'down' ? '\u2193' : '\u2192'
              return (
                <div key={o.key} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: '#777', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{o.label}</span>
                    <span style={{ fontSize: 16, color: trendColor, fontFamily: FD, lineHeight: 1, fontWeight: 700 }}>{arrow}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 32, fontFamily: FD, fontWeight: 700, color: WHITE, lineHeight: 1 }}>{o.val}{o.unit === '%' ? '%' : ''}</span>
                    {o.unit !== '%' && <span style={{ fontSize: 11, fontFamily: FD, color: '#555' }}>{o.unit}</span>}
                    <span style={{ fontSize: 13, fontFamily: FD, fontWeight: 700, color: deltaColor, marginLeft: 'auto' }}>
                      {o.delta > 0 ? '+' : ''}{o.delta}
                    </span>
                  </div>
                  <Sparkline data={o.series} color={trendColor} showArrow={false} />
                </div>
              )
            })}
          </div>
          {/* dual legend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: MUTED, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
                Delta vs <span style={{ color: GOLD }}>UTR {utr.value ?? '\u2014'}</span> band
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9, fontFamily: FD, color: '#888' }}>
                <span><span style={{ color: G }}>+N</span> better than band</span>
                <span><span style={{ color: R }}>{'\u2212'}N</span> worse than band</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontFamily: FB, fontWeight: 700, color: MUTED, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
                Trend (last {matches.length} matches)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9, fontFamily: FD, color: '#888' }}>
                <span><span style={{ color: G }}>{'\u2191'}</span> improving · <span style={{ color: R }}>{'\u2193'}</span> declining · <span style={{ color: MUTED }}>{'\u2192'}</span> steady</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S4 . YOUR STROKES -- Alt A layout with real data
          ══════════════════════════════════════════════════════════════════ */}
      {strokeCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SH sub={<>vs band · W/E = winners per error on this stroke</>}>Your strokes</SH>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {strokeCards.map((s, i) => {
              const t = tagColors(s.tag)
              const fmtD = (d: number | null) => d == null ? '' : d > 0 ? `+${d}` : `${d}`
              const dCol = (d: number | null) => d == null || d === 0 ? MUTED : d > 0 ? G : R
              return (
                <div key={i} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 12px 10px' }}>
                  {/* row 1: label + W/E ratio + tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>{s.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 10, fontFamily: FD, fontWeight: 700, color: s.weColor }}>{s.weRatio}</span>
                      <span style={{ fontSize: 8, fontFamily: FD, color: '#555' }}>W/E</span>
                      <span style={{ fontSize: 7, fontFamily: FD, padding: '2px 5px', borderRadius: 3, color: t.c, background: t.bg, fontWeight: 700 }}>{tagLabel(s.tag)}</span>
                    </div>
                  </div>
                  {/* row 2: hero IN% big, delta on same line */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 28, fontFamily: FD, fontWeight: 700, color: WHITE, lineHeight: 1 }}>{s.pctIn}%</span>
                    <span style={{ fontSize: 11, fontFamily: FD, fontWeight: 600, color: dCol(s.pctInDelta) }}>{fmtD(s.pctInDelta)}</span>
                    <span style={{ fontSize: 8, color: '#555', fontFamily: FD, marginLeft: 'auto' }}>IN</span>
                  </div>
                  {/* row 3: secondary stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, fontFamily: FD, color: '#888', marginBottom: 8 }}>
                    {s.usage != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>USE</span>
                        <span><span style={{ color: WHITE }}>{s.usage}%</span> {s.usageDelta != null && <span style={{ color: dCol(s.usageDelta) }}>{fmtD(s.usageDelta)}</span>}</span>
                      </div>
                    )}
                    {s.pace != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>PACE</span>
                        <span><span style={{ color: WHITE }}>{s.pace}</span> {s.paceDelta != null && <span style={{ color: dCol(s.paceDelta) }}>{fmtD(s.paceDelta)}</span>}</span>
                      </div>
                    )}
                    {s.depth != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>DEEP</span>
                        <span><span style={{ color: WHITE }}>{s.depth}%</span> {s.depthDelta != null && <span style={{ color: dCol(s.depthDelta) }}>{fmtD(s.depthDelta)}</span>}</span>
                      </div>
                    )}
                  </div>
                  {/* row 4: insight */}
                  <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>{s.insight}</div>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10, fontSize: 9, fontFamily: FD, color: '#555' }}>
            <span>W/E = winners per error</span>
            <span><span style={{ color: G }}>+N</span> above band</span>
            <span><span style={{ color: R }}>{'\u2212'}N</span> below band</span>
          </div>
          {/* Coach read */}
          <CoachRead text={strokesCoachRead(signals.strokes)} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S5 . YOUR MOVES -- gated on has_shot_data
          ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        // Aggregate top_patterns from all matches with shot data
        const allPatterns: { label: string; count: number; pctOfWinners: number; star: boolean }[] = []
        const patternCounts: Record<string, number> = {}
        let totalWinners = 0
        const shotMatches = matches.filter(m => (m as any).has_shot_data)
        for (const m of shotMatches) {
          const pats = (m.shot_stats as any)?.top_patterns
          const tw = (m.shot_stats as any)?.total_winners_from_patterns ?? 0
          totalWinners += tw
          if (Array.isArray(pats)) {
            for (const p of pats) {
              patternCounts[p.label] = (patternCounts[p.label] || 0) + p.count
            }
          }
        }
        const sorted = Object.entries(patternCounts)
          .map(([label, count]) => ({ label, count, pctOfWinners: totalWinners > 0 ? Math.round((count / totalWinners) * 100) : 0, star: false }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
        if (sorted.length > 0) sorted[0].star = true

        if (!hasShotData) return (
          <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 28 }}>
            <SH>Your moves</SH>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              Log matches with SwingVision xlsx to unlock your tactical playbook.
            </div>
          </div>
        )

        if (sorted.length === 0) return (
          <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 28 }}>
            <SH>Your moves</SH>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              Shot data logged for {shotMatches.length} matches but no winner patterns detected yet.
            </div>
          </div>
        )

        return (
          <div style={{ marginBottom: 28 }}>
            <SH sub={<>your tactical playbook · N={shotMatches.length} matches</>}>Your moves</SH>
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '4px 0' }}>
              {sorted.map((m, i) => (
                <div key={i} style={{ padding: '14px 14px', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {m.star && <span style={{ color: GOLD, fontSize: 12 }}>★</span>}
                    <span style={{ fontSize: 13, color: WHITE, fontWeight: 700, flex: 1 }}>{m.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 18, fontFamily: FD, fontWeight: 700, color: m.star ? GOLD : WHITE }}>{m.pctOfWinners}%</span>
                      <span style={{ fontSize: 8, fontFamily: FD, color: '#555', marginLeft: 3 }}>of winners</span>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <span style={{ fontSize: 18, fontFamily: FD, fontWeight: 700, color: '#777' }}>×{m.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10, fontSize: 9, fontFamily: FD, color: '#555' }}>
              <span>% of winners = frequency across {shotMatches.length} matches</span>
            </div>
          </div>
        )
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          S6 . WHAT SWINGS MATCHES -- minimal table
          ══════════════════════════════════════════════════════════════════ */}
      {swings.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SH>What swings matches</SH>
          <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 44px 44px', gap: 8, padding: '10px 14px 8px', alignItems: 'end' }}>
              <span />
              <span style={{ fontSize: 7, fontFamily: FD, color: '#555', letterSpacing: '1px', textAlign: 'right' }}>IMPACT</span>
              <span style={{ fontSize: 7, fontFamily: FD, color: '#555', letterSpacing: '1px', textAlign: 'right' }}>W/O</span>
              <span style={{ fontSize: 7, fontFamily: FD, color: '#555', letterSpacing: '1px', textAlign: 'right' }}>WITH</span>
            </div>
            {/* rows */}
            {swings.map((s, i) => {
              const above = s.winRateAbove ?? 0
              const below = s.winRateBelow ?? 0
              const multiplier = below > 0 ? (above / below).toFixed(1) : '\u2014'
              const catLabel = s.cat === 'journal' ? '\ud83d\udccb ' : ''
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 44px 44px', gap: 8, padding: '11px 14px', borderTop: `1px solid ${BORDER}`, alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{catLabel}{s.label}</span>
                    <div style={{ fontSize: 9, fontFamily: FD, color: DIM, marginTop: 2 }}>N={s.matchesUsed}</div>
                  </div>
                  <span style={{ fontSize: 15, fontFamily: FD, fontWeight: 700, color: GOLD, textAlign: 'right' }}>{multiplier}{'\u00d7'}</span>
                  <span style={{ fontSize: 13, fontFamily: FD, color: '#666', textAlign: 'right' }}>{below}%</span>
                  <span style={{ fontSize: 13, fontFamily: FD, fontWeight: 600, color: WHITE, textAlign: 'right' }}>{above}%</span>
                </div>
              )
            })}
          </div>
          {/* legend */}
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, fontFamily: FD, color: '#555' }}>
            <span style={{ color: GOLD }}>N{'\u00d7'}</span> = how many times more likely to win when condition is met
          </div>
          {/* Coach read */}
          <CoachRead text={swingsCoachRead(signals.correlations, signals.journal)} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S7 . THE BIG MOMENTS -- pressure table
          ══════════════════════════════════════════════════════════════════ */}
      {bigMoments.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SH>The big moments</SH>
          <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px auto', gap: 8, padding: '10px 14px 8px', alignItems: 'end' }}>
              <span style={{ fontSize: 7, fontFamily: FD, color: '#555', letterSpacing: '1px' }}>SITUATION</span>
              <span style={{ fontSize: 7, fontFamily: FD, color: '#555', letterSpacing: '1px', textAlign: 'right' }}>RECORD</span>
              <span style={{ fontSize: 7, fontFamily: FD, color: '#555', letterSpacing: '1px', textAlign: 'right' }}>BASELINE</span>
            </div>
            {bigMoments.map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px auto', gap: 8, padding: '11px 14px', borderTop: `1px solid ${BORDER}`, alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{m.label}</span>
                  <div style={{ fontSize: 9, fontFamily: FD, color: DIM, marginTop: 2 }}>{m.context}</div>
                </div>
                <span style={{ fontSize: 15, fontFamily: FD, fontWeight: 700, color: m.good ? G : R, textAlign: 'right' }}>{m.record}</span>
                <span style={{ fontSize: 10, fontFamily: FD, color: '#666', textAlign: 'right' }}>{m.baseline}</span>
              </div>
            ))}
          </div>
          {/* Coach read */}
          <CoachRead text={bigMomentsCoachRead(bigMoments)} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S8 . HOW YOU GET TO NEXT BAND -- tightened path
          ══════════════════════════════════════════════════════════════════ */}
      {topGaps.length > 0 && nextBandNum && (
        <div style={{ background: 'rgba(196,169,106,0.04)', border: '1px solid rgba(196,169,106,0.20)', borderRadius: 16, padding: '18px 20px', marginBottom: 28 }}>
          <SH>How you get to {nextBandNum}</SH>
          <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5, marginBottom: 14, fontStyle: 'italic' }}>
            Close these two numbers and the rating follows.
          </div>
          {topGaps.map((g, i) => (
            <div key={i} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid rgba(196,169,106,0.10)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, color: WHITE, fontWeight: 700 }}>{g.verb}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: FD, marginTop: 6, alignItems: 'center' }}>
                <span style={{ color: A }}>{g.you}{g.unit}</span>
                <span style={{ color: '#444' }}>{'\u2192'}</span>
                <span style={{ color: GOLD, fontWeight: 600 }}>{g.target}{g.unit}</span>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 9, fontFamily: FD, color: DIM, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(196,169,106,0.10)' }}>
            benchmarks · synthetic v1 · band {utrBand}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S9 . MATCHUPS -- 2-col cards + rivals
          ══════════════════════════════════════════════════════════════════ */}
      {(styleMatchups.length > 0 || rivals.length > 0) && (
        <div style={{ marginBottom: 28 }}>
          {styleMatchups.length > 0 && (
            <>
              <SH>Matchups</SH>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                {styleMatchups.map(m => {
                  const wPct = Math.round((m.w / m.n) * 100)
                  const c = wPct >= 60 ? G : wPct >= 40 ? A : R
                  const eDelta = +(m.edge.val - m.edge.avg).toFixed(1)
                  const wDelta = +(m.weak.val - m.weak.avg).toFixed(1)
                  return (
                    <div key={m.style} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 12px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: WHITE, fontWeight: 700 }}>{m.style}</span>
                        <span style={{ fontSize: 15, fontFamily: FD, fontWeight: 700, color: c }}>{m.w}-{m.l}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: FD, marginBottom: 4 }}>
                        <span style={{ color: '#777' }}>{m.edge.label}</span>
                        <span><span style={{ color: WHITE, fontWeight: 600 }}>{m.edge.val}</span> <span style={{ color: eDelta >= 0 ? G : R, fontSize: 9 }}>{eDelta > 0 ? '+' : ''}{eDelta}</span></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: FD, marginBottom: 6 }}>
                        <span style={{ color: '#777' }}>{m.weak.label}</span>
                        <span><span style={{ color: WHITE, fontWeight: 600 }}>{m.weak.val}</span> <span style={{ color: (m.weak.lower ? wDelta <= 0 : wDelta >= 0) ? G : R, fontSize: 9 }}>{wDelta > 0 ? '+' : ''}{wDelta}</span></span>
                      </div>
                      <div style={{ fontSize: 9, fontFamily: FD, color: DIM }}>N={m.n}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {rivals.length > 0 && (
            <>
              <SH>Rivals</SH>
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                {rivals.map((r, i) => {
                  const c = r.w >= r.l ? G : R
                  return (
                    <a key={r.name} href={r.lastMatchId ? `/match/${r.lastMatchId}` : '#'}
                       style={{ display: 'grid', gridTemplateColumns: '1fr 40px 32px 12px', gap: 10, padding: '12px 14px', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                      <div>
                        <div style={{ fontSize: 12, color: WHITE, fontWeight: 500 }}>{r.name}</div>
                        <div style={{ fontSize: 9, fontFamily: FD, color: MUTED, marginTop: 2 }}>{r.style}</div>
                      </div>
                      <svg viewBox="0 0 40 10" width={40} height={10} style={{ overflow: 'visible' }}>
                        <path d={r.h2h.map((res: number, j: number) => `${j === 0 ? 'M' : 'L'}${(j / Math.max(1, r.h2h.length - 1)) * 40},${res ? 1 : 9}`).join(' ')} fill="none" stroke="#3a3a3a" strokeWidth={0.6} />
                        {r.h2h.map((res: number, j: number) => (
                          <circle key={j} cx={(j / Math.max(1, r.h2h.length - 1)) * 40} cy={res ? 1 : 9} r={1.5} fill={res ? G : R} />
                        ))}
                      </svg>
                      <span style={{ fontSize: 13, fontFamily: FD, fontWeight: 700, color: c, textAlign: 'right' }}>{r.w}-{r.l}</span>
                      <span style={{ fontSize: 10, color: DIM }}>{'\u203a'}</span>
                    </a>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          S10 . SEE ALL STATS -- existing toggle
          ══════════════════════════════════════════════════════════════════ */}
      {hasAnyStats && (
        <>
          <button onClick={() => setShowStats(v => !v)} style={{ width: '100%', padding: 12, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontFamily: FB, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: showStats ? 16 : 0 }}>
            {showStats ? 'Hide all stats \u2191' : 'See all stats \u2193'}
          </button>
          {showStats && (
            <div style={{ marginTop: 16 }}>
              <JDStats matches={matches} avgs={avgs} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
