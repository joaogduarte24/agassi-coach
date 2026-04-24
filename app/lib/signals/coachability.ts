import type { Signal, Coachability } from './types'

// ─── TAUTOLOGICAL SIGNAL KEYS ────────────────────────────────────────────────
// Signals that correlate with winning because they're definitionally downstream
// of winning. These pass statistical tests (high lift, strong Cohen's d) and
// fail every coaching test. Always excluded from coaching surfaces.
//
// Rule of thumb for extending: if the stat is "JD scored more of {unit} than
// opponent" where unit = points/games/sets, it's a tautology. Winning more of
// the unit IS the definition of winning at some level.
//
// NOT tautological (deliberately): s1_pts_won_pct (first-serve quality),
// return_pts_won_pct (return-game quality), bp_won/saved_pct (pressure
// moment wins). These are quality metrics, not outcome metrics.
const TAUTOLOGICAL_KEYS = new Set<string>([
  'total_pts_won_win_driver',
])

// ─── TRAINING-ONLY SIGNAL KEYS ───────────────────────────────────────────────
// Real coaching signals that are trained through drills, not dialed in-match.
// You can't will yourself to hit a higher cross-court % or faster pace during
// a match — those are technique outcomes of training over weeks. Excluded
// from the pre-match surface. May still appear on debrief ("work on this next
// week") and always in JDStats deep-dive.
const TRAINING_KEYS = new Set<string>([
  'fh_cc_in_win_driver',
  'bh_cc_in_win_driver',
  'fh_pace_win_driver',
  'bh_pace_win_driver',
  's1_speed_win_driver',
  'fh_speed_consistency',
  'fh_contact_height',
  'bh_contact_height',
])

// ─── NEITHER-ACTIONABLE SIGNAL KEYS ──────────────────────────────────────────
// Composites or style tags that aren't cleanly in-match OR training actionable.
// Usually indicate a pattern-of-play disposition that can't be translated into
// a single drill or a single match decision. Opaque thresholds (negative
// floors, composite metrics) live here.
const NEITHER_KEYS = new Set<string>([
  'net_aggression_win_driver',      // W-UE composite: can't drill it, can't decide it
])

// ─── HOOK DETECTION ──────────────────────────────────────────────────────────
// Specificity boosts come from whether an insight references a specific
// opponent or situation vs. being a generic JD-centric pattern. Hook detection
// is intentionally simple (regex on insight + label) — cheaper than parsing
// structure, and signals' text is our primary coaching output anyway.
const OPP_HOOK_RE = /\bopp(?:onent)?s?\b/i
const SITUATION_HOOK_RE = /\bbreak[\s-]?point|\bbp\b|\bset[\s-]?point|\btiebreak|\bdeciding set\b/i
const NUMBER_RE = /\d/

function hasOpponentHook(signal: Signal): boolean {
  return OPP_HOOK_RE.test(signal.insight) || OPP_HOOK_RE.test(signal.label)
}

function hasSituationHook(signal: Signal): boolean {
  return SITUATION_HOOK_RE.test(signal.insight) || SITUATION_HOOK_RE.test(signal.label)
}

// ─── MAIN TAGGER ─────────────────────────────────────────────────────────────
/**
 * Classify a single signal on three coaching axes:
 *  - is_tautological: downstream-of-winning → always filter out
 *  - actionability: 'in-match' (decide it on court) | 'training' (drill it) |
 *    'neither' (opaque composite)
 *  - specificity_score: 0..1. Opponent/situation hooks weigh heaviest.
 *    Statistical strength and numeric framing are secondary.
 *
 * Scoring rule (sum, capped at 1.0):
 *   +0.3 opponent hook in label or insight
 *   +0.3 situation hook (BP / set point / tiebreak / deciding set)
 *   +0.2 confidence === 'strong' (n >= 12 AND |Cohen's d| >= 0.8)
 *   +0.2 insight contains a specific number
 *
 * Typical thresholds at the selection layer:
 *   - Pre-match surface: specificity >= 0.4 AND actionability === 'in-match'
 *   - Debrief surface: !is_tautological (stricter filters applied per-match)
 */
export function tagCoachability(signal: Signal): Coachability {
  const is_tautological = TAUTOLOGICAL_KEYS.has(signal.key)

  let actionability: Coachability['actionability']
  if (TRAINING_KEYS.has(signal.key)) actionability = 'training'
  else if (NEITHER_KEYS.has(signal.key) || is_tautological) actionability = 'neither'
  else actionability = 'in-match'

  let specificity_score = 0
  if (hasOpponentHook(signal)) specificity_score += 0.3
  if (hasSituationHook(signal)) specificity_score += 0.3
  if (signal.confidence === 'strong') specificity_score += 0.2
  if (NUMBER_RE.test(signal.insight)) specificity_score += 0.2
  if (specificity_score > 1) specificity_score = 1

  return { is_tautological, actionability, specificity_score }
}

/**
 * Non-mutating: return a new array with `coachability` attached to each signal.
 * Use in compute.ts as the final pass before returning SignalSet.
 */
export function withCoachability(signals: Signal[]): Signal[] {
  return signals.map(s => ({ ...s, coachability: tagCoachability(s) }))
}

// ─── IN-DEV SANITY CHECKS ────────────────────────────────────────────────────
// Cheap self-test callable from dev tools or a one-off script. NOT run at
// module load — keeps cold-start clean. If you want to sanity-check during
// iteration: `import { _selfCheck } from './coachability'; _selfCheck()`.
export function _selfCheck(): { passed: number; failed: string[] } {
  const failed: string[] = []
  let passed = 0

  const mk = (key: string, overrides: Partial<Signal> = {}): Signal => ({
    key,
    label: key,
    insight: overrides.insight ?? 'generic insight',
    detail: 'detail',
    category: 'correlation',
    direction: 'positive',
    confidence: overrides.confidence ?? 'moderate',
    lift: 20,
    value: 50,
    matchesUsed: 10,
    ...overrides,
  })

  // Tautology
  const t = tagCoachability(mk('total_pts_won_win_driver'))
  t.is_tautological && t.actionability === 'neither' ? passed++ : failed.push('total_pts_won should be tautological + neither')

  // Training
  const tr = tagCoachability(mk('fh_cc_in_win_driver'))
  tr.actionability === 'training' ? passed++ : failed.push('fh_cc_in should be training')

  // Neither
  const n = tagCoachability(mk('net_aggression_win_driver'))
  n.actionability === 'neither' && !n.is_tautological ? passed++ : failed.push('net_aggression should be neither (not tautological)')

  // Default in-match
  const im = tagCoachability(mk('ue_win_driver'))
  im.actionability === 'in-match' ? passed++ : failed.push('ue should default to in-match')

  // Opponent hook
  const oh = tagCoachability(mk('opp_serve_direction', { insight: 'Opponents tend to go T 70%' }))
  oh.specificity_score >= 0.3 ? passed++ : failed.push(`opp hook should score >= 0.3, got ${oh.specificity_score}`)

  // Situation hook
  const sh = tagCoachability(mk('bp_won_win_driver', { insight: 'Break point conversion boosts win chance' }))
  sh.specificity_score >= 0.3 ? passed++ : failed.push(`bp situation hook should score >= 0.3, got ${sh.specificity_score}`)

  // Strong + numbers = 0.4
  const sn = tagCoachability(mk('ue_win_driver', { confidence: 'strong', insight: 'Keeping UE below 17 boosts win by 45%' }))
  sn.specificity_score >= 0.4 ? passed++ : failed.push(`strong+numbers should be >= 0.4, got ${sn.specificity_score}`)

  // Weak + no hooks + no numbers = 0
  const zero = tagCoachability(mk('some_key', { confidence: 'low', insight: 'generic insight without digits' }))
  zero.specificity_score === 0 ? passed++ : failed.push(`empty signal should score 0, got ${zero.specificity_score}`)

  return { passed, failed }
}
