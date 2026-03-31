# Agassi — Feature Log

Each entry documents what was built, why it was designed that way, what was left out, and the rationale behind every decision. This file is the long-term memory for product decisions.

---

## Intelligence Layer — Signals Framework (Cluster A)
**Shipped:** 2026-03-31
**Files:** `app/lib/signals/` (new module: types.ts, compute.ts, correlations.ts, tendencies.ts, strokes.ts, journal.ts, profile.ts), `app/components/Strategy.tsx`, `app/components/JDStats.tsx`, `app/components/Debrief.tsx`

### What it does
New `app/lib/signals/` computation module that extracts meaningful patterns from raw match data. All display components and future AI prompts consume the same typed signal objects.

**Win/loss correlations (16 candidate stats):** For each stat, matches are split at the median threshold. Win rate is computed per bucket, and lift (percentage point improvement) is the headline metric. Cohen's d effect size ranks signals internally. Top 5 surfaced in JDStats "Win Drivers" section. #1 signal shown as "Your #1 Edge" in Strategy tab.

**Signal language:** Lift-first framing — "Keeping UE below 17 boosts your win chance by 45%" as headline. Full split ("78% win rate when below vs 33% when above") as detail. If the data contradicts the assumed direction (e.g. higher pace = more losses), the insight auto-flips.

**Stroke intelligence:** Per-stroke (FH CC, FH DTL, BH CC, BH DTL) analysis: usage %, effectiveness (winner rate minus error rate), % in, pace. Each stroke tagged: hidden_weapon (high effectiveness, low usage), overused (low effectiveness, high usage), reliable, or liability. Shot-mix correlations: "Hitting more forehands boosts win chance by X%."

**Tendencies (xlsx-only data):** Serve direction bias (T% / wide%), FH speed consistency (std dev), contact height trend, serve+1 pattern, rally profile. Extracted from existing `shot_stats` JSONB fields that were stored but never displayed.

**Journal correlations:** Recovery, composure, focus, plan execution, warmup type, opponent difficulty, handedness — all correlated with win/loss using the same lift framework. Plus loss attribution frequency analysis.

**Player profiles — JD:** Style (Baseliner/Aggressive Baseliner/Counterpuncher/Serve-dominant/All-Court) auto-derived from career stats. Weapon = highest-performing stat category. Weakness = stat with largest negative impact on win rate (from correlations). Clutch = BP win% minus overall point win%. Aggression index = winners minus UE.

**Opponent profiles:** Same classification applied per opponent from `opp_shots` data. Plus serve predictability score and mismatch detection (flags when data-derived style differs from journal entry).

**Debrief career context:** Each match debrief now shows whether this match's key stats were on the winning or losing side of the top career win drivers.

### Design rationale
- **Signals module as foundation for Clusters B and C.** The typed `SignalSet` output is consumed by display components (B) and will be serialized into AI prompts (C). Same computation, different framing per consumer.
- **Lift framing over raw win rates.** Coaches say "do this, it gives you an edge" — not "here's your conditional probability." The lift number is actionable and ranking by lift surfaces the most impactful signals first.
- **Compute-on-read, client-side.** 10-50 matches is trivially fast. No schema migrations, no stale caches, easy to iterate on signal logic.
- **Threshold buckets (median split) over regression.** With 10-15 matches, regression is unreliable. Median split + lift is robust and produces coach-readable output. Cohen's d for internal ranking adds statistical rigor without exposing it.
- **Auto-flipping correlation direction.** If data says "higher BH pace = more losses" (contradicting the `higherIsBetter` flag), the insight automatically flips to "Keeping BH pace below X boosts win chance." Data wins over assumptions.
- **Stroke tagging.** "Your BH CC is 92% in but only 15% of your shots — hidden weapon" is immediately actionable. Tags computed from effectiveness quartiles relative to the player's own strokes.
- **Profile mismatch detection.** If journal says "Baseliner" but data says "Big Server," the mismatch is surfaced. Challenges assumptions with evidence.

### What was left out
- **Shot-level signals from `match_shots` table** (pressure point analysis, fatigue curves, court zones, set progression). Needs a server API endpoint to aggregate 800+ rows × N matches — too heavy for client-side. Signal types are designed to plug in later (Phase 6 in plan).
- **Surface-specific signals.** All correlations use all matches regardless of surface. Surface filter (Cluster B, NEXT #2) will make signals surface-aware when built.
- **AI coaching narration of signals.** Signals produce `insight` strings in coach language, ready for Cluster C prompts — but no AI integration yet.
- **Stroke usage estimation is approximate.** CC/DTL split estimated as 65/35 since exact per-direction shot counts would need `match_shots` aggregation. Sufficient for tagging, will be exact when Phase 6 ships.
- **Opponent profiles need `opp_shots` data.** Opponents with only journal data (no screenshots/xlsx) don't get auto-derived profiles.

---

## Upload Flow Redesign — Screenshots + xlsx Combined, Journal Pre-population
**Shipped:** 2026-03-30
**Files:** `app/components/UploadMatch.tsx`

### What it does
- Upload step renamed "Add Data" — now shows three screenshot slots (JD's Shots, Opp's Shots, Match Stats) and one xlsx slot side by side. Any combination works.
- Screenshots processed first via `/api/extract`, saved as ground truth for all aggregated stats. xlsx processed second, merges only unique analytics without touching screenshot stats.
- Overwrite warning: if match already has screenshot stats and new screenshots are uploaded, an amber inline warning requires explicit confirmation before replacing.
- Edit Journal now pre-populates every field from the saved journal — recovery %, match type, warmup, focus, composure, decided by, opponent notes, etc. Previously the form was always blank on edit.
- Journal is never touched by screenshot or xlsx upload paths.

### Design rationale
- Screenshots are source of truth for aggregated stats (SwingVision computed them correctly). xlsx uniquely provides raw shot/point rows + 9 analytics fields that screenshots can't give (rally length, serve direction T%/wide%, serve+1 tendency, contact height, speed std dev, opp serve direction). Combining both in one screen removes the two-step upload friction.
- Overwrite warning only triggers when re-uploading screenshots on a match with existing stats — not on first upload, not on xlsx-only upload. Avoids annoying unnecessary confirmations.
- Journal pre-population: editing answers you already gave should show what you gave. Blank form on edit was a usability bug.

### What was left out
- No screenshot preview before extraction — file name only, no thumbnail. Adds complexity for minimal value.
- No per-file extraction status (e.g. "JD's Shots ✓ · Opp's Shots ✓") — single status message is sufficient.
- Overwrite warning does not diff what changed — just warns. Diffing would require re-running extraction first.

---

## xlsx Parser + Data Model Restructure — Screenshots as Ground Truth
**Shipped:** 2026-03-30
**Files:** `app/lib/parseSwingVision.ts`, `app/api/matches/[id]/upload-csv/route.ts`

### What it does
**Data model:**
- Screenshots (via `/api/extract`) are now the sole source of truth for all aggregated stats: serve %, serve speed, return %, return speed + deep %, groundstroke %In + speed + deep %, shot distribution, spin distribution, winners, UEs, points won %, break points.
- xlsx contributes only what screenshots cannot provide: rally mean, rally % short/long, JD serve direction (T%/wide%), serve+1 DTL tendency, FH/BH contact height, FH speed std deviation, opponent serve direction (T%/wide%). Stored by merging into existing `shot_stats` JSONB — never overwrites screenshot fields.
- Raw `match_shots` and `match_points` rows still fully inserted from xlsx.

**Parser changes:**
- `parseSwingVisionXlsx` now returns `xlsxExtras` (9 unique JD fields + opp serve direction) instead of `matchData` (full aggregated stats). All computation still happens internally but only the unique fields are exported.
- `Feed` shot type filtered out at normalisation time.
- Deep % uses coordinate-based threshold (`bounce_y > 17.37 || bounce_y < 6.4`) instead of unreliable categorical label.
- Return classification uses rally position (first non-serve shot from returner per point) instead of `shot_context === 'serve_plus_one'` which had survivor selection bias and inflated in-rate near 100%.
- Serve % denominator uses Points sheet (actual serve attempts) instead of Shots sheet inference.

**Route changes:**
- `upload-csv`: fetches existing match first, merges `xlsxExtras` into existing `shot_stats`/`opp_shots`, writes only those two fields + `has_shot_data`. Never touches `serve`, `return`, `forehand`, `backhand`.
- Handles new matches (PGRST116): creates minimal record before inserting shots/points so FK constraints hold.
- Returns full updated match from Supabase so UI doesn't reconstruct from local state.

### Design rationale
Full re-audit of the parser against 4 matches with SwingVision screenshot ground truth revealed:
- Categorical `bounce_depth` label is unreliable — 'short' shots appeared at y=23.7m (near far baseline). Coordinate threshold is always correct.
- `ctx='serve_plus_one'` survivor bias: only returns that continued the rally got this tag. Returns that went out/net (ctx='first_serve'/'second_serve') were excluded → inflated in-rate.
- Serve denominator: inferring from Shots sheet missed fault serves not recorded as shots → under-counted attempts → inflated %.
- Groundstroke %In and speed were closest to screenshots (±1–4 km/h avg) but still direction-label-dependent. Screenshots are correct by definition (SwingVision computed them).

### What was left out
- Opponent aggregated stats (serve %, speeds, groundstroke stats) also moved to screenshots. Only opp serve direction (T%/wide%) kept from xlsx as it's not on any screenshot.
- Completely removing `computeServe`, `computeReturn`, `computeGroundstroke` from parser output — they still run internally (needed for internal point-counting logic) but their output is no longer stored.
- Legacy `/api/extract` screenshot-only flow kept as code fallback. Not surfaced in UI.

---

## Documentation Index + Mandatory FEATURES.md Rule
**Shipped:** 2026-03-30
**Files:** `CLAUDE.md`, `FEATURES.md`, `BACKLOG.md`

### What it does
- Added Documentation Index table to `CLAUDE.md` listing all project docs and their purpose — loaded at every session start so Claude never loses context about where things live.
- Gate 06 in `CLAUDE.md` updated: FEATURES.md entry is now mandatory for every code change (feature, refactor, bug fix, data model change). Minimum entry format specified.
- Added 8-entry backlog section "Raw Shot & Point Data" capturing what can be built with the xlsx-exclusive raw data (heatmaps, scouting profiles, rally vs outcome, pressure point analysis, etc.).

### Design rationale
Several sessions had shipped meaningful changes without FEATURES.md entries, losing decision rationale. Making the rule explicit and specifying a minimum format removes ambiguity about when it applies (always) and what's required.

### What was left out
- No automated changelog generation from git commits. Manual entries in FEATURES.md preserve the why, which git history cannot.

---

## Match Journal
**Shipped:** 2026-03-26
**Component:** `app/components/UploadMatch.tsx`
**Schema:** `matches.journal JSONB`

### What it does
A Whoop-style post-match journal embedded in the upload flow. Three collapsible sections (Before the Match, After the Match, Context). All questions optional — zero friction to skip. Submitted together with SwingVision screenshots in a single action.

### Design rationale
- Inspired by Whoop journal: tap-based, no typing, feels like reflection not admin
- After the Match open by default — highest value section (game plan adherence, focus, composure)
- Before the Match collapsed — useful but secondary to post-match reflection
- Context collapsed — mostly pre-fills from previous matches for known opponents
- Dots (1–5) for subjective scales; chips (single/multi-select) for categorical answers
- "all optional" label + "hide ▲" always visible — no guilt for skipping

### Questions
**Before:** Recovery score (Low/Moderate/Good/Peak), physical feel (1–5 dots), match type, warmup
**After:** Game plan execution (Yes/Mostly/No), focus (1–5), composure (1–5), what decided it (multi-select), top priority for next match with this opponent (single-select)
**Context:** Opponent style (incl. Moonballer), handedness, conditions

### What was left out (v1)
- "Luck" chip removed from "what decided it" — not actionable
- Physical feel dots kept but may be redundant with recovery score — monitor usage
- No free-text notes field — keep zero-typing constraint
- No time-of-day question — low leverage until more data

### Data use (planned)
- Recovery score / physical feel → correlate with serve speed and UE count
- Game plan execution → single most predictive variable for win rate
- Focus + composure → correlate with BP conversion
- "What decided it" → recurring theme detection across matches
- Top priority → surface per-opponent coaching loop in Strategy tab
- Opponent style → pre-fill Strategy tab when same opponent selected

---

## Opponent Tendencies Panel + Field Notes (Strategy tab)
**Shipped:** 2026-03-26
**Component:** `app/components/Strategy.tsx`

### What it does
When a known opponent is selected in Strategy, shows two new panels above the focus cards:
1. **Opponent Tendencies** — aggregated `opp_shots` data (serve %, speed, FH/BH CC%, UE, winners) from all recorded H2H matches, displayed as data rows with contextual notes
2. **Field Notes** — `what_worked` ✓ and `what_didnt` ✗ bullets from the last 3 H2H matches, organized by date

### Design rationale
- `opp_shots` was already being stored but only used as text in the narrative cards — surfacing it as structured data makes it immediately actionable
- Field Notes turns unstructured extraction output into a coaching diary — pattern recognition across sessions without any extra input from JD

### What was left out (v1)
- No opponent profile page — keeping it contextual in Strategy is sufficient
- No editing of opponent data — Fix Match covers corrections

---

## JD Stats — Win/Loss Filter, Sparklines, Shot Mix, Attribution
**Shipped:** 2026-03-26
**Component:** `app/components/JDStats.tsx`

### What it does
- **Win/Loss/All filter** — three pills recompute every average and the radar using only filtered matches
- **Trend sparklines** — inline SVG on every stat bar showing last 8 matches (green = improving, red = regressing)
- **Shot mix** — segmented bars for FH/BH/Volley distribution and Topspin/Flat/Slice spin profile
- **Winner & error attribution** — FH vs BH split as segmented bars with per-match averages

### Design rationale
- Win/loss split is the most actionable analytical question: "what do I do differently when I win?"
- Sparklines replace static averages with trend direction — a declining stat in a positive average is invisible otherwise
- Shot mix and attribution use data already extracted but never displayed anywhere

### What was left out (v1)
- No surface filter (planned — defer until more matches per surface)
- No date range filter — all-time only for now
- No trend chart page — sparklines inline are sufficient at current data volume

---

## Architecture Refactor — page.tsx split into components
**Shipped:** 2026-03-25
**Motivation:** 2000-line monolith caused ~60–70% wasted tokens per session (every task read the full file even if only one component was relevant)

### What changed
- `app/page.tsx` reduced from ~2000 to ~305 lines (nav + tab routing only)
- 7 new component files extracted: MatchDetail, StatBar, JDStats, Strategy, RadarChart, UploadMatch, FixMatchModal
- `app/lib/helpers.tsx` — all shared utilities (was inline in page.tsx)
- `app/types.ts` — all TypeScript interfaces
- `lib/atp-players.ts` — ATP reference data

### Impact
Any future task reads only the relevant file (~150–300 lines) instead of the full monolith.

---

## Fix Match — Overwrite Mode
**Shipped:** 2026-03-25
**Component:** `app/components/FixMatchModal.tsx`

### What it does
Adds a "Correct Values" mode alongside the existing "Fill Gaps" mode. Fill Gaps uses `deepMerge` (never overwrites). Correct Values uses `overwriteMerge` (incoming replaces existing where not null). Button turns red in overwrite mode.

### Why it was needed
`deepMerge` is correct for completeness (never loses good data) but wrong for corrections. If Claude misreads a stat on first upload, subsequent Fix Match runs can never fix it — the wrong value is preserved. Example: forehand DTL speed stored as 81 km/h when SwingVision showed 73 km/h.

### What was left out
- No field-by-field selection of what to overwrite — all-or-nothing per extraction pass. Sufficient for current use case.

---

## opp_shots — Opponent Shot Data
**Shipped:** 2026-03-25
**Schema:** `matches.opp_shots JSONB`

### What it does
Extracts opponent shot stats from the "[Opponent]'s Shots" SwingVision tab and stores them alongside JD's data. Same structure as JD's serve/return/forehand/backhand + shot_stats + distribution.

### Why it was added
SwingVision tracks opponent stats with the same precision as JD's. Storing them enables per-opponent profiling, strategy generation based on their actual tendencies, and H2H pattern analysis — none of which were possible with score + JD stats alone.
