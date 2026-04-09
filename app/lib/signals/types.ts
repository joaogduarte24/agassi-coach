import type { Match } from '@/app/types'

// ─── CORE SIGNAL ─────────────────────────────────────────────────────────────
export type Signal = {
  key: string                          // e.g. "ue_win_driver"
  label: string                        // "Unforced Errors"
  insight: string                      // "Keeping UE below 17 boosts your win chance by 45%"
  detail: string                       // "78% win rate when below vs 33% when above"
  category: 'correlation' | 'tendency' | 'journal' | 'stroke' | 'profile'
  direction: 'positive' | 'negative' | 'neutral'
  confidence: 'strong' | 'moderate' | 'low'
  lift: number                         // percentage points improvement (+45 = 45pp better)
  value: number                        // the key metric (avg, median, or computed)
  threshold?: number                   // the split point for correlations
  winRateAbove?: number                // win % when above threshold
  winRateBelow?: number                // win % when below threshold
  matchesUsed: number
}

// ─── STROKE INTELLIGENCE ─────────────────────────────────────────────────────
export type StrokeKey = 'fh_cc' | 'fh_dtl' | 'bh_cc' | 'bh_dtl'
export type StrokeTag = 'hidden_weapon' | 'overused' | 'reliable' | 'liability'

export type StrokeSignal = {
  stroke: StrokeKey
  label: string                        // "Forehand Cross-Court"
  usage: number | null                  // % of total shots (null when no real data)
  effectiveness: number                // winner_rate - error_rate (higher = better)
  pctIn: number                        // % in
  pace: number | null                  // avg speed km/h
  tag: StrokeTag
  insight: string                      // "BH CC is your most efficient shot but only 15% of your game"
  winCorrelation?: Signal              // does using this shot more correlate with wins?
}

// ─── PLAYER PROFILE ──────────────────────────────────────────────────────────
export type ProfileAttribute = {
  label: string
  confidence: 'strong' | 'moderate' | 'low'
  evidence: string
}

export type PlayerProfile = {
  style: ProfileAttribute
  weapon: ProfileAttribute
  weakness: ProfileAttribute
  clutch: { delta: number; insight: string }       // BP win% minus overall pt win%
  aggression: { index: number; insight: string }   // avg winners minus UE
}

export type OpponentProfile = PlayerProfile & {
  name: string
  matchCount: number
  predictability?: { score: number; insight: string }  // serve direction clustering
  mismatch?: string                    // if data disagrees with journal entry
}

// ─── SIGNAL SET (full output) ────────────────────────────────────────────────
export type SignalSet = {
  correlations: Signal[]               // sorted by |lift| (strongest first)
  tendencies: Signal[]                 // serve direction, speed consistency, etc.
  strokes: StrokeSignal[]              // sorted by effectiveness
  journal: Signal[]                    // recovery, composure, plan execution
  jdProfile: PlayerProfile | null      // null if insufficient data
  opponentProfiles: Record<string, OpponentProfile>  // keyed by opponent name
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────
export type CorrelationCandidate = {
  key: string
  label: string
  extract: (m: Match) => number | null
  higherIsBetter: boolean              // true = above threshold is "good"
}
