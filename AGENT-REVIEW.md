# Agassi — Agent Review Findings

**Date:** 2026-04-05
**Reviewed by:** Tennis Data Analyst, Tennis Coach, Sports Psychologist, Product & Design Lead

All four specialized agents reviewed the full project independently. This document captures their findings and the resulting priority stack.

---

## Cross-Agent Consensus

All four agents independently converged on these findings:

1. **Data quality must come first.** Stroke tags are built on fabricated usage splits (hardcoded 65/35 CC/DTL). Speed values are unchecked. The coaching layer is built on sand.
2. **The app describes, it doesn't coach.** The debrief is scoreboard reading (WHAT happened, not WHY).
3. **Loss diagnosis is the highest-impact quick win.** Classify every loss as Tactical/Execution/Mental/Fitness using data that already exists.
4. **Point-level data is the biggest untapped asset.** match_points and match_shots sit in Supabase with zero analysis.
5. **Roadmap was inverted.** AI coaching is premature. Fix inputs before building outputs.

---

## Unique Insights Per Agent

### Data Analyst
- Stroke usage hardcoded 65/35 in `strokes.ts` — all stroke tags (hidden_weapon/reliable/liability/overused) are unreliable
- `avg()` in parseSwingVision filters `x > 0`, creating upward bias in contact height
- Rally length computation includes serves — rally_mean inflated vs standard definition
- No extraction validation — Claude could return serve % of 150 and it'd be stored
- No speed clamping — a 300 km/h phantom reading corrupts multiple signals
- Clutch metric conflates base rate with skill (break points are biased sample)
- Opportunity: score-state analysis (30-all performance, break point behavior)
- Opportunity: validate JD's decided_by self-assessment against actual stats

### Tennis Coach
- Pre-match brief only ~30% buildable with current data quality
- No point-sequence analysis (serve+1 patterns from match_shots — O'Shannessy's core framework)
- Opponent scouting shallow — 20+ stats stored, 3 shown. Journal tags tell JD what he already knows.
- No loss diagnosis in debrief — no classification, no mechanism, no action item
- No in-match momentum tracking
- Corrected priority: data quality → point-sequence → loss diagnosis → pre-match brief → AI

### Sports Psychologist
- Composure treated as predictor when it should be dependent variable ("what conditions produce low composure?")
- Post-loss experience identical to post-win — emotionally tone-deaf
- Journal captures state not process — needs: composure_trend (arc), composure_trigger (what caused it), awareness (noticed or not)
- Perception-vs-reality conflicts untapped (JD says "BH off" but stats say it was his best shot)
- Optimal composure zone untested — composure 4 might beat composure 5
- Pressure profile completely missing — BP save/conversion, error type on pressure points
- Mental cue free-text field > generic "Composure" in priority_next
- Focus scale needs behavioral anchors

### Product & Design Lead
- Merge to 3 tabs: Matches / Coach / Add (kill "My Game" vs "Next Match" split)
- Kill radar chart — replace with ranked strength/weakness list with trends
- Kill stroke intelligence display until computation is fixed (confidently wrong > absent)
- Kill current debrief form — box score in prose
- Journal-only match state should feel complete, not incomplete
- Match detail needs progressive disclosure (3 levels: card → debrief → full stats)
- Gold accent underused — should be primary, blue reserved for neutral
- Card density too uniform — debrief should be visually dominant

---

## Revised Priority Stack

| # | What | Why | Dependency |
|---|---|---|---|
| 1 | **Fix data quality** — extraction validation, stroke tags, speed clamping, rally length, avg() bias | Everything downstream is wrong without this | None |
| 2 | **Loss diagnosis** — taxonomy + debrief reframe | Highest-impact UX change, no new data needed | #1 (partially) |
| 3 | **Surface opponent data** — render 20+ stats already stored | Zero new computation, high coaching value | None |
| 4 | **Tab consolidation** — 4 → 3 tabs (Matches / Coach / Add) | Simpler IA, better user flow | None |
| 5 | **Journal enrichment** — composure_trend, composure_trigger, awareness, mental_cue | Enables psych analysis, low effort (JSONB fields) | None |
| 6 | **Point-level analytics** — score-state, pressure profile, serve+1 | Unlocks the richest data, foundation for coaching | #1 |
| 7 | **Debrief redesign** — diagnosis → key moment → one action | From scoreboard to coaching | #1, #2, #6 |
| 8 | **Pre-match brief** — 5-section structure | Only useful after data is trustworthy | #1, #3, #6 |
| 9 | **AI coaching layer** — Claude-generated insights | Amplifies whatever you feed it — must be last | All above |
