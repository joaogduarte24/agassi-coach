export interface ServeSlot { pct_ad: number|null; pct_deuce: number|null; spd_ad: number|null; spd_deuce: number|null }
export interface Serve { first: ServeSlot; second: ServeSlot }
export interface ReturnSlot { pct_ad: number|null; pct_deuce: number|null; spd_ad: number|null; spd_deuce: number|null; deep_ad: number|null; deep_deuce: number|null }
export interface Return { first: ReturnSlot; second: ReturnSlot }
export interface Groundstroke { cc_in: number|null; dtl_in: number|null; spd_cc: number|null; spd_dtl: number|null; depth_cc: number|null; depth_dtl: number|null }
export interface ShotStats {
  aces: number|null; service_winners: number|null; winners: number|null; fh_winners: number|null; bh_winners: number|null
  ue: number|null; fh_ue: number|null; bh_ue: number|null; df: number|null
  s1_in_n: number|null; s1_in_total: number|null; s2_in_n: number|null; s2_in_total: number|null
  serve_pts_won_pct: number|null; s1_pts_won_pct: number|null; s2_pts_won_pct: number|null
  return_pts_won_pct: number|null; ret1_pts_won_pct: number|null; ret2_pts_won_pct: number|null
  total_pts_won_pct: number|null
  bp_saved_pct: number|null; bp_saved_n: number|null; bp_saved_total: number|null
  bp_won_pct: number|null; bp_won_n: number|null; bp_won_total: number|null
  max_ball_spd: number|null; total_shots: number|null
  fh_pct: number|null; bh_pct: number|null; volley_pct: number|null
  flat_pct: number|null; topspin_pct: number|null; slice_pct: number|null
}
export interface OppShots {
  serve: Serve; return: Return; forehand: Groundstroke; backhand: Groundstroke
  stats: ShotStats
  distribution: { total_shots: number|null; fh_pct: number|null; bh_pct: number|null; first_serve_pct: number|null; second_serve_pct: number|null; volley_pct: number|null; flat_pct: number|null; topspin_pct: number|null; slice_pct: number|null }
}
export interface Journal {
  // ── Quick core ──────────────────────────────────────────────────────────────
  recovery: number|null           // Whoop recovery % 0–100
  days_since_last_play: number|null // 0–7+, rust vs rhythm
  opp_difficulty: string|null     // Easier than me|Even|Tougher than me|Much tougher
  match_vibe: string|null         // In flow|Confident|Grinding|Frustrated|Flat|Anxious
  decided_by: string[]|null       // My serve|My return|My errors|Their level|Pressure moments|Fitness|Close margin|Their moment

  // ── Deep · Before ───────────────────────────────────────────────────────────
  match_type: string|null         // Practice|League|Tournament|Friendly
  warmup: string|null             // Full|Light|None
  racket: string|null             // free chip list (grows over time); default "Wilson Ultra V5 100"
  tension_kg: number|null         // string tension, pre-filled from last match
  conditions: string[]|null       // Indoor|Outdoor|Windy|Hot|Cold|Fast court|Slow court
  pre_confidence: number|null     // 1–5
  expectation: string|null        // Expected win|Toss-up|Expected loss
  game_plan_text: string|null     // one-line pre-match plan

  // ── Deep · After ────────────────────────────────────────────────────────────
  whoop_strain: number|null       // 0–21
  focus: number|null              // 1–5
  composure: number|null          // 1–5
  plan_executed: string|null      // Yes|Mostly|No (only shown when game_plan_text is set)
  match_arc_start: string|null    // Strong start|Slow start|Even start
  match_arc_finish: string|null   // Strong finish|Faded|Even finish
  momentum: string|null           // Came from behind|Let lead slip|Neither
  body_state: string|null         // Fresh|Tired|Sore|Cramped|Injured
  worst_moment: string|null       // Frustration|Fear|Complacency|Rage|None
  priority_next: string|null      // Serve %|Reduce UE|Return depth|BP conversion|Footwork|Composure|Aggression
  reflection_text: string|null    // one-line post-match reflection
}

// Opponent profile — stored at opponent level (new `opponents` table), pre-fills
// on next match against the same opponent. Surfaces in pre-match brief.
export interface Opponent {
  name: string
  style: string|null              // Baseliner-grinder|Baseliner-aggressive|Serve-volleyer|All-court|Pusher|Big server|Moonballer
  weapon: string|null             // Serve|Forehand|Backhand|Volley|Movement|Return
  weakness: string|null           // Serve|Backhand|Movement|Second ball|Mental
  notes: string|null              // one-line free text surfaced in pre-match brief
  updated_at: string|null
}
export interface Match {
  id: string; date: string
  opponent: { name: string; utr: number|null }
  surface: string
  score: { sets: string; sets_arr: [number,number][]|null; winner: string }
  serve: Serve|null; return: Return|null; forehand: Groundstroke|null; backhand: Groundstroke|null
  shot_stats: ShotStats|null; opp_shots: OppShots|null
  what_worked: string[]|null; what_didnt: string[]|null; key_number: string|null
  journal: Journal|null
}
export interface Avgs {
  s1_ad: number|null; s1_deuce: number|null; s2_ad: number|null; s2_deuce: number|null
  spd_s1_ad: number|null; spd_s1_deuce: number|null; spd_s2_ad: number|null; spd_s2_deuce: number|null
  ret1_ad: number|null; ret1_deuce: number|null; ret2_ad: number|null; ret2_deuce: number|null
  spd_ret1: number|null; spd_ret2: number|null
  fh_cc: number|null; fh_dtl: number|null; bh_cc: number|null; bh_dtl: number|null
  spd_fh_cc: number|null; spd_fh_dtl: number|null; spd_bh_cc: number|null; spd_bh_dtl: number|null
}
