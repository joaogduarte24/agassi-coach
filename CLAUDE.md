# Agassi Tennis Coach — Claude Context

## Project
Next.js 14 app for João Duarte (JD) to track tennis matches and get AI strategy coaching.
Live: https://agassi-app.vercel.app | Supabase: NEXT_PUBLIC_SUPABASE_URL in .env

## Key Architecture
- `app/page.tsx` — Home component only (~150 lines). Nav + tab routing.
- `app/components/` — One file per UI component (MatchDetail, Strategy, JDStats, UploadMatch, FixMatchModal, RadarChart, StatBar)
- `app/lib/helpers.ts` — All shared utilities: avg(), col(), fmtDate(), deepMerge(), getMissingFields(), computeAvgs(), IMPORTANT_FIELDS, ErrorBoundary, color constants
- `app/types.ts` — All TypeScript interfaces (Match, Avgs, OppShots, ShotStats, etc.)
- `app/api/extract/route.ts` — POST: sends screenshots to Claude claude-sonnet-4-20250514, returns parsed Match JSON
- `app/api/matches/route.ts` — GET/POST/DELETE: Supabase CRUD with toSetsArr() and toArr() normalizers for JSONB deserialization

## Data Shape (Match)
```json
{
  "id": "YYYY-MM-DD-opponent-slug",
  "date": "YYYY-MM-DD",
  "opponent": {"name": "string", "utr": number|null},
  "surface": "Clay|Hard|Grass",
  "score": {"sets": "7-5 6-3", "sets_arr": [[7,5],[6,3]], "winner": "JD|opponent"},
  "serve": {"first": {"pct_ad", "pct_deuce", "spd_ad", "spd_deuce"}, "second": {...}},
  "return": {"first": {"pct_ad", "pct_deuce", "spd_ad", "spd_deuce", "deep_ad", "deep_deuce"}, "second": {...}},
  "forehand": {"cc_in", "dtl_in", "spd_cc", "spd_dtl", "depth_cc", "depth_dtl"},
  "backhand": {"cc_in", "dtl_in", "spd_cc", "spd_dtl", "depth_cc", "depth_dtl"},
  "shot_stats": {aces, service_winners, winners, fh_winners, bh_winners, ue, fh_ue, bh_ue, df, s1_in_n/total, s2_in_n/total, serve_pts_won_pct, s1_pts_won_pct, s2_pts_won_pct, return_pts_won_pct, ret1/ret2_pts_won_pct, total_pts_won_pct, bp_saved/won_pct/n/total, max_ball_spd, total_shots, fh_pct, bh_pct, flat/topspin/slice_pct},
  "opp_shots": {serve, return, forehand, backhand (same structure as JD), stats (same as shot_stats), distribution},
  "what_worked": ["string"], "what_didnt": ["string"], "key_number": "string"
}
```

## Supabase Schema
Table: `matches`
Columns: id(text PK), date, opponent_name, opponent_utr, surface, score_sets, score_sets_arr(jsonb), score_winner, serve(jsonb), return(jsonb), forehand(jsonb), backhand(jsonb), shot_stats(jsonb), opp_shots(jsonb), what_worked(jsonb), what_didnt(jsonb), key_number, created_at

**Known Supabase quirk:** JSONB arrays can deserialize as plain objects `{"0":"a","1":"b"}`. Fixed in `dbToMatch()` with `toArr()` (strings) and `toSetsArr()` (score sets [[n,n]]).

## Key Patterns

### deepMerge (in helpers.ts)
Used by FixMatchModal to merge new extraction into existing match. NEVER overwrites existing non-null values. NEVER recurses into arrays (preserves sets_arr, what_worked shape).

### IMPORTANT_FIELDS (in helpers.ts)
Drives completeness checking. Listed with `section` so the UI can group missing fields by which SwingVision screenshot tab is needed (Serve/Return/Groundstrokes = "JD's Shots" tab, Match Stats = "Match Stats" tab).

### Match ID generation
`${date}-${opponent-name-slug}` — stable, collision-proof, used as Supabase PK.

## SwingVision Screenshots
Three tabs to capture per match:
1. **JD's Shots** tab → populates serve/return/forehand/backhand
2. **Match Stats** tab → populates shot_stats (aces, pts won %, winners, UE breakdown)
3. **[Opponent]'s Shots** tab → populates opp_shots

## Color System
- Green `#4ade80` (G) = good performance
- Amber `#fbbf24` (A) = average
- Red `#f87171` (R) = needs work
- Blue `#60a5fa` (B) = neutral/info

## Known Issues / Active Bugs
- App crashes with "e is not iterable" — score sets_arr rendering, defensive fix in MatchDetail line ~99-103 handles both array and plain-object formats from deepMerge

## Environment Variables
- `ANTHROPIC_API_KEY` — Claude API
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
