# Agassi Tennis Coach — Claude Context

## Project
Next.js 14 app for João Duarte (JD) to track tennis matches and get AI strategy coaching.
Live: https://agassi-app.vercel.app | Supabase: NEXT_PUBLIC_SUPABASE_URL in .env

## Product Context

**User:** João Duarte (JD) — serious amateur tennis player. Single user. Every feature is built for him specifically.

**Core goal (in priority order):**
1. Coach relationship with data — connect match stats to outcomes, surface patterns that explain wins and losses
2. More match wins — specific, data-driven game plans before every match
3. Progress tracking — make improvement visible over time

**Future:** At some point "JD" becomes any amateur player. The architecture should make that swap easy, but never build for it until explicitly decided.

**Design principles:** mobile-first (used post-match on phone), tap-based (no typing), high-leverage only (if it doesn't change on-court behaviour, cut it), direct copy (coach voice, not product voice).

**Read `PRODUCT.md` for the full context before making any product or design decisions.**

---

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
  "what_worked": ["string"], "what_didnt": ["string"], "key_number": "string",
  "journal": {
    "recovery": 0-100|null,
    "match_type": "Practice|League|Tournament|Friendly|null",
    "warmup": "Full|Light|None|null",
    "opp_difficulty": "Easier than me|Even|Tougher than me|Much tougher|null",
    "plan_executed": "Yes|Mostly|No|null",
    "focus": 1-5|null,
    "composure": 1-5|null,
    "whoop_strain": 0-21|null,
    "decided_by": ["My serve"|"My return"|"My errors"|"Their level"|"Pressure moments"|"Fitness"|"Luck"]|null,
    "priority_next": "Serve %|Reduce UE|Return depth|BP conversion|Footwork|Composure|Aggression|null",
    "opp_style": "Baseliner|Serve & Volleyer|All-Court|Pusher|Big Server|Moonballer|null",
    "opp_lefty": true|false|null,
    "net_game": "Stays back|Comes to net|Chip & charge|null",
    "mental_game": "Crumbles under pressure|Steady|Ice cold|null",
    "opp_weapon": "Serve|Forehand|Backhand|Volley|Movement|null",
    "opp_weakness": "Serve|Backhand|Movement|Second ball|null"
  }
}
```

## Supabase Schema
Table: `matches`
Columns: id(text PK), date, opponent_name, opponent_utr, surface, score_sets, score_sets_arr(jsonb), score_winner, serve(jsonb), return(jsonb), forehand(jsonb), backhand(jsonb), shot_stats(jsonb), opp_shots(jsonb), what_worked(jsonb), what_didnt(jsonb), key_number, journal(jsonb), created_at

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

## Feature Development Process

Every feature goes through all 6 gates — no skipping.

**Hard rule: gates 01–03 are always presented to JD for approval before any code is written. Implementation only starts after explicit sign-off on design, copy, UX and UI.**

---

### 01 · Benchmark + understand
Research how best apps solve this. What do SwingVision, Whoop, Strava, and coach apps do? What's the established user behaviour pattern?

Deliverable: reference examples + user behaviour insight

---

### 02 · User perspective + journey
When does JD use this? What's he feeling? What did he just do? What does he want to happen next?

Deliverable: user moment + emotional state + flow through the feature

---

### 03 · Design + copy proposal
UX flow, layout, exact labels, microcopy, empty states, error states. Nothing vague — specific words and structure.

Deliverable: screen-by-screen description + copy for every element

---

### 04 · Scope + tradeoffs
What's in v1? What's deliberately left out? What data does this need? Any storage schema changes?

Deliverable: v1 boundary + out-of-scope list + data requirements
- Which component file(s) change?
- New Supabase column? → write migration SQL, add to supabase-schema.sql
- New TypeScript types? → update app/types.ts
- API changes? → update matchToDb() and dbToMatch() in app/api/matches/route.ts
- Extraction changes? → update prompt in app/api/extract/route.ts
- Does page.tsx need to change? → almost never (nav-only)

---

### 05 · Implement
Write the code. Follow the agreed design and copy exactly. No scope creep mid-implementation.
- Run `npm run build` — must be zero errors
- Screenshot proof from preview server
- Check browser console for errors
- Test happy path and empty/no-data state

Deliverable: working feature matching the spec from gate 03

---

### 06 · Document
Log what was built, why it was designed that way, what was left out and why. Full rationale preserved.

Deliverable: entry in FEATURES.md with full context + decisions. If schema changed: update Data Shape section in this file and supabase-schema.sql.

---

## Known Issues / Active Bugs
- App crashes with "e is not iterable" — score sets_arr rendering, defensive fix in MatchDetail line ~99-103 handles both array and plain-object formats from deepMerge

## Environment Variables
- `ANTHROPIC_API_KEY` — Claude API
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
