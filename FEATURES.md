# Agassi — Feature Log

Each entry documents what was built, why it was designed that way, what was left out, and the rationale behind every decision. This file is the long-term memory for product decisions.

---

## Data Analyst v1.1 — UTR band benchmarks + sparklines + Path to next UTR
**Shipped:** 2026-04-06
**Files:** `app/lib/analyst/benchmarks.ts` (new), `app/components/MyGame.tsx` (updated)

**What changed**
- New `benchmarks.ts` module: hardcoded synthetic per-band medians for 12 amateur tennis stats across UTR bands 2.0–6.0. Source-tagged `synthetic` so the UI can disclose data quality. Replaces the v1 plan deferral — Tennis Abstract scrape becomes a v2 quality upgrade, not a blocker.
- `BarCard` and `CountCard` extended with `bench` prop — render the same `avg tick (white)` + `opp diamond (blue)` markers used in MatchDetailScreen, but repurposed: white = your band median, blue = next band median.
- New inline `Sparkline` component (80×16 SVG) — appears under every Career Averages card showing match-by-match evolution + ↑/↓/→ trend arrow (last third vs first third).
- New "Path to {next-band}" callout section between Diagnosis and Career Averages: ranks the 2 biggest gaps to next band and pairs each with a one-line drill prescription.
- "How You Compete" gains **Pressure Delta** (BP-won % minus total-pts-won %) as the lead stat — JD's mental signature in one number.
- "Coach's Read" liabilities now carry a "Drill: …" follow-up line.

**Why**
- Career averages without a comparison were just numbers. JD asked for benchmarks against his UTR band — same design tools as MatchDetail (3-way comparison). The synthetic table earns a real ladder bar today; Tennis Abstract scrape is a quality upgrade, not a feature gap.
- Sparklines fold "evolution" inside the existing cards instead of giving trends their own section — preserves MatchDetail's editorial pacing and avoids feature-page bloat.
- "Path to 3.5" answers JD's "how do I go from X to Y" directly, with named gaps and named drills, in coach voice.

**4-agent review applied**
- 🎾 Coach: drill prescriptions tied to every liability + every gap.
- 📊 Data Analyst: source disclosure footer (`Benchmarks · synthetic v1 · band 3.0-3.5`), sparkline trend computed from real data only, no interpolation.
- 🧠 Psychologist: Pressure Delta elevated as the lead "How You Compete" stat.
- 🎨 Designer: reused MatchDetail's exact tick/diamond markers, sparklines tiny enough to live inside cards, "Path" as a single callout not a feature page.

**Deliberately left out**
- Real Tennis Abstract scrape (still v2) — synthetic numbers are good enough to ship today and the schema supports a clean swap
- More than 6 stats in Career Averages — restraint > coverage
- Sparklines on benchmarks themselves (no per-band evolution data)

---

## Data Analyst v1 — My Game tab redesign + analyst pipeline
**Shipped:** 2026-04-06
**Files:** `app/components/MyGame.tsx` (new), `app/lib/analyst/types.ts` (new), `app/lib/analyst/patterns.ts` (new), `app/lib/analyst/run.ts` (new), `app/api/analyst/run/route.ts` (new), `app/api/profile/route.ts` (new), `app/page.tsx` (updated — JDStats import → MyGame), `supabase-schema.sql` (added `analyst_runs` + `user_profile` tables), `DATA-ANALYST-PLAN.md` (new — gates 01–04 doc), `BACKLOG.md` (new "Data Analyst — deferred from v1" section), `~/.claude/plugins/agassi-agents/skills/tennis-data-analyst/SKILL.md` (added Strategic Principles + Analyst Pipeline sections)

**What changed**
- New "My Game" tab built as a sibling of MatchDetailScreen — same visual anatomy (Score → Diagnosis → Career Averages → Coach's Read → Patterns → How You Compete → Opponents → See All Stats), same `SH`/`CountCard`/`BarCard`/section-rhythm components.
- New analyst pipeline: server-side `/api/analyst/run` route computes a structured `AnalystState` JSON (via `app/lib/analyst/run.ts` orchestrator) and caches it in the new `analyst_runs` Supabase table with full history (audit trail + future evolution view).
- New `/api/profile` for manually-entered UTR (with `last_updated` field, multi-player ready via slug PK).
- Tennis-data-analyst skill extended with 5 Strategic Principles (visual > verbal · behavior change is the only metric · diagnose the why · confidence over completeness · one job per screen) and an Analyst Pipeline section documenting the JSON contract.

**Why it was designed this way**
- JD's request: "use MatchDetail as the model — keep its philosophy, let the agents add what's useful." Court visualizations were tried first and cut as a failed experiment — they didn't earn their space at the career level.
- Mirroring MatchDetail's anatomy means zero learning curve. JD already knows the visual language: same diagnosis card with SH + headline + bullets + "biggest lever" cue, same key-stats grid, same Coach's Read with ✓/△ rows, same patterns bullet list, same See All Stats footer.
- 4-agent review surfaced one new section worth adding beyond a re-skin: **"How you compete"** — composure, focus, plan execution rate, recovery delta (wins vs losses). This is the sports psychologist's contribution and the only thing in My Game that doesn't exist in MatchDetail.
- The skill writes JSON, the app reads JSON — clean separation enables future surfaces (chat, evolution view) to consume the same brain.
- UTR is manually entered (not synced from a league) for multi-player scalability and to avoid coupling to one specific league's site.

**v1 scope (shipped)**
- Score: career win % + record + UTR pill (tap to edit)
- Diagnosis card: style label + weapon/weakness/clutch/aggression bullets + biggest correlation lever as cue
- Career averages: 4-6 grid of CountCard/BarCard (UE, Winners, 1st Serve %, Return Pts Won, BP Won, Total Pts Won)
- Coach's Read: hidden weapons (✓) and liabilities (△) from existing stroke signals
- Patterns: top 3 win-rate correlations
- How You Compete: composure, focus, plan execution %, recovery delta (NEW — psychologist contribution)
- Opponents: list with style tag, weapon, H2H
- See All Stats: existing JDStats component as drill-down
- Server-side analyst run with full-history `analyst_runs` table

**Deliberately left out (deferred — see BACKLOG.md "Data Analyst — deferred from v1")**
- UTR ladder bars (v2) — needs Tennis Abstract benchmark scrape
- Pressure-point signals (v2) — re-run signals filtered to BP/SP only
- First-strike + serve+1 patterns (v2)
- Trend sparklines inside cards (v2)
- Full opponent dossiers with patterns_to_run/avoid (v2)
- Pre-match brief flow (v3) — "Prep next match" button
- Counterfactual moments (v3)
- Practice prescriptions (v3)
- Court heatmaps (v3 — escalate from SVG to visx)
- In-app analyst chat (v4)
- Animated rally replays (v4)
- **Court visualizations / `PatternCard`** — built then cut. The court diagrams worked technically but didn't earn their space at the career level. Lesson preserved in `feedback` memory: visualization must serve the level it lives at, and a premium rendering of low-information data is worse than no rendering at all.

**Decisions made (locked in DATA-ANALYST-PLAN.md)**
1. Server-side compute (Vercel API route + Supabase cache), not client-side — pattern mining gets slow as data grows
2. Full history of `analyst_runs` (not latest-only) — audit trail + future evolution view
3. Pre-match brief trigger = "Prep next match" button on My Game tab → creates future match record (deferred to v3)
4. UTR is manually entered + manually refreshed (multi-player ready)

---

## Match Detail Screen Redesign + Loss Diagnosis
**Shipped:** 2026-04-05
**Files:** `app/components/MatchDetailScreen.tsx` (new), `app/lib/signals/diagnosis.ts` (new), `app/lib/signals/keyStats.ts` (new), `app/components/StatBar.tsx` (updated), `app/page.tsx` (updated)

### What it does
Complete redesign of the match review experience. Tapping a match card now opens a full-screen detail view (replaces the old inline expand + Debrief). Introduces loss diagnosis, key stat selection with explanatory tags, and 3-way stat comparison.

**Loss Diagnosis** (`diagnosis.ts`): Every match gets classified. Losses: Mental (UE spike + composure ≤ 2) / Execution (UE high, composure fine, plan not executed) / Fitness (low recovery + fitness attribution) / Tactical (opponent dominated) / Outclassed (much tougher opponent, JD held composure). Wins: strongest winning factor identified (Error Control / Serve Dominance / Aggressive Tennis / Clutch Performance). Data drives classification, journal confirms.

**Key Stat Selection** (`keyStats.ts`): Algorithm picks the 4 most relevant stats per match. Scoring: deviation from average (50%) + outcome alignment (30%) + correlation strength (20%). Each stat gets an explanatory tag ("Cost you the match", "Won it here", "Your win predictor", "Bright spot", "Watch out"). Diversity enforced — max 2 per category.

**3-Way Stat Comparison**: Every stat shows JD's match value (semantic color), JD's career average (white tick marker), and opponent's match value (blue diamond marker). Color roles fixed: JD = green/amber/red, opponent = blue, average = grey.

**Match Detail Screen** (`MatchDetailScreen.tsx`): Full-screen overlay with sticky shrinking header (score collapses into nav on scroll). Scroll order (stress-tested by Coach + Psychologist agents): Score → Diagnosis → Key Stats → Coach's Read → Patterns → Opponent → Journal → See All Stats.

**Redesigned Match Cards**: Left border accent (green/red), smart stat line (3 most relevant stats, dynamically colored), "Add journal →" CTA in gold. Delete button removed from card (moved to detail screen overflow menu).

**StatBar upgraded**: Added `oppVal` and `lowerIsBetter` props. Opponent shown as blue diamond on the bar track. For stats where lower is better (UE, DF), bar fills from right.

### Design decisions
- **Diagnosis before stats** — both Coach and Psychologist agents independently recommended this: "Stats without framing feel like an autopsy." The diagnosis frames how JD reads the numbers.
- **Wins and losses get different treatment** — loss diagnosis (red tint, "Next time" cue in gold) vs win highlight (green tint, "Keep doing" in green). Same structure, different emotional tone.
- **Count stats (UE, Winners) use head-to-head cards, not bars** — bars don't work for absolute counts. JD's number is the hero (big, centered), opponent + average are equal minimal references below.
- **Bar stats won over ticker and Apple Health** — the bar with average marker gives spatial sense of distance that pure numbers don't. Iterated through 3 options in preview before selecting.
- **Journal at the bottom** — Psychologist recommendation: journal becomes a perception check after seeing the evidence. If JD said "backhand was off" but stats show it was fine, the contrast is more powerful when evidence came first.
- **Every design change previewed first** — built disposable prototype at `/preview` with dummy data, iterated 4 versions with JD, then implemented production version.

### What was left out and why
- **Perception-vs-reality conflicts** — when what_worked/what_didnt contradicts stats. Designed but not implemented yet (needs text matching against stat fields).
- **Tab consolidation (4 → 3)** — Product Lead recommended merging "Next Match" + "My Game" into "Coach". Deferred — separate change.
- **Progressive match_points analysis** — composure cascade, momentum tracking, score-state filtering. Needs point-level API endpoint first.
- **Dominance Ratio and Sackmann metrics** — planned for Cluster A integration, not part of this UI redesign.

---

## Data Quality Fixes — Agent Review Findings
**Shipped:** 2026-04-05
**Files:** `app/lib/parseSwingVision.ts`, `app/lib/signals/strokes.ts`, `app/api/extract/route.ts`

### What it does
Five data quality fixes identified by the specialized agent review (all four agents independently converged on data quality as the #1 priority).

**1. Stroke usage from actual shot data** (`strokes.ts`): Replaced the hardcoded 65/35 CC/DTL usage split with actual stroke direction counts computed from match_shots data. For xlsx-uploaded matches, the parser now computes `fh_cc_pct`, `fh_dtl_pct`, `bh_cc_pct`, `bh_dtl_pct` from actual shot direction data and stores them in shot_stats JSONB. The signals module reads these when available, falling back to a conservative 60/40 estimate for screenshot-only matches. This fixes all stroke tags (hidden_weapon/overused/reliable/liability) which were previously unreliable.

**2. Speed clamping** (`parseSwingVision.ts`): SwingVision's video-based speed measurement can produce phantom readings (300+ km/h). Now nulls out groundstrokes > 160 km/h and serves > 220 km/h in `normalizeShot()`. Prevents outliers from corrupting speed averages, `fh_spd_std`, and speed-based correlation signals.

**3. Rally length excludes serves** (`parseSwingVision.ts`): Rally length computation now filters out serve shots before counting. Previously included serves in the count, inflating `rally_mean` and making `rally_pct_short` (<=3 shots) meaningless (a point with serve + return + one groundstroke was "short" when it's actually a normal rally). Now matches standard tennis rally length definition.

**4. avg() zero exclusion fix** (`parseSwingVision.ts`): Changed `x > 0` filter to `x >= 0` in both `avg()` and `std()` helpers. Previously excluded legitimate zero values (e.g., ground-level contact height), creating systematic upward bias in `fh_contact_z` and `bh_contact_z` averages.

**5. Extraction validation** (`/api/extract/route.ts`): Added `validateExtraction()` function that range-checks every value returned by Claude from screenshot parsing. Nulls out: percentages outside 0-100, speeds outside 30-250 km/h, negative counts, game scores > 7. Runs on both JD's stats and opponent stats. Screenshots are Tier 2 ground truth — bad values here poison everything downstream.

### Why these fixes matter
All four specialized agents (Data Analyst, Coach, Psychologist, Product Lead) independently identified that the coaching layer was "built on sand." The stroke intelligence shown in Strategy and JDStats was based on fabricated data. Speed outliers could corrupt multiple signals. The extraction pipeline had no validation — Claude could return nonsense and it would be stored as ground truth.

### What was left out and why
- **Clutch metric redesign** — the break point conflation issue (biased sample) is a known limitation but needs more thought. Left for a targeted fix later.
- **Time decay on signals** — all matches weighted equally regardless of recency. Not a problem at ~20 matches but will matter at 50+.
- **Confidence visibility in UI** — low-confidence signals still display the same as strong ones. Needs a design decision (Product Lead flagged this).

---

## Specialized Agent Skills (Plugin)
**Shipped:** 2026-04-05
**Files:** `~/.claude/plugins/agassi-agents/` (new plugin: plugin.json + 4 SKILL.md files)

### What it does
Four specialized expert agents, each a Claude Code skill file with domain-specific training, calibration examples, and cross-agent protocols.

**Tennis Data Analyst** — data integrity guardian. Validates every stat before it reaches other agents. Embeds a 4-tier data trust hierarchy (ground truth → verify first), small-N statistics rules (Cohen's d interpretation, minimum sample thresholds), and SwingVision measurement quality flags. Training sources: Jeff Sackmann, Craig O'Shannessy, StatsBomb methodology.

**Tennis Coach** — translates data into on-court action. Loss taxonomy (tactical/execution/mental/fitness — data-driven). 5-section pre-match brief structure: tactical pattern, carry-forward (fix + keep + notes), danger zone, serve/return/tight, opponent scouting. Training sources: Ferrero, Toni Nadal, Mourinho's dossier approach, Agassi's Open.

**Sports Psychologist** — identifies mental performance patterns from match data + journal. Composure cascade analysis, pressure response patterns, "decided by" detection. Frameworks are invisible to JD (inform advice, never named). Always ends with a concrete mental cue. Training sources: Kobe's Mamba Mentality, CR7, Dr. Jim Loehr, Amorim's leadership philosophy.

**Product & Design Lead** — PM + UX + UI. Owns what to build, how it works, how it looks. Embeds full design system tokens from DESIGN.md, user moment framework, scope discipline rules, 6-gate process. Training sources: App Store Award winners, Whoop, Strava, Linear, Arc, Edward Tufte.

### Design decisions
- **Data over feelings** — match stats take precedence over journal across all agents
- **Loss taxonomy is data-first** — classified by stats (UE spike, shot selection shift), journal confirms
- **Pre-match brief has 5 sections** — tactical pattern, carry-forward (fix/keep/notes), danger zone, serve/return/tight, opponent scouting
- **Opponent data thresholds** — 1-2 matches = anecdotal, 3-4 = early pattern, 5+ = game plan ready
- **Psych frameworks invisible** — agent uses Yerkes-Dodson, process-vs-outcome etc. but never names them
- **Shared directives** across all agents: coach voice, visual > verbal, doubt the data, diagnose WHY not WHAT
- **Copywriter absorbed** — not a standalone agent. Voice directive embedded in all four.
- **9 candidates scored, 4 built** — evaluation criteria: frequency, mistake cost, specialization gap, trainability, distinctness, JD-cares

### What was left out and why
- **Opponent Scout** as standalone (score 21) — absorbed into Tennis Coach. Not distinct enough.
- **Statistical Rigor** as standalone (score 21) — absorbed into Data Analyst. Same domain.
- **Product Strategist** (score 14) — Claude already decent, handled in normal conversation.
- **Data Modeller** (score 16) — Claude strong here, JD doesn't care about schema details.
- **Copywriter** (score 17) — a directive, not an expert. Embedded as shared voice rule.
- Real-time agent invocation (agent calling another mid-task) — not supported in skill architecture. Cross-agent protocol is advisory ("hand to Coach for tactical solution").

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
