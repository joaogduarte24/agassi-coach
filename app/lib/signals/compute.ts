import type { Match } from '@/app/types'
import type { SignalSet } from './types'
import { computeTendencies } from './tendencies'
import { computeCorrelations } from './correlations'
import { computeStrokes, computeShotMixCorrelations } from './strokes'
import { computeJournalCorrelations } from './journal'
import { computeJDProfile, computeOpponentProfiles } from './profile'
import { withCoachability, tagCoachability } from './coachability'

/**
 * Compute all intelligence signals from match data.
 * Pure function: matches[] → SignalSet.
 * Designed for client-side use — 14-50 matches is instant.
 */
export function computeSignals(matches: Match[]): SignalSet {
  const withStats = matches.filter(m => m.shot_stats != null || m.serve != null)

  // Phase 1: Tendencies (xlsx-only fields)
  const tendencies = computeTendencies(matches)

  // Phase 2: Win/loss correlations
  const correlations = computeCorrelations(matches)

  // Phase 3: Stroke intelligence
  const strokes = computeStrokes(matches)
  const shotMixSignals = computeShotMixCorrelations(matches)
  // Attach shot-mix correlations to matching stroke signals
  for (const mixSig of shotMixSignals) {
    const strokeKey = mixSig.key.replace('_usage_mix_driver', '')
    const matchingStroke = strokes.find(s =>
      (strokeKey === 'fh' && s.stroke.startsWith('fh')) ||
      (strokeKey === 'bh' && s.stroke.startsWith('bh'))
    )
    if (matchingStroke && !matchingStroke.winCorrelation) {
      matchingStroke.winCorrelation = mixSig
    }
  }

  // Phase 4: Journal correlations
  const journal = computeJournalCorrelations(matches)

  // Phase 5: Player profiles
  const jdProfile = computeJDProfile(matches, strokes, correlations)
  const opponentProfiles = computeOpponentProfiles(matches)

  // Phase 6: Coachability tagging — attach coachability to every Signal
  // before returning. Non-mutating. Profiles + StrokeSignal don't get tagged
  // directly (strokes carry their own `tag` field); stroke.winCorrelation
  // IS a Signal though, so tag those too when present.
  const taggedStrokes = strokes.map(s =>
    s.winCorrelation
      ? { ...s, winCorrelation: { ...s.winCorrelation, coachability: tagCoachability(s.winCorrelation) } }
      : s
  )

  return {
    correlations: withCoachability(correlations),
    tendencies: withCoachability(tendencies),
    strokes: taggedStrokes,
    journal: withCoachability(journal),
    jdProfile,
    opponentProfiles,
  }
}

// Re-export types for convenience
export type { Signal, SignalSet, StrokeSignal, PlayerProfile, OpponentProfile } from './types'
