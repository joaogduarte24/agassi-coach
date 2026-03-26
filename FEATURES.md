# Agassi — Feature Log

Each entry documents what was built, why it was designed that way, what was left out, and the rationale behind every decision. This file is the long-term memory for product decisions.

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
