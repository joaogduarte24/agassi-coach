# Agassi — Unsurfaced Data Inventory

Tracks every data point that exists in the database but is **not yet shown, analyzed, or used** in any UI component or signal computation. This is the backlog for Cluster B (Visualisation) and future intelligence work.

**Last updated:** 2026-03-31

**Rule:** Every time a feature ships that surfaces previously unused data, remove it from this file. Every time new data fields are added (new journal questions, new parser fields, new tables), add the unsurfaced ones here immediately.

---

## High-Value — Shot Coordinates & Raw Shot Data

These are 800+ rows per match in `match_shots`. Richest untapped data source.

| Field | Table | What it is | Potential use |
|---|---|---|---|
| `bounce_x` / `bounce_y` | match_shots | Where each shot landed on court | Court heatmaps — where JD hits, where opponents target |
| `hit_x` / `hit_y` / `hit_z` | match_shots | Contact point in 3D space | Contact height analysis, net clearance |
| `speed_kmh` | match_shots | Individual shot speed | Speed distribution per stroke, speed under pressure vs normal |
| `spin` | match_shots | Spin type per shot | Spin distribution, spin choice under pressure |
| `shot_type` / `stroke` | match_shots | Shot classification per shot | Shot selection patterns by game state |
| `bounce_depth` / `bounce_zone` | match_shots | Where ball bounced (zone classification) | Depth consistency, zone targeting |

**What this unlocks:** Court heatmaps (serve placement, groundstroke direction maps, opponent targeting), shot physics distributions, pressure-specific shot analysis.

---

## High-Value — Opponent Stats (20+ fields stored, 3 shown)

`opp_shots.stats` mirrors JD's `shot_stats` but only `ue`, `s2_pts_won_pct`, and `total_pts_won_pct` are displayed. Everything else is stored and invisible.

| Field | Where stored | Currently shown? |
|---|---|---|
| `aces` | opp_shots.stats | No |
| `service_winners` | opp_shots.stats | No |
| `winners` | opp_shots.stats | In Strategy opponent panel only |
| `fh_winners` / `bh_winners` | opp_shots.stats | No |
| `fh_ue` / `bh_ue` | opp_shots.stats | No |
| `df` | opp_shots.stats | No |
| `serve_pts_won_pct` | opp_shots.stats | Used in signals (profile.ts) only |
| `s1_pts_won_pct` | opp_shots.stats | No |
| `return_pts_won_pct` | opp_shots.stats | Used in signals only |
| `ret1_pts_won_pct` / `ret2_pts_won_pct` | opp_shots.stats | No |
| `bp_saved_pct` / `bp_saved_n` / `bp_saved_total` | opp_shots.stats | No |
| `bp_won_pct` / `bp_won_n` / `bp_won_total` | opp_shots.stats | In Strategy opponent panel only |
| `max_ball_spd` | opp_shots.stats | No |
| `total_shots` | opp_shots.stats | No |
| `fh_pct` / `bh_pct` | opp_shots.stats | No |
| `flat_pct` / `topspin_pct` / `slice_pct` | opp_shots.stats | No |

**Opponent distribution fields** (all 6 stored, none shown):
- `first_serve_pct`, `second_serve_pct`, `volley_pct`, `flat_pct`, `topspin_pct`, `slice_pct`

**What this unlocks:** Full opponent scouting panels, opponent weakness identification from data (not just journal), cross-match opponent trend analysis.

---

## Moderate-Value — Point-Level Data

~160 rows per match in `match_points`. Rich context, completely untapped beyond win rate aggregation.

| Field | Table | What it is | Potential use |
|---|---|---|---|
| `duration_seconds` | match_points | How long each point lasted | Rally length by game state, fatigue detection |
| `detail` | match_points | "Forehand Winner", "Backhand UE" etc. | Point outcome narrative, winner/error source by situation |
| `break_point` | match_points | Boolean — was this a break point? | Pressure performance: shot selection + outcome on BPs vs normal |
| `set_point` | match_points | Boolean — was this a set point? | Clutch performance on set points |
| `serve_state` | match_points | "first" or "second" | Performance split by serve state beyond aggregated % |
| `jd_game_score` / `opp_game_score` | match_points | Score at time of point | Score-state analysis: how JD plays at 30-0 vs 30-40 |

**What this unlocks:** Momentum tracking, pressure performance analysis, point-by-point narrative, set progression charts, fatigue curves.

---

## Moderate-Value — Journal Fields

Stored in `journal` JSONB, not displayed or analyzed.

| Field | Values | Currently used? |
|---|---|---|
| `whoop_strain` | 0–21 | Never referenced anywhere |
| `net_game` | "Stays back" / "Comes to net" / "Chip & charge" | Never displayed or analyzed |
| `mental_game` | "Crumbles under pressure" / "Steady" / "Ice cold" | Never displayed or analyzed |
| `opp_weapon` | "Serve" / "Forehand" / "Backhand" / "Volley" / "Movement" | Never displayed (profile.ts derives this from stats instead) |
| `opp_weakness` | "Serve" / "Backhand" / "Movement" / "Second ball" | Never displayed (profile.ts derives this from stats instead) |
| `match_type` | "Practice" / "League" / "Tournament" / "Friendly" | Never used for filtering or grouping |
| `decided_by` | Array of reasons | Used in signals (loss attribution frequency) but never visualized |

**What this unlocks:** Match type filtering, whoop strain correlation with performance, journal vs data mismatch analysis (opp_weapon logged vs data-derived weapon).

---

## Low-Value — Raw Counts & Denominators

Stored but mostly redundant with displayed percentages.

| Field | Where stored | Why low value |
|---|---|---|
| `s1_in_n` / `s1_in_total` | shot_stats | Percentages already shown |
| `s2_in_n` / `s2_in_total` | shot_stats | Percentages already shown |
| `bp_saved_total` / `bp_won_total` | shot_stats | Denominators — shown as N/total in Debrief |
| `service_winners` | shot_stats | Rarely populated; winners count covers it |
| `max_ball_spd` | shot_stats | Single peak number — limited coaching value |
| `ret1_pts_won_pct` / `ret2_pts_won_pct` | shot_stats | Court-side breakdown of return — could be useful but niche |
| `video_time` | match_shots, match_points | SwingVision reference — no in-app video player |

---

## CSV-Only Fields (used in signals/debrief, not shown as standalone stats)

These are computed at xlsx upload and used by the signals module or Debrief bullets, but never displayed as raw numbers in JDStats or MatchDetail.

| Field | Used in | Not shown in |
|---|---|---|
| `rally_mean` | tendencies signal, Debrief bullet | JDStats, MatchDetail |
| `rally_pct_short` / `rally_pct_long` | tendencies signal, Debrief bullet | JDStats, MatchDetail |
| `s1_t_pct` / `s1_wide_pct` | tendencies signal, Debrief bullet | JDStats, MatchDetail |
| `s1_after_dtl_pct` | tendencies signal, Debrief bullet | JDStats, MatchDetail |
| `fh_spd_std` | tendencies signal, Debrief bullet | JDStats, MatchDetail |
| `fh_contact_z` / `bh_contact_z` | tendencies signal | Not displayed anywhere |
| `opp_s1_t_pct` / `opp_s1_wide_pct` | opponent profile signal | Not displayed anywhere |

**Note:** These are "used but not shown" — the signals module consumes them for insight generation, but the raw values never appear as standalone data points in any UI.
