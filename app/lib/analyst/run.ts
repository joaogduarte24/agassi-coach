// Analyst orchestrator — pure function: matches + utr → AnalystState
// Called from /api/analyst/run (server-side compute, cached in Supabase).

import type { Match } from '@/app/types'
import type { AnalystState, StrokeCardKey, OpponentDossier } from './types'
import { computeSignals } from '@/app/lib/signals/compute'
import { minePatterns } from './patterns'

function utrBand(utr: number | null): { current: string | null; next: string | null; twoUp: string | null } {
  if (utr == null) return { current: null, next: null, twoUp: null }
  const lo = Math.floor(utr * 2) / 2
  const fmt = (n: number) => `${n.toFixed(1)}-${(n + 0.5).toFixed(1)}`
  return { current: fmt(lo), next: fmt(lo + 0.5), twoUp: fmt(lo + 1.0) }
}

export function runAnalyst(args: {
  matches: Match[]
  utr: number | null
  utrUpdatedAt: string | null
}): AnalystState {
  const { matches, utr, utrUpdatedAt } = args
  const matchCount = matches.length
  const shotDataMatchCount = matches.filter((m: any) => m.has_shot_data).length

  const signals = computeSignals(matches)
  const insights = minePatterns(matches)

  // Build stroke card index
  const strokeCards: Record<StrokeCardKey, { insight_ids: string[]; ladder_stat_ids: string[] }> = {
    serve: { insight_ids: [], ladder_stat_ids: [] },
    return: { insight_ids: [], ladder_stat_ids: [] },
    forehand: { insight_ids: [], ladder_stat_ids: [] },
    backhand: { insight_ids: [], ladder_stat_ids: [] },
  }
  for (const ins of insights) {
    if (strokeCards[ins.stroke]) strokeCards[ins.stroke].insight_ids.push(ins.id)
  }

  // Player profile snapshot
  const profile = signals.jdProfile
  const playerProfile = profile
    ? {
        style: profile.style.label,
        weapon: profile.weapon.label,
        weakness: profile.weakness.label,
        clutch_index: profile.clutch.delta,
        aggression_index: profile.aggression.index,
        rally_preference: 'unknown' as const,
        confidence: profile.style.confidence === 'strong' ? 0.85 : profile.style.confidence === 'moderate' ? 0.65 : 0.4,
        sample_n: matchCount,
      }
    : null

  // Opponent dossiers (lightweight v1 — uses signals.opponentProfiles)
  const dossiers: OpponentDossier[] = Object.values(signals.opponentProfiles).map(p => {
    const oppMatches = matches.filter(m => m.opponent?.name === p.name)
    const wins = oppMatches.filter(m => m.score?.winner === 'JD').length
    const losses = oppMatches.length - wins
    return {
      opponent_name: p.name,
      matches_played: p.matchCount,
      h2h: `${wins}-${losses}`,
      style_tag: p.style.label,
      weapon: p.weapon.label,
      weakness: p.weakness.label,
      confidence: p.style.confidence === 'strong' ? 0.85 : p.style.confidence === 'moderate' ? 0.65 : 0.4,
    }
  }).sort((a, b) => b.matches_played - a.matches_played)

  const bands = utrBand(utr)

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    match_count: matchCount,
    shot_data_match_count: shotDataMatchCount,
    player_profile: playerProfile,
    utr: {
      current: utr,
      last_updated: utrUpdatedAt,
      current_band: bands.current,
      next_band: bands.next,
      two_bands_up: bands.twoUp,
    },
    ladder: [], // v2: Tennis Abstract benchmarks
    insights,
    stroke_cards: strokeCards,
    opponent_dossiers: dossiers,
  }
}
