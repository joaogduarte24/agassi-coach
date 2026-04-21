import type { Match } from '@/app/types'
import type { PlayerProfile, OpponentProfile, ProfileAttribute, StrokeSignal, Signal } from './types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function avgNonNull(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
}

// ─── JD STYLE CLASSIFICATION ─────────────────────────────────────────────────
function classifyStyle(
  matches: Match[],
  isOpponent: boolean,
): ProfileAttribute {
  const n = matches.length
  if (n < 3) return { label: 'Unknown', confidence: 'low', evidence: 'Need more matches' }

  // Extract key stats
  const get = (fn: (m: Match) => number | null | undefined) => avgNonNull(matches.map(fn))

  let servePtsWon: number | null, rallyMean: number | null, winners: number | null
  let ue: number | null, fhCC: number | null, bhCC: number | null
  let volleyPct: number | null, rallyPctShort: number | null
  let serveSpeed: number | null

  if (isOpponent) {
    servePtsWon = get(m => (m.opp_shots as any)?.stats?.serve_pts_won_pct)
    winners = get(m => (m.opp_shots as any)?.stats?.winners)
    ue = get(m => (m.opp_shots as any)?.stats?.ue)
    fhCC = get(m => (m.opp_shots as any)?.forehand?.cc_in)
    bhCC = get(m => (m.opp_shots as any)?.backhand?.cc_in)
    volleyPct = get(m => (m.opp_shots as any)?.distribution?.volley_pct)
    serveSpeed = get(m => (m.opp_shots as any)?.serve?.first?.spd_ad)
    // xlsx-only fields for opponent
    rallyMean = get(m => (m.shot_stats as any)?.rally_mean) // shared rally stat
    rallyPctShort = get(m => (m.shot_stats as any)?.rally_pct_short)
  } else {
    servePtsWon = get(m => m.shot_stats?.serve_pts_won_pct)
    rallyMean = get(m => (m.shot_stats as any)?.rally_mean)
    rallyPctShort = get(m => (m.shot_stats as any)?.rally_pct_short)
    winners = get(m => m.shot_stats?.winners)
    ue = get(m => m.shot_stats?.ue)
    fhCC = get(m => m.forehand?.cc_in)
    bhCC = get(m => m.backhand?.cc_in)
    volleyPct = get(m => m.shot_stats?.volley_pct)
    serveSpeed = get(m => m.serve?.first?.spd_ad)
  }

  const confidence = n >= 10 ? 'strong' as const : n >= 5 ? 'moderate' as const : 'low' as const

  // Classification rules (evaluated in priority order)
  // Big Server
  if (servePtsWon != null && servePtsWon >= 65 && (serveSpeed ?? 0) >= 170) {
    return { label: 'Big Server', confidence, evidence: `Serve pts won ${Math.round(servePtsWon)}%, speed ${Math.round(serveSpeed!)} km/h` }
  }

  // Serve & Volley
  if ((volleyPct ?? 0) >= 10 && (rallyMean ?? 5) < 4) {
    return { label: 'Serve & Volleyer', confidence, evidence: `Volley ${Math.round(volleyPct!)}% of shots, avg ${rallyMean} shots/rally` }
  }

  // Pusher / Counterpuncher
  if ((ue ?? 20) < 13 && (winners ?? 15) < 12 && (rallyMean ?? 4) >= 5) {
    return { label: 'Counterpuncher', confidence, evidence: `Only ${Math.round(ue!)} UE, ${Math.round(winners!)} winners, ${rallyMean} avg rally` }
  }

  // Aggressive Baseliner
  if ((winners ?? 10) >= 18 && (fhCC ?? 70) >= 70 && (serveSpeed ?? 100) >= 140) {
    return { label: 'Aggressive Baseliner', confidence, evidence: `${Math.round(winners!)} winners, FH CC ${Math.round(fhCC!)}% in, serve ${Math.round(serveSpeed!)} km/h` }
  }

  // Baseliner (default with groundstroke focus)
  if ((fhCC ?? 0) >= 72 || (bhCC ?? 0) >= 68) {
    return { label: 'Baseliner', confidence, evidence: `FH CC ${Math.round(fhCC ?? 0)}%, BH CC ${Math.round(bhCC ?? 0)}%` }
  }

  return { label: 'All-Court', confidence, evidence: 'Balanced stats across serve, return, and groundstrokes' }
}

// ─── WEAPON DETECTION ────────────────────────────────────────────────────────
function detectWeapon(
  matches: Match[],
  strokeSignals: StrokeSignal[],
  isOpponent: boolean,
): ProfileAttribute {
  const n = matches.length
  if (n < 3) return { label: 'Unknown', confidence: 'low', evidence: 'Need more matches' }

  const get = (fn: (m: Match) => number | null | undefined) => avgNonNull(matches.map(fn))

  // Compare stat categories
  const candidates: { label: string; score: number; evidence: string }[] = []

  if (isOpponent) {
    const aces = get(m => (m.opp_shots as any)?.stats?.aces) ?? 0
    const servePtsWon = get(m => (m.opp_shots as any)?.stats?.serve_pts_won_pct) ?? 0
    const fhWinners = get(m => (m.opp_shots as any)?.stats?.fh_winners) ?? 0
    const bhWinners = get(m => (m.opp_shots as any)?.stats?.bh_winners) ?? 0
    const returnPtsWon = get(m => (m.opp_shots as any)?.stats?.return_pts_won_pct) ?? 0

    candidates.push({ label: 'Serve', score: servePtsWon + aces * 3, evidence: `${Math.round(servePtsWon)}% serve pts won, ${Math.round(aces)} aces` })
    candidates.push({ label: 'Forehand', score: fhWinners * 5, evidence: `${Math.round(fhWinners)} FH winners/match` })
    candidates.push({ label: 'Backhand', score: bhWinners * 5, evidence: `${Math.round(bhWinners)} BH winners/match` })
    candidates.push({ label: 'Return', score: returnPtsWon, evidence: `${Math.round(returnPtsWon)}% return pts won` })
  } else {
    const aces = get(m => m.shot_stats?.aces)
    const servePtsWon = get(m => m.shot_stats?.serve_pts_won_pct)
    const fhWinners = get(m => m.shot_stats?.fh_winners)
    const bhWinners = get(m => m.shot_stats?.bh_winners)
    const returnPtsWon = get(m => m.shot_stats?.return_pts_won_pct)

    if (servePtsWon != null || aces != null) candidates.push({ label: 'Serve', score: (servePtsWon ?? 0) + (aces ?? 0) * 3, evidence: `${Math.round(servePtsWon ?? 0)}% serve pts won, ${Math.round(aces ?? 0)} aces` })
    if (fhWinners != null) candidates.push({ label: 'Forehand', score: fhWinners * 5, evidence: `${Math.round(fhWinners)} FH winners/match` })
    if (bhWinners != null) candidates.push({ label: 'Backhand', score: bhWinners * 5, evidence: `${Math.round(bhWinners)} BH winners/match` })
    if (returnPtsWon != null) candidates.push({ label: 'Return', score: returnPtsWon, evidence: `${Math.round(returnPtsWon)}% return pts won` })
  }

  // Boost with stroke signal effectiveness
  for (const ss of strokeSignals) {
    if (ss.tag === 'hidden_weapon' || ss.effectiveness > 2) {
      const label = ss.stroke.startsWith('fh') ? 'Forehand' : 'Backhand'
      const existing = candidates.find(c => c.label === label)
      if (existing) existing.score += ss.effectiveness * 10
    }
  }

  if (candidates.length === 0) return { label: 'Unknown', confidence: 'low' as const, evidence: 'Insufficient data' }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  const confidence = n >= 10 ? 'strong' as const : n >= 5 ? 'moderate' as const : 'low' as const

  return { label: best.label, confidence, evidence: best.evidence }
}

// ─── WEAKNESS DETECTION ──────────────────────────────────────────────────────
function detectWeakness(
  matches: Match[],
  correlations: Signal[],
  isOpponent: boolean,
): ProfileAttribute {
  const n = matches.length
  if (n < 3) return { label: 'Unknown', confidence: 'low', evidence: 'Need more matches' }

  // For JD: weakness = the correlation signal with the largest negative lift
  // (i.e. the stat that hurts win rate most when it's bad)
  if (!isOpponent && correlations.length > 0) {
    // Find the signal where "bad" performance has the worst win rate
    const worst = correlations[0] // already sorted by |lift|
    const confidence = n >= 10 ? 'strong' as const : n >= 5 ? 'moderate' as const : 'low' as const
    return { label: worst.label, confidence, evidence: worst.detail }
  }

  // For opponents: look at worst stats
  const get = (fn: (m: Match) => number | null | undefined) => avgNonNull(matches.map(fn))
  const weaknesses: { label: string; score: number; evidence: string }[] = []

  if (isOpponent) {
    const s1Pct = get(m => {
      const ad = (m.opp_shots as any)?.serve?.first?.pct_ad
      const deuce = (m.opp_shots as any)?.serve?.first?.pct_deuce
      if (ad == null && deuce == null) return null
      return ((ad ?? 0) + (deuce ?? 0)) / ((ad != null ? 1 : 0) + (deuce != null ? 1 : 0))
    })
    const bhCC = get(m => (m.opp_shots as any)?.backhand?.cc_in)
    const returnPtsWon = get(m => (m.opp_shots as any)?.stats?.return_pts_won_pct)
    const s2PtsWon = get(m => (m.opp_shots as any)?.stats?.s2_pts_won_pct)

    if (s1Pct != null) weaknesses.push({ label: 'Serve', score: 100 - s1Pct, evidence: `1st serve ${Math.round(s1Pct)}%` })
    if (bhCC != null) weaknesses.push({ label: 'Backhand', score: 100 - bhCC, evidence: `BH CC ${Math.round(bhCC)}% in` })
    if (returnPtsWon != null) weaknesses.push({ label: 'Return', score: 100 - returnPtsWon, evidence: `Return pts won ${Math.round(returnPtsWon)}%` })
    if (s2PtsWon != null) weaknesses.push({ label: 'Second Ball', score: 100 - s2PtsWon, evidence: `2nd serve pts won ${Math.round(s2PtsWon)}%` })
  }

  if (!weaknesses.length) return { label: 'Unknown', confidence: 'low', evidence: 'Insufficient data' }

  weaknesses.sort((a, b) => b.score - a.score)
  const worst = weaknesses[0]
  const confidence = n >= 8 ? 'moderate' as const : 'low' as const

  return { label: worst.label, confidence, evidence: worst.evidence }
}

// ─── CLUTCH + AGGRESSION ─────────────────────────────────────────────────────
function computeClutch(matches: Match[]): { delta: number; insight: string } {
  const vals: { bp: number; total: number }[] = []
  for (const m of matches) {
    const bp = m.shot_stats?.bp_won_pct
    const total = m.shot_stats?.total_pts_won_pct
    if (bp != null && total != null) vals.push({ bp, total })
  }
  if (vals.length < 3) return { delta: 0, insight: 'Not enough data' }

  const avgBP = vals.reduce((s, v) => s + v.bp, 0) / vals.length
  const avgTotal = vals.reduce((s, v) => s + v.total, 0) / vals.length
  const delta = Math.round(avgBP - avgTotal)

  const insight = delta >= 5
    ? `You win ${Math.round(avgBP)}% of break points vs ${Math.round(avgTotal)}% overall — you rise in big moments`
    : delta <= -5
      ? `You win ${Math.round(avgBP)}% of break points vs ${Math.round(avgTotal)}% overall — you tighten up under pressure`
      : `Break point performance (${Math.round(avgBP)}%) matches your overall level (${Math.round(avgTotal)}%) — steady under pressure`

  return { delta, insight }
}

function computeAggression(matches: Match[]): { index: number; insight: string } {
  const vals: number[] = []
  for (const m of matches) {
    const w = m.shot_stats?.winners, ue = m.shot_stats?.ue
    if (w != null && ue != null) vals.push(w - ue)
  }
  if (vals.length < 3) return { index: 0, insight: 'Not enough data' }

  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10

  const insight = avg >= 3
    ? `Net aggression +${avg} (winners minus UE) — you create more than you give away`
    : avg <= -3
      ? `Net aggression ${avg} — you give away more than you create. Reduce errors before adding power.`
      : `Net aggression ${avg >= 0 ? '+' : ''}${avg} — balanced between attack and errors`

  return { index: avg, insight }
}

// ─── JD PROFILE ──────────────────────────────────────────────────────────────
export function computeJDProfile(
  matches: Match[],
  strokeSignals: StrokeSignal[],
  correlations: Signal[],
): PlayerProfile | null {
  if (matches.length < 5) return null

  return {
    style: classifyStyle(matches, false),
    weapon: detectWeapon(matches, strokeSignals, false),
    weakness: detectWeakness(matches, correlations, false),
    clutch: computeClutch(matches),
    aggression: computeAggression(matches),
  }
}

// ─── OPPONENT PROFILES ───────────────────────────────────────────────────────
export function computeOpponentProfiles(
  matches: Match[],
): Record<string, OpponentProfile> {
  // Group matches by opponent name
  const byOpponent: Record<string, Match[]> = {}
  for (const m of matches) {
    const name = m.opponent?.name
    if (!name) continue
    if (!byOpponent[name]) byOpponent[name] = []
    byOpponent[name].push(m)
  }

  const profiles: Record<string, OpponentProfile> = {}

  for (const [name, opMatches] of Object.entries(byOpponent)) {
    // Need at least 1 match with opp_shots data
    const withOppData = opMatches.filter(m => m.opp_shots != null)
    if (!withOppData.length) continue

    const style = classifyStyle(withOppData, true)
    const weapon = detectWeapon(withOppData, [], true)
    const weakness = detectWeakness(withOppData, [], true)

    // Clutch and aggression for opponent
    const oppClutchVals: { bp: number; total: number }[] = []
    for (const m of withOppData) {
      const bp = (m.opp_shots as any)?.stats?.bp_saved_pct
      const total = (m.opp_shots as any)?.stats?.total_pts_won_pct
      if (bp != null && total != null) oppClutchVals.push({ bp, total })
    }
    let clutch = { delta: 0, insight: 'Not enough data' }
    if (oppClutchVals.length >= 2) {
      const avgBP = oppClutchVals.reduce((s, v) => s + v.bp, 0) / oppClutchVals.length
      const avgTotal = oppClutchVals.reduce((s, v) => s + v.total, 0) / oppClutchVals.length
      const delta = Math.round(avgBP - avgTotal)
      clutch = {
        delta,
        insight: delta >= 5 ? 'Rises under pressure' : delta <= -5 ? 'Crumbles under pressure' : 'Steady under pressure',
      }
    }

    const oppAggrVals: number[] = []
    for (const m of withOppData) {
      const w = (m.opp_shots as any)?.stats?.winners
      const ue = (m.opp_shots as any)?.stats?.ue
      if (w != null && ue != null) oppAggrVals.push(w - ue)
    }
    const aggrIndex = oppAggrVals.length >= 1 ? Math.round(oppAggrVals.reduce((a, b) => a + b, 0) / oppAggrVals.length * 10) / 10 : 0
    const aggression = {
      index: aggrIndex,
      insight: aggrIndex >= 3 ? 'Net attacker — creates more than gives away' : aggrIndex <= -3 ? 'Error-prone — gives away more than creates' : 'Balanced attack/error ratio',
    }

    // Predictability (serve direction)
    const oppT = avgNonNull(withOppData.map(m => (m as any).shot_stats?.opp_s1_t_pct ?? (m.opp_shots as any)?.stats?.opp_s1_t_pct))
    const oppWide = avgNonNull(withOppData.map(m => (m as any).shot_stats?.opp_s1_wide_pct ?? (m.opp_shots as any)?.stats?.opp_s1_wide_pct))
    let predictability: { score: number; insight: string } | undefined
    if (oppT != null || oppWide != null) {
      const maxDir = Math.max(oppT ?? 0, oppWide ?? 0)
      if (maxDir >= 55) {
        const dir = (oppT ?? 0) >= (oppWide ?? 0) ? 'T' : 'wide'
        predictability = {
          score: maxDir,
          insight: maxDir >= 65
            ? `Goes ${dir} ${Math.round(maxDir)}% of the time — very predictable, cheat that way`
            : `Leans ${dir} ${Math.round(maxDir)}% — slight tendency you can exploit`,
        }
      }
    }

    // Mismatch detection: journal v2 moved opp_style into the `opponents` table.
    // This check is now done client-side where the opponents record is available.
    // Disabled in profile compute until a server-side opponents lookup lands.
    const mismatch: string | undefined = undefined

    profiles[name] = {
      name,
      matchCount: opMatches.length,
      style,
      weapon,
      weakness,
      clutch,
      aggression,
      predictability,
      mismatch,
    }
  }

  return profiles
}
