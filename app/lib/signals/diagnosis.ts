import type { Match } from '@/app/types'

export type LossType = 'mental' | 'execution' | 'fitness' | 'tactical' | 'outclassed'

export type MatchDiagnosis = {
  type: LossType | 'win'
  headline: string
  bullets: string[]
  cueLabel: string
  cue: string
}

function medianVal(matches: Match[], extract: (m: Match) => number | null | undefined): number | null {
  const vals = matches.map(extract).filter((v): v is number => v != null).sort((a, b) => a - b)
  if (!vals.length) return null
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
}

function avgVal(matches: Match[], extract: (m: Match) => number | null | undefined): number | null {
  const vals = matches.map(extract).filter((v): v is number => v != null)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
}

export function diagnoseMatch(m: Match, allMatches: Match[]): MatchDiagnosis | null {
  const isWin = m.score?.winner === 'JD'
  const s = m.shot_stats
  const j = m.journal
  if (!s && !j) return null

  if (isWin) return diagnoseWin(m, allMatches)
  return diagnoseLoss(m, allMatches)
}

function diagnoseLoss(m: Match, all: Match[]): MatchDiagnosis {
  const s = m.shot_stats
  const j = m.journal
  const ue = s?.ue ?? null
  const ueMedian = medianVal(all, m => m.shot_stats?.ue)
  const ueAvg = avgVal(all, m => m.shot_stats?.ue)
  const composure = j?.composure ?? null
  const recovery = j?.recovery ?? null
  const planExecuted = j?.plan_executed
  const decidedBy = j?.decided_by ?? []
  const oppDiff = j?.opp_difficulty
  const oppTotalPts = (m.opp_shots as any)?.stats?.total_pts_won_pct ?? null
  const winners = s?.winners ?? null
  const winnersAvg = avgVal(all, m => m.shot_stats?.winners)
  const fhUe = s?.fh_ue ?? null
  const bhUe = s?.bh_ue ?? null

  const ueAboveMedian = ue != null && ueMedian != null && ue > ueMedian
  const ueAboveAvg = ue != null && ueAvg != null && ue > ueAvg
  const ueDelta = ue != null && ueAvg != null ? ue - ueAvg : null

  // ── Mental: UE spike + composure low or decided_by mental factors
  const mentalSignals = [
    composure != null && composure <= 2,
    decidedBy.includes('My errors'),
    decidedBy.includes('Pressure moments'),
  ].filter(Boolean).length

  if (ueAboveMedian && mentalSignals >= 2) {
    const ueBullet = `${ue} UE — ${ueDelta != null ? Math.abs(ueDelta) + ' above your average' : 'above your median'}`
    const errDetail = fhUe != null && bhUe != null
      ? fhUe > bhUe ? `${fhUe} FH errors vs ${bhUe} BH — forehand was the problem` : `${bhUe} BH errors vs ${fhUe} FH — backhand was the problem`
      : 'Error distribution across both wings'
    return {
      type: 'mental',
      headline: 'Mental Collapse',
      bullets: [
        ueBullet,
        errDetail,
        composure != null ? `Composure ${composure}/5 — you felt it slipping` : `Decided by: ${decidedBy.join(', ')}`,
      ],
      cueLabel: 'Next time',
      cue: 'When errors compound, slow down. Bounce the ball 3 times, commit to CC rally ball. You win 80% when UE stays below your median.',
    }
  }

  // ── Fitness: low recovery + fitness attribution
  if (recovery != null && recovery < 50 && decidedBy.includes('Fitness')) {
    return {
      type: 'fitness',
      headline: 'Physical Fade',
      bullets: [
        `Recovery at ${recovery}% — your body wasn't ready`,
        ueAboveAvg ? `${ue} UE — fatigue leads to loose shots` : 'Error count was manageable despite low recovery',
        'Decided by: Fitness',
      ],
      cueLabel: 'Next time',
      cue: 'Below 50% recovery, shorten rallies. Serve+1 pattern, attack early. Don\'t grind when the legs aren\'t there.',
    }
  }

  // ── Execution: UE high but composure fine, plan not executed
  if (ueAboveMedian && (composure == null || composure >= 3) && planExecuted && planExecuted !== 'Yes') {
    const ueBullet = `${ue} UE — ${ueDelta != null ? Math.abs(ueDelta) + ' above average' : 'above your median'}`
    return {
      type: 'execution',
      headline: 'Execution Breakdown',
      bullets: [
        ueBullet,
        `Game plan ${planExecuted === 'Mostly' ? 'partially' : 'not'} executed — the plan was right, shots weren't landing`,
        winners != null && winnersAvg != null ? `${winners} winners (avg ${winnersAvg}) — not enough aggression to compensate` : 'Shot quality let you down',
      ],
      cueLabel: 'Next time',
      cue: ue != null && ueAvg != null ? `When errors pile up, simplify to CC rally ball. You win 80% when UE stays below ${ueMedian}.` : 'Simplify shot selection when execution drops.',
    }
  }

  // ── Tactical: opponent dominated, plan wrong
  if (oppTotalPts != null && oppTotalPts > 55 && (!ueAboveMedian || (composure != null && composure >= 3))) {
    return {
      type: 'tactical',
      headline: 'Tactical Mismatch',
      bullets: [
        `Opponent won ${oppTotalPts}% of points — they controlled the match`,
        planExecuted === 'No' ? 'Game plan not executed — need a different approach' : 'Your execution was fine — the plan itself needs updating',
        oppDiff ? `Opponent rated: ${oppDiff}` : 'Opponent outplayed you on patterns',
      ],
      cueLabel: 'Next time',
      cue: 'Review the opponent\'s patterns. Study their weapon and build a plan that neutralises it. Don\'t play your game — play against theirs.',
    }
  }

  // ── Outclassed: much tougher opponent, composure fine
  if (oppDiff === 'Much tougher' && (composure == null || composure >= 3)) {
    return {
      type: 'outclassed',
      headline: 'Outclassed',
      bullets: [
        `Opponent rated "Much tougher" — this was a stretch match`,
        composure != null ? `Composure ${composure}/5 — you held your nerve` : 'You competed despite the gap',
        winners != null ? `${winners} winners — take the aggressive moments forward` : 'Bank the experience and move on',
      ],
      cueLabel: 'Next time',
      cue: 'One thing to take from this match: identify the one shot or pattern that worked and drill it. Losses to stronger opponents are investments.',
    }
  }

  // ── Fallback: general execution
  return {
    type: 'execution',
    headline: 'Execution Breakdown',
    bullets: [
      ue != null ? `${ue} UE${ueAvg != null ? ` (avg ${ueAvg})` : ''}` : 'Match stats incomplete',
      winners != null ? `${winners} winners${winnersAvg != null ? ` (avg ${winnersAvg})` : ''}` : '',
      s?.total_pts_won_pct != null ? `Total points won: ${s.total_pts_won_pct}%` : '',
    ].filter(Boolean),
    cueLabel: 'Next time',
    cue: 'Review the stat breakdown and identify the biggest gap vs your average. That\'s the area to focus on in practice.',
  }
}

function diagnoseWin(m: Match, all: Match[]): MatchDiagnosis {
  const s = m.shot_stats
  const ue = s?.ue ?? null
  const ueAvg = avgVal(all, m => m.shot_stats?.ue)
  const winners = s?.winners ?? null
  const winnersAvg = avgVal(all, m => m.shot_stats?.winners)
  const s1Pct = m.serve?.first ? Math.round(((m.serve.first.pct_ad ?? 0) + (m.serve.first.pct_deuce ?? 0)) / ((m.serve.first.pct_ad != null ? 1 : 0) + (m.serve.first.pct_deuce != null ? 1 : 0))) : null
  const s1Avg = avgVal(all, m => {
    const ad = m.serve?.first?.pct_ad, d = m.serve?.first?.pct_deuce
    return ad != null || d != null ? Math.round(((ad ?? 0) + (d ?? 0)) / ((ad != null ? 1 : 0) + (d != null ? 1 : 0))) : null
  })
  const bpSaved = s?.bp_saved_pct ?? null
  const oppUe = (m.opp_shots as any)?.stats?.ue ?? null

  // Determine the strongest winning factor
  type Factor = { headline: string; bullets: string[]; cue: string; score: number }
  const factors: Factor[] = []

  // Error control
  if (ue != null && ueAvg != null && ue < ueAvg) {
    const delta = ueAvg - ue
    factors.push({
      headline: 'Error Control',
      bullets: [
        `${ue} UE — ${delta} below your average`,
        oppUe != null ? `Outclassed on errors: ${ue} vs opponent's ${oppUe}` : `Clean match — errors were contained`,
        s1Pct != null ? `Serve solid at ${s1Pct}%${s1Avg != null ? ` (avg ${s1Avg}%)` : ''}` : 'Consistent execution across the board',
      ],
      cue: 'Controlled aggression — low errors, solid serve. This is your formula.',
      score: delta * 2,
    })
  }

  // Serve dominance
  if (s1Pct != null && s1Avg != null && s1Pct > s1Avg) {
    factors.push({
      headline: 'Serve Dominance',
      bullets: [
        `1st serve at ${s1Pct}%${s1Avg != null ? ` — ${s1Pct - s1Avg}% above average` : ''}`,
        s?.aces != null && s.aces > 0 ? `${s.aces} aces — serve was a weapon` : 'First serve landed consistently',
        s?.serve_pts_won_pct != null ? `Won ${s.serve_pts_won_pct}% of serve points` : 'Serve held firm all match',
      ],
      cue: 'The serve was the foundation. Keep the toss consistent and the placement varied.',
      score: s1Pct - s1Avg,
    })
  }

  // Winner production
  if (winners != null && winnersAvg != null && winners > winnersAvg) {
    factors.push({
      headline: 'Aggressive Tennis',
      bullets: [
        `${winners} winners — ${winners - winnersAvg} above average`,
        s?.fh_winners != null ? `${s.fh_winners} FH winners, ${s?.bh_winners ?? 0} BH winners` : 'Winner production across both wings',
        ue != null ? `Winner/UE ratio: ${winners}/${ue}` : 'Aggression paid off',
      ],
      cue: 'You attacked when the opening was there. Keep taking the ball early on short balls.',
      score: winners - winnersAvg,
    })
  }

  // Clutch performance
  if (bpSaved != null && bpSaved >= 60 && s?.bp_saved_total != null && s.bp_saved_total >= 3) {
    factors.push({
      headline: 'Clutch Performance',
      bullets: [
        `Saved ${s.bp_saved_pct}% of break points (${s.bp_saved_n}/${s.bp_saved_total})`,
        'Held nerve under pressure when it mattered',
        s?.bp_won_pct != null ? `Also converted ${s.bp_won_pct}% of break points` : 'Pressure was your ally',
      ],
      cue: 'You thrive under pressure. Trust your serve on big points — the data backs you.',
      score: bpSaved - 50,
    })
  }

  // Pick the strongest factor
  factors.sort((a, b) => b.score - a.score)
  const best = factors[0]

  if (best) {
    return { type: 'win', headline: best.headline, bullets: best.bullets, cueLabel: 'Keep doing', cue: best.cue }
  }

  // Fallback
  return {
    type: 'win',
    headline: 'Solid Win',
    bullets: [
      ue != null ? `${ue} UE${ueAvg != null ? ` (avg ${ueAvg})` : ''}` : 'Match stats incomplete',
      winners != null ? `${winners} winners` : '',
      s?.total_pts_won_pct != null ? `Total points won: ${s.total_pts_won_pct}%` : '',
    ].filter(Boolean),
    cueLabel: 'Keep doing',
    cue: 'You got the result. Review the stats to find what specifically worked best.',
  }
}
