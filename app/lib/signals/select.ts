import type { Signal } from './types'

// ─── PRE-MATCH SELECTION ─────────────────────────────────────────────────────
// The Next Match surface is where JD looks 10 min before stepping on court.
// Filter aggressively for:
//   - in-match actionable (you can do something about it in the next hour)
//   - non-tautological (no captain-obvious stats)
//   - specific (opponent/situation hooks preferred; strong+numbered at minimum)
//
// Ranking: specificity first, then lift magnitude. This boosts opponent-hooked
// tendencies (lift is 0 on tendencies but specificity can be high) above
// generic high-lift correlations — which is the right posture for pre-match
// ("what to do against THIS guy" > "what tends to work for me").
const PRE_MATCH_SPECIFICITY_MIN = 0.4  // tuning knob — lower to be more permissive
const PRE_MATCH_CAP = 3

export function selectForPreMatch(signals: Signal[]): Signal[] {
  return signals
    .filter(s => {
      const c = s.coachability
      if (!c) return false
      if (c.is_tautological) return false
      if (c.actionability !== 'in-match') return false
      if (c.specificity_score < PRE_MATCH_SPECIFICITY_MIN) return false
      return true
    })
    .slice()  // clone before sort
    .sort((a, b) => {
      const aSpec = a.coachability?.specificity_score ?? 0
      const bSpec = b.coachability?.specificity_score ?? 0
      if (bSpec !== aSpec) return bSpec - aSpec
      return Math.abs(b.lift) - Math.abs(a.lift)
    })
    .slice(0, PRE_MATCH_CAP)
}

// ─── DEBRIEF SELECTION ───────────────────────────────────────────────────────
// The Match Detail surface is post-match — JD just played, wants to know what
// mattered. Filter:
//   - non-tautological (no captain-obvious)
//   - not 'neither' actionability (no opaque composites like net_aggression)
//   - training-actionable IS allowed here — a post-match "work on this next
//     week" signal is legitimate for debrief, unlike pre-match.
//
// Ranking: pure lift magnitude — the patterns most strongly correlated with
// your win/loss outcomes are the most match-relevant. Note: Phase 2 will add
// a per-match filter ("was this match on the losing side of this signal's
// median?") but that requires per-signal value extractors that don't exist on
// Signal today. For Phase 1, just surface the top 2 non-dumb patterns.
const DEBRIEF_CAP = 2

export function selectForDebrief(signals: Signal[]): Signal[] {
  return signals
    .filter(s => {
      const c = s.coachability
      if (!c) return false
      if (c.is_tautological) return false
      if (c.actionability === 'neither') return false
      return true
    })
    .slice()
    .sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))
    .slice(0, DEBRIEF_CAP)
}

// ─── IN-DEV SANITY CHECKS ────────────────────────────────────────────────────
export function _selfCheck(): { passed: number; failed: string[] } {
  const failed: string[] = []
  let passed = 0

  const mk = (overrides: Partial<Signal>): Signal => ({
    key: 'test',
    label: 'Test',
    insight: 'generic',
    detail: 'd',
    category: 'correlation',
    direction: 'positive',
    confidence: 'moderate',
    lift: 20,
    value: 50,
    matchesUsed: 10,
    coachability: {
      is_tautological: false,
      actionability: 'in-match',
      specificity_score: 0.5,
    },
    ...overrides,
  })

  // Pre-match: filters out tautological
  const taut = mk({
    key: 'taut',
    coachability: { is_tautological: true, actionability: 'neither', specificity_score: 0.6 },
  })
  const good = mk({ key: 'good', lift: 30 })
  const outPre = selectForPreMatch([taut, good])
  outPre.length === 1 && outPre[0].key === 'good' ? passed++ : failed.push('pre-match should filter out tautological')

  // Pre-match: filters out training
  const training = mk({
    key: 'training',
    coachability: { is_tautological: false, actionability: 'training', specificity_score: 0.6 },
  })
  selectForPreMatch([training]).length === 0 ? passed++ : failed.push('pre-match should filter out training')

  // Pre-match: filters out low specificity
  const lowSpec = mk({
    key: 'lowSpec',
    coachability: { is_tautological: false, actionability: 'in-match', specificity_score: 0.2 },
  })
  selectForPreMatch([lowSpec]).length === 0 ? passed++ : failed.push('pre-match should filter out low specificity')

  // Pre-match: caps at 3
  const many = Array.from({ length: 5 }, (_, i) => mk({ key: `s${i}`, lift: 50 - i }))
  selectForPreMatch(many).length === 3 ? passed++ : failed.push('pre-match should cap at 3')

  // Pre-match: sorts by specificity first, then lift
  const highLiftLowSpec = mk({
    key: 'highLiftLowSpec', lift: 100,
    coachability: { is_tautological: false, actionability: 'in-match', specificity_score: 0.4 },
  })
  const lowLiftHighSpec = mk({
    key: 'lowLiftHighSpec', lift: 10,
    coachability: { is_tautological: false, actionability: 'in-match', specificity_score: 0.8 },
  })
  const ordered = selectForPreMatch([highLiftLowSpec, lowLiftHighSpec])
  ordered[0]?.key === 'lowLiftHighSpec' ? passed++ : failed.push('pre-match should rank specificity above lift')

  // Debrief: filters out tautological
  const debriefOut = selectForDebrief([taut, good])
  debriefOut.length === 1 && debriefOut[0].key === 'good' ? passed++ : failed.push('debrief should filter out tautological')

  // Debrief: filters out neither
  const neither = mk({
    key: 'neither',
    coachability: { is_tautological: false, actionability: 'neither', specificity_score: 0.6 },
  })
  selectForDebrief([neither]).length === 0 ? passed++ : failed.push('debrief should filter out neither')

  // Debrief: ALLOWS training (unlike pre-match)
  selectForDebrief([training]).length === 1 ? passed++ : failed.push('debrief should allow training-only signals')

  // Debrief: caps at 2
  selectForDebrief(many).length === 2 ? passed++ : failed.push('debrief should cap at 2')

  // Debrief: sorts by |lift| desc
  const debriefOrdered = selectForDebrief([
    mk({ key: 'small', lift: 10 }),
    mk({ key: 'big', lift: 80 }),
    mk({ key: 'mid', lift: 40 }),
  ])
  debriefOrdered[0]?.key === 'big' && debriefOrdered[1]?.key === 'mid'
    ? passed++ : failed.push('debrief should sort by |lift| desc')

  // Signals without coachability are skipped (optional field)
  const untagged = mk({ key: 'untagged', coachability: undefined })
  selectForPreMatch([untagged]).length === 0 && selectForDebrief([untagged]).length === 0
    ? passed++ : failed.push('signals without coachability should be skipped')

  return { passed, failed }
}
