# Agassi — Roadmap

This is the single source of truth for what's being built, what's next, and what's not happening. Updated after every shipped feature or priority change.

**Last updated:** 2026-03-30

---

## NOW — In progress

_Nothing in progress. Pick up NEXT #1._

---

## SHIPPED

### Upload flow redesign — screenshots + xlsx combined ✓
**Shipped:** 2026-03-30
- [x] "Add Data" screen: 3 screenshot slots (JD's Shots, Opp's Shots, Match Stats) + xlsx slot — any combination
- [x] Screenshots are ground truth for all aggregated stats (via `/api/extract`)
- [x] xlsx contributes only what screenshots can't: rally stats, serve direction, contact height, speed std dev, opp serve direction
- [x] Overwrite warning when re-uploading screenshots on a match with existing stats
- [x] Edit Journal pre-populates all fields from saved journal
- [x] Journal never touched by upload paths

### SwingVision data layer + parser restructure ✓
**Shipped:** 2026-03-28 (layer) · 2026-03-30 (restructure)
- [x] `match_shots` table — every shot: stroke, spin, speed, x/y coordinates, direction, result
- [x] `match_points` table — every point: duration, serve state, score context, break/set point flags
- [x] `parseSwingVisionXlsx` — parser outputs only xlsx-unique fields + raw rows; screenshot stats not derived from xlsx
- [x] Parser bug fixes: coordinate-based deep %, rally-position return classification, Points-sheet serve denominators, Feed shot filtering
- [x] `POST /api/matches/[id]/upload-csv` — merges xlsxExtras into existing match, never overwrites screenshot stats
- [x] `GET /api/matches/[id]/shots` and `/points` — shot/point data endpoints
- [x] `has_shot_data` flag on matches — display layer knows when shot-level data is available

**Foundation:** shot x/y coordinates stored per match → court heat maps, scouting profiles (LATER).

### UX/UI revamp — full design rethink ✓
Premium Sports Editorial design language fully implemented:
- [x] Fonts: Inter (body), DM Mono (data), Bebas Neue (display)
- [x] Design tokens: colour, spacing, typography — all centralised in helpers.tsx
- [x] 4-tab navigation: Matches | Next Match | My Game | + Add
- [x] Match card with state dots, stat pills, inline Debrief on expand
- [x] Pill chips (20px radius), Inter bold section headers
- [x] Match state model: complete / journal-only / stats-only / empty

### Journal function (match stats + player input) ✓
Whoop-style post-match journal, fully shipped:
- [x] Supabase migration applied: `ALTER TABLE matches ADD COLUMN IF NOT EXISTS journal JSONB;`
- [x] Supabase migration applied: `ALTER TABLE matches ADD COLUMN IF NOT EXISTS opp_shots JSONB;`
- [x] Question set finalised (16 fields)
- [x] Journal decoupled from stats upload — fillable before SwingVision processes
- [x] Duplicate match prevention — match ID gated on opponent+date entry
- [x] Fix / re-upload integrated into + Add flow
- [x] Debrief component — rule-based coaching bullets (UE, serve, BP, game plan)
- [x] Journal data surfaced in JDStats and Strategy

---

## NEXT — Queued and prioritised (ICE order)

### 1. Win/loss correlation surfacing — ICE 448
The data needed to say "when X happens, you win Y% of the time" already exists. Surface it clearly in JDStats and Strategy.

Examples:
- "When your 1st serve Ad is above 68%, you win 82% of matches"
- "Your UE count is the single strongest predictor of your result"
- "You've won 100% of matches where you rated game plan execution as Yes or Mostly"

**ICE:** Impact 8 × Confidence 8 × Ease 7 = 448

---

### 2. Surface filter in JDStats — ICE 432
Filter all JDStats metrics by Clay / Hard / Grass. JD plays on different surfaces and wants to see surface-specific patterns, not just all-time averages.

**ICE:** Impact 6 × Confidence 9 × Ease 8 = 432

---

### 3. Recovery & journal analytics — ICE 343
Surface correlations from journal data:
- Recovery score vs UE count — does low recovery predict more errors?
- Game plan execution vs win rate — "when you rate execution Yes or Mostly, you win X%"
- Time-of-day performance split — are you better morning or afternoon?

**ICE:** Impact 7 × Confidence 7 × Ease 7 = 343

---

### 4. Functionality review — full audit — ICE 336
Review every tab, every feature, every data point against the full product context. Questions:
- What's currently shown that isn't earning its place?
- What data is collected but not surfaced anywhere useful?
- What interactions feel wrong on mobile?

**ICE:** Impact 6 × Confidence 8 × Ease 7 = 336

---

### 5. Pre-match prep mode — ICE 336
Streamlined day-of-match view: game plan summary, opponent tendencies, key stats to hit. Purpose-built for the 30 minutes before stepping on court.

**ICE:** Impact 7 × Confidence 8 × Ease 6 = 336

---

### 6. AI coaching layer — ICE 315
Replace rule-based debrief bullets with Claude-generated insights using full match data, journal, and historical context. Applies to: Debrief (post-match), Next Match strategy, JDStats patterns.

Prompt includes: this match stats, JD's historical averages, journal fields, opponent history. Output: 3–5 coaching bullets in coach voice, grounded in tennis best practices. Uses Claude API already wired in `/api/extract`.

**Data available when this is built:** full shot-level data from `match_shots` (stroke, spin, speed, x/y coordinates, direction, result per shot) and `match_points` (duration, context, outcome per point) — 800+ rows per match. The AI layer should exploit this, not just aggregate stats.

**ICE:** Impact 9 × Confidence 7 × Ease 5 = 315

---

## LATER — Planned but unscoped

- **Court visualisations** — serve heat maps, forehand/backhand direction charts, error location maps. Shot x/y coordinates are already stored per match in `match_shots`. Waiting for enough matches to make patterns meaningful.
- **Match timeline / evolution tab** — visual progress over time (sparklines at match level, not just stat level)
- **Opponent database** — dedicated profiles per opponent (beyond the H2H panel in Strategy)
- **Export / session summary** — PDF or text summary after upload, shareable with a real coach
- **Architecture flexibility for other users** — when the decision is made to open this to more players, "JD" becomes a configurable variable. Not before.

---

## WON'T DO — Explicit out-of-scope decisions

| What | Why not |
|---|---|
| Auth / login system | Single user, adds complexity with zero benefit right now |
| Social features, leaderboards | Contradicts the "personal coaching system" framing |
| Replicating Whoop / fitness tracking | Use Whoop's output (recovery score), don't rebuild it |
| General tennis product for unknown users | Only build for JD until the explicit decision is made |
| Real-time match tracking (point by point) | SwingVision already does this; we use the post-match summary |
| Video analysis | Out of scope — SwingVision handles video |

---

## How to use this document

- **Picking up work**: start from NOW, then NEXT in order. Don't skip ahead.
- **Proposing a new feature**: it goes through the 6-gate process (see CLAUDE.md). If approved, it lands in NEXT or LATER.
- **Deciding what's urgent**: the three product goals in PRODUCT.md are the tiebreaker. Coach relationship > match wins > progress tracking.
- **Updating this doc**: do it every time a NOW item ships or a new priority is confirmed by JD.
