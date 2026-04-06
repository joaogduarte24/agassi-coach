// Data Analyst — output schema (the contract between skill and app)
// See DATA-ANALYST-PLAN.md §4 for the rationale.

export type StrokeCardKey = 'serve' | 'return' | 'forehand' | 'backhand'
export type CoordSystem = 'normalized_jd_bottom'

export type InsightKind =
  | 'sequence_pattern'   // multi-shot court pattern
  | 'stroke_pattern'     // single-stroke aggregate finding
  | 'pressure_pattern'   // BP/SP filtered finding
  | 'style_observation'  // style/profile fact

export type Verdict = 'winning' | 'losing' | 'neutral'

export type ShotStep = {
  shot: 'serve' | 'fh' | 'bh' | 'volley' | 'return'
  from: [number, number]   // normalized [x, y]; y=0 is JD baseline
  to: [number, number]
  speed?: number | null    // km/h
}

export type Insight = {
  id: string
  kind: InsightKind
  stroke: StrokeCardKey
  name: string
  verdict: Verdict
  // For sequence_pattern:
  sequence?: ShotStep[]
  coord_system?: CoordSystem
  // For stroke_pattern:
  metric?: { name: string; value: number; unit?: string }
  // Universal:
  usage_pct?: number
  win_pct?: number
  sample_n: number
  confidence: number       // 0..1
  blurb?: string           // optional one-line coach note
}

export type LadderEntry = {
  stat: string
  label: string
  stroke: StrokeCardKey
  you: number
  current_band_p50: number | null
  next_band_p50: number | null
  two_bands_up_p50: number | null
  gap_to_next: number | null
  leverage_rank: number
  verdict: string
  confidence: number
  sample_n: number
}

export type StrokeCard = {
  insight_ids: string[]
  ladder_stat_ids: string[]
}

export type OpponentDossier = {
  opponent_name: string
  matches_played: number
  h2h: string
  style_tag: string
  weapon: string
  weakness: string
  confidence: number
}

export type PlayerProfileSnapshot = {
  style: string
  weapon: string
  weakness: string
  clutch_index: number
  aggression_index: number
  rally_preference: 'short' | 'medium' | 'long' | 'unknown'
  confidence: number
  sample_n: number
}

export type AnalystState = {
  schema_version: 1
  generated_at: string
  match_count: number
  shot_data_match_count: number
  player_profile: PlayerProfileSnapshot | null
  utr: {
    current: number | null
    last_updated: string | null
    current_band: string | null
    next_band: string | null
    two_bands_up: string | null
  }
  ladder: LadderEntry[]
  insights: Insight[]
  stroke_cards: Record<StrokeCardKey, StrokeCard>
  opponent_dossiers: OpponentDossier[]
}
