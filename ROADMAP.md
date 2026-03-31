# Agassi — Roadmap

This is the single source of truth for what's being built, what's next, and what's not happening. Updated after every shipped feature or priority change.

**Last updated:** 2026-03-31

---

## NOW — In progress

_Nothing in progress. Pick up NEXT #2._

---

## SHIPPED

### Intelligence Layer — Signals Framework (Cluster A) ✓
**Shipped:** 2026-03-31
- [x] `app/lib/signals/` module — typed Signal, StrokeSignal, PlayerProfile, SignalSet
- [x] Win/loss correlations — 16 candidate stats, lift-first framing, Cohen's d ranking
- [x] Stroke intelligence — per-stroke usage/effectiveness/tagging (hidden_weapon, overused, reliable, liability)
- [x] Tendencies — serve direction, speed consistency, contact height, serve+1, rally profile
- [x] Journal correlations — recovery, composure, focus, plan execution, warmup, difficulty
- [x] JD profile — auto-derived style, weapon, weakness, clutch delta, aggression index
- [x] Opponent profiles — auto-derived style/weapon/weakness, serve predictability, journal mismatch detection
- [x] Integrated into Strategy (top win driver, tendencies, stroke intel, opponent profile), JDStats (identity, win drivers, strokes, journal patterns), Debrief (career context)

*Covers NEXT #1 (win/loss correlations), NEXT #3 (journal analytics), and NEXT #8 (serve direction tendency).*


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

> Cluster tags: **[A] Intelligence Layer · [B] Visualisation · [C] AI Coaching**
> See `CLUSTERS.md` for full strategic context, dependencies, and sequencing across all three layers.

### ~~1. Win/loss correlation surfacing~~ → SHIPPED (Intelligence Layer)

---

### 2. Surface filter in JDStats — ICE 360 [B]
Filter all JDStats metrics by Clay / Hard / Grass. JD plays on different surfaces and wants to see surface-specific patterns, not just all-time averages.

**ICE:** Impact 5 × Confidence 9 × Ease 8 = 360
*Note: Impact revised — it's a filter, not an insight. Value grows as more matches per surface accumulate.*

---

### ~~3. Recovery & journal analytics~~ → SHIPPED (Intelligence Layer)

---

### 4. Functionality review — full audit — ICE 144 [B] → move to LATER
Review every tab, every feature, every data point against the full product context. Questions:
- What's currently shown that isn't earning its place?
- What data is collected but not surfaced anywhere useful?
- What interactions feel wrong on mobile?

**ICE:** Impact 3 × Confidence 8 × Ease 6 = 144
*Note: Premature — app is 5 days old. Move to LATER, revisit after 4–6 weeks of real usage data.*

---

### 5. Pre-match prep mode — ICE 294 [C]
Streamlined day-of-match view: game plan summary, opponent tendencies, key stats to hit. Purpose-built for the 30 minutes before stepping on court.

**ICE:** Impact 7 × Confidence 7 × Ease 6 = 294
*Note: Strategy tab already covers most of this. Ensure the delta is clear before building — what does "prep mode" add that Strategy doesn't? AI engine (Cluster C) is the likely differentiator.*

---

### 6. AI coaching layer — ICE 216 [C]
Replace rule-based debrief bullets with Claude-generated insights using full match data, journal, and historical context. Applies to: Debrief (post-match), Next Match strategy, JDStats patterns.

Prompt includes: this match stats, JD's historical averages, journal fields, opponent history. Output: 3–5 coaching bullets in coach voice, grounded in tennis best practices. Uses Claude API already wired in `/api/extract`.

**Data available when this is built:** full shot-level data from `match_shots` (stroke, spin, speed, x/y coordinates, direction, result per shot) and `match_points` (duration, context, outcome per point) — 800+ rows per match. The AI layer should exploit this, not just aggregate stats.

**ICE:** Impact 9 × Confidence 6 × Ease 4 = 216
*Note: Highest strategic importance despite lower ICE. C revised — output quality uncertain until tested. E revised — prompt engineering, context window design, and multi-match testing is a week of work. Build after Cluster A signals are clean.*

---

## PROMOTED from backlog — zero-dependency quick wins

These were backlog ideas with no computation dependencies. High daily payoff, low effort. Promoted to NEXT.

### 7. Color-coded W/L in match list — ICE 500 [B]
Add green/red to score display in match list. Win/loss immediately scannable without reading the score text. Used every time JD opens the app.

**ICE:** Impact 5 × Confidence 10 × Ease 10 = 500
*Zero dependencies. ~30 min. Ship before anything else.*

---

### ~~8. Serve direction tendency reveal in Strategy~~ → SHIPPED (Intelligence Layer)

---

## LATER — Planned but unscoped

- **Functionality review / audit** — moved from NEXT. Wait 4–6 weeks of usage before auditing. [B]
- **Court visualisations** — serve heat maps, forehand/backhand direction charts, error location maps. Shot x/y coordinates are already stored per match in `match_shots`. Waiting for enough matches to make patterns meaningful. [B]
- **Match timeline / evolution tab** — visual progress over time (sparklines at match level, not just stat level). [B]
- **Personal bests tracking** — fastest serve, highest 1st serve %, most winners. Needs a few months of data. [B]
- **Opponent database** — dedicated profiles per opponent (beyond the H2H panel in Strategy). [C]
- **Export / session summary** — PDF or text summary after upload, shareable with a real coach.
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
