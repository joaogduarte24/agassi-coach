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
export interface Match {
  id: string; date: string
  opponent: { name: string; utr: number|null }
  surface: string
  score: { sets: string; sets_arr: [number,number][]|null; winner: string }
  serve: Serve|null; return: Return|null; forehand: Groundstroke|null; backhand: Groundstroke|null
  shot_stats: ShotStats|null; opp_shots: OppShots|null
  what_worked: string[]|null; what_didnt: string[]|null; key_number: string|null
}
export interface Avgs {
  s1_ad: number|null; s1_deuce: number|null; s2_ad: number|null; s2_deuce: number|null
  spd_s1_ad: number|null; spd_s1_deuce: number|null; spd_s2_ad: number|null; spd_s2_deuce: number|null
  ret1_ad: number|null; ret1_deuce: number|null; ret2_ad: number|null; ret2_deuce: number|null
  spd_ret1: number|null; spd_ret2: number|null
  fh_cc: number|null; fh_dtl: number|null; bh_cc: number|null; bh_dtl: number|null
  spd_fh_cc: number|null; spd_fh_dtl: number|null; spd_bh_cc: number|null; spd_bh_dtl: number|null
}
