# Agassi — Feature Log

Each entry documents what was built, why it was designed that way, what was left out, and the rationale behind every decision. This file is the long-term memory for product decisions.

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
