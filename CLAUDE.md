# Agassi Tennis Coach — Claude Context

## Project
Next.js 14 app for João Duarte (JD) to track tennis matches and get AI strategy coaching.
Live: https://agassi-app.vercel.app | Supabase: NEXT_PUBLIC_SUPABASE_URL in .env

## gstack

Use the `/browse` skill from gstack for all web browsing. **Never** use `mcp__claude-in-chrome__*` tools.

Available gstack skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.

## Documentation Index

All docs live in `~/projects/agassi/`. Always read the relevant file before making product, design, or architecture decisions.

| File | Purpose |
|---|---|
| `CLAUDE.md` | This file. Project context, architecture, data shapes, key patterns, bug fix + feature dev process. |
| `PRODUCT.md` | Full product vision, user goals, design principles. Read before any feature decision. |
| `CLUSTERS.md` | **Strategic grouping of all roadmap + backlog work into three layers (Intelligence / Viz / AI). Read before any non-trivial feature.** |
| `ROADMAP.md` | Committed upcoming features, prioritised with ICE scores. |
| `BACKLOG.md` | Raw ideas not yet committed. Add new ideas here first. |
| `FEATURES.md` | Log of everything shipped — what was built, why, what was left out. |
| `DATA-GAPS.md` | **Every data point stored but not yet surfaced in the UI. Update on every ship.** |
| `CROWDSOURCE.md` | **Crowdsource benchmark vision — current (N=1) + future (multi-user). The benchmark IS the product. Read before any work touching opponents, `opp_shots`, `benchmarks.ts`, or the contribution pipeline.** |
| `DESIGN.md` | Visual design system, component patterns, colour usage. |
| `DEVELOPER.md` | Dev setup, environment variables, deploy process. |
| `README.md` | Public-facing project overview. |

---

## Agent Routing

When a request comes in, pick the agent before touching code. Default = no agent (normal Claude). Invoke an agent only when its lane clearly fits.

| Request shape | Agent | Trigger words / signals |
|---|---|---|
| "What should I do against X?", pre-match prep, opponent scouting, tactical patterns, video review | **Tennis Coach** | next match, game plan, beat, opponent name, what worked |
| "Is this stat real?", small-N concerns, SwingVision data quality, validating a claim before surfacing it | **Tennis Data Analyst** | sample size, significant, trust, outlier, data looks weird |
| Any new feature, redesign, copy, UX flow, gates 01–03 | **Product & Design Lead** | build, design, redesign, screen, copy, label, flow |
| Loss debriefs, composure, pressure, mental side, framing a bad result | **Sports Psychologist** | choked, tilt, nervous, pressure, mental, head, after a loss |
| Bug fixes, refactors, schema changes, infra, "why is this broken" | _none — normal Claude_ | error, build, deploy, schema, type, console |
| Strategic roadmap / cluster sequencing decisions | _none — normal Claude + CLUSTERS.md_ | roadmap, prioritize, what next, cluster |

**Rules:**
- Multiple agents can run in sequence (Data Analyst validates → Coach interprets → Psych frames). Never in parallel on the same question.
- If two lanes both fit, Product & Design Lead wins for *building*, Coach wins for *playing*.
- If nothing fits, don't force one. Normal Claude is the default, not the fallback.

---

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

## Match States

A match can exist in three states. The UI must handle all three:

| State | Journal | Stats | Debrief available? |
|---|---|---|---|
| Journal-only | ✓ | — | No |
| Stats-only | — | ✓ | No |
| Complete | ✓ | ✓ | Yes |

**Why this matters:** JD fills the journal immediately post-match (before SwingVision has processed). Stats are uploaded asynchronously, sometimes much later. Journal entry must never be blocked on stats upload. Debrief (bullet-point coaching summary) only surfaces when both are present.

---

## Key Architecture
- `app/page.tsx` — Home component only (~150 lines). Nav + tab routing.
- `app/components/` — One file per UI component (MatchDetail, Strategy, JDStats, UploadMatch, FixMatchModal, RadarChart, StatBar)
- `app/lib/helpers.ts` — All shared utilities: avg(), col(), fmtDate(), deepMerge(), getMissingFields(), computeAvgs(), IMPORTANT_FIELDS, ErrorBoundary, color constants
- `app/types.ts` — All TypeScript interfaces (Match, Avgs, OppShots, ShotStats, etc.)
- `app/api/extract/route.ts` — POST: sends screenshots to Claude claude-sonnet-4-20250514, returns parsed Match JSON. Used by the upload flow for screenshot-based stat extraction.
- `app/api/matches/route.ts` — GET/POST/DELETE: Supabase CRUD with toSetsArr() and toArr() normalizers for JSONB deserialization
- `app/api/matches/[id]/upload-csv/route.ts` — POST: parses SwingVision .xlsx, upserts match, bulk-inserts shots + points
- `app/api/matches/[id]/shots/route.ts` — GET: all shot rows for a match
- `app/api/matches/[id]/points/route.ts` — GET: all point rows for a match
- `app/lib/parseSwingVision.ts` — server-only xlsx parser (uses `xlsx` package). Returns matchData (maps to existing schema) + shotsRows + pointsRows
- `app/lib/signals/` — Intelligence Layer (Cluster A). Pure functions: `computeSignals(matches) → SignalSet`. Contains:
  - `types.ts` — Signal, StrokeSignal, PlayerProfile, OpponentProfile, SignalSet types
  - `compute.ts` — Orchestrator that runs all signal computations
  - `correlations.ts` — Win/loss correlation engine (16 stats, median split, lift + Cohen's d)
  - `tendencies.ts` — Serve direction, speed consistency, contact height, rally profile
  - `strokes.ts` — Per-stroke effectiveness tagging (hidden_weapon/overused/reliable/liability)
  - `journal.ts` — Journal field correlations with win/loss
  - `profile.ts` — Auto-derived player profiles (JD + opponents): style, weapon, weakness, clutch, aggression

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
    // Quick core (6 fields)
    "recovery": 0-100|null,
    "days_since_last_play": 0-30|null,
    "opp_difficulty": "Easier than me|Even|Tougher than me|Much tougher|null",
    "match_vibe": "In flow|Confident|Grinding|Frustrated|Flat|Anxious|null",
    "decided_by": ["My serve"|"My return"|"My errors"|"Their level"|"Pressure moments"|"Fitness"|"Close margin"|"Their moment"]|null,
    // Deep · Before
    "match_type": "Practice|League|Tournament|Friendly|null",
    "warmup": "Full|Light|None|null",
    "racket": "Wilson Ultra V5 100|...|null",
    "tension_kg": 15-35|null,
    "conditions": ["Indoor"|"Outdoor"|"Windy"|"Hot"|"Cold"|"Fast court"|"Slow court"]|null,
    "pre_confidence": 1-5|null,
    "expectation": "Expected win|Toss-up|Expected loss|null",
    "game_plan_text": "string|null",
    // Deep · After
    "whoop_strain": 0-21|null,
    "focus": 1-5|null,
    "composure": 1-5|null,
    "plan_executed": "Yes|Mostly|No|null",
    "match_arc_start": "Strong start|Slow start|Even start|null",
    "match_arc_finish": "Strong finish|Faded|Even finish|null",
    "momentum": "Came from behind|Let lead slip|Neither|null",
    "body_state": "Fresh|Tired|Sore|Cramped|Injured|null",
    "worst_moment": "Frustration|Fear|Complacency|Rage|None|null",
    "priority_next": "Serve %|Reduce UE|Return depth|BP conversion|Footwork|Composure|Aggression|null",
    "reflection_text": "string|null"
  }
}
```

**Opponent scouting (separate `opponents` table keyed by name):**
```json
{
  "name": "Gonçalo Oliveira",
  "style": "Baseliner-grinder|Baseliner-aggressive|Serve-volleyer|All-court|Pusher|Big server|Moonballer|null",
  "weapon": "Serve|Forehand|Backhand|Volley|Movement|Return|null",
  "weakness": "Serve|Backhand|Movement|Second ball|Mental|null",
  "notes": "one-line reminder, surfaces in pre-match brief|null",
  "updated_at": "ISO"
}
```
Pre-fills in the journal form on opponent select. Saved via PUT `/api/opponents`. Journal v2 (2026-04-16) moved opp_style/opp_weapon/opp_weakness/opp_lefty/net_game/mental_game OUT of `matches.journal` into this table. One-off migration available at POST `/api/opponents/migrate`.

## Supabase Schema

Table: `matches`
Columns: id(text PK), date, opponent_name, opponent_utr, surface, score_sets, score_sets_arr(jsonb), score_winner, serve(jsonb), return(jsonb), forehand(jsonb), backhand(jsonb), shot_stats(jsonb), opp_shots(jsonb), what_worked(jsonb), what_didnt(jsonb), key_number, journal(jsonb), has_shot_data(boolean), created_at

Table: `match_shots` — one row per shot (800+ rows per match)
Columns: id(uuid PK), match_id(text FK), player('jd'|'opponent'), shot_number, shot_type, stroke, spin, speed_kmh, point_number, game_number, set_number, bounce_depth, bounce_zone, bounce_x, bounce_y, hit_x, hit_y, hit_z, direction, result, video_time, created_at

Table: `match_points` — one row per point (~160 rows per match)
Columns: id(uuid PK), match_id(text FK), point_number, game_number, set_number, serve_state, server('jd'|'opponent'), jd_game_score, opp_game_score, point_winner('jd'|'opponent'), detail, break_point(bool), set_point(bool), duration_seconds, video_time, created_at

Table: `opponents` — one row per opponent (scouting profile)
Columns: name(text PK), style, weapon, weakness, notes, updated_at. Pre-fills in the journal form via GET `/api/opponents?name=`. Upserted via PUT `/api/opponents`.

**has_shot_data flag:** true when match was uploaded via CSV. Display layer and Debrief check this to show enriched content.

**shot_stats extended fields (CSV-only):** `rally_mean`, `rally_pct_short`, `rally_pct_long`, `s1_t_pct`, `s1_wide_pct`, `s1_after_dtl_pct`, `fh_spd_std`, `fh_contact_z`, `bh_contact_z`, `fh_cc_pct`, `fh_dtl_pct`, `bh_cc_pct`, `bh_dtl_pct` — computed at upload time, stored in shot_stats JSONB alongside aggregate stats. Rally length excludes serves (standard definition). Stroke direction percentages (fh_cc_pct etc.) are actual CC/DTL counts from match_shots, used by signals module instead of hardcoded estimates.

**Known Supabase quirk:** JSONB arrays can deserialize as plain objects `{"0":"a","1":"b"}`. Fixed in `dbToMatch()` with `toArr()` (strings) and `toSetsArr()` (score sets [[n,n]]).

## Key Patterns

### deepMerge (in helpers.ts)
Used by FixMatchModal to merge new extraction into existing match. NEVER overwrites existing non-null values. NEVER recurses into arrays (preserves sets_arr, what_worked shape).

### IMPORTANT_FIELDS (in helpers.ts)
Drives completeness checking. Listed with `section` so the UI can group missing fields by which SwingVision screenshot tab is needed (Serve/Return/Groundstrokes = "JD's Shots" tab, Match Stats = "Match Stats" tab).

### Match ID generation
`${date}-${opponent-name-slug}` — stable, collision-proof, used as Supabase PK.

## SwingVision Data Upload

**Data sources — screenshots are ground truth:**
- **3 screenshots** (JD's Shots tab, Opp's Shots tab, Match Stats tab) → sent to `/api/extract` → Claude extracts all aggregated stats (serve %, speeds, groundstroke %In + deep %, shot distribution, winners, UEs, points won %, etc.) → saved as the match record
- **xlsx export** → `/api/matches/[id]/upload-csv` → contributes ONLY what screenshots cannot provide (see below) + raw shot/point rows

**What xlsx uniquely provides (not on any screenshot):**
`rally_mean`, `rally_pct_short`, `rally_pct_long`, `s1_t_pct`, `s1_wide_pct`, `s1_after_dtl_pct`, `fh_spd_std`, `fh_contact_z`, `bh_contact_z`, `opp_s1_t_pct`, `opp_s1_wide_pct` — merged into existing `shot_stats`/`opp_shots` JSONB without overwriting screenshot-sourced fields.

**xlsx format:** 6 sheets — Settings (players, times), Shots (one row/shot with x/y coords + speed + direction), Points (one row/point with score context + duration), Games, Sets, Stats.

**Player mapping:** Settings.Host Team = JD, Settings.Guest Team = opponent. In Points sheet, server/winner encoded as 'host'/'guest'.

**Parser output:** `xlsxExtras` (11 unique fields) + `shotsRows` + `pointsRows`. Does NOT output serve/return/forehand/backhand aggregates — those come from screenshots.

## Color System
- Green `#4ade80` (G) = good performance
- Amber `#fbbf24` (A) = average
- Red `#f87171` (R) = needs work
- Blue `#60a5fa` (B) = neutral/info

## Bug Fix Process

1. **Reproduce** — confirm broken state before touching code
2. **Locate** — read the exact file/line, no guessing
3. **Fix** — minimal change only, no scope creep
4. **Build** — `npm run build` zero errors
5. **Verify** — preview test + screenshot of the fixed behaviour
6. **Ship** — commit + push

**Rules:** no permission needed · one fix per commit · if root cause is bigger, flag it · if stuck in a loop, stop and flag it — never retry the same failing approach

---

## Working Principles

**Simplicity first** — make every change as simple as possible. Touch only what's necessary. No side effects, no collateral "improvements," no speculative abstractions. Three similar lines > a premature helper.

**Root causes, not band-aids** — find the actual bug, not a workaround. If a fix feels hacky, pause and ask: "knowing everything I know now, what's the clean solution?" Skip this check for trivially obvious fixes.

**Re-plan when it breaks** — if implementation diverges from the agreed spec or something unexpected surfaces, stop coding and re-plan before continuing. Don't push through a broken approach.

**Prove it works** — never call something done without evidence. Build passes, preview screenshot, console clean, happy path + empty state tested. Ask: "would a staff engineer approve this?"

**Read before writing** — never propose changes to code you haven't read. Understand existing patterns before modifying them.

---

## Feature Development Process

Every feature goes through all 6 gates — no skipping.

**Hard rule: gates 01–03 are always presented to JD for approval before any code is written. Implementation only starts after explicit sign-off on design, copy, UX and UI.**

---

### 01 · Benchmark + understand
Read `CLUSTERS.md` first — identify which cluster(s) this feature belongs to, what it depends on, and whether the sequencing is right. Then research how best apps solve this problem. What do SwingVision, Whoop, Strava, and coach apps do? What's the established user behaviour pattern?

Deliverable: cluster placement + reference examples + user behaviour insight

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

**This gate is mandatory — no exceptions, no skipping, not even for small changes.**
Every code change that ships (feature, refactor, bug fix, data model change) gets a FEATURES.md entry before the session ends. If a session ends without one, the first thing the next session does is write it.

FEATURES.md entry minimum:
- What changed and in which files
- Why (the reasoning, not just "fixed X")
- What was left out and why
- Date shipped

**Also update on every ship:**
- `ROADMAP.md` — move NOW item to SHIPPED with bullet summary; update "Last updated" date
- `supabase-schema.sql` — if any schema column or table changed
- `CLAUDE.md` Known Issues — remove fixed bugs; add new confirmed bugs
- `CLAUDE.md` Data Shape / SwingVision sections — if data model or upload behaviour changed
- `DATA-GAPS.md` — if the feature surfaces previously unused data, remove those fields. If the feature adds new stored fields that aren't yet displayed, add them. This file must always reflect the current state of "data we have but don't show."

---

## Known Issues / Active Bugs
_None currently tracked. Add here when a bug is found; remove when fixed._

## Environment Variables
- `ANTHROPIC_API_KEY` — Claude API
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health
