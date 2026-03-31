# Agassi — Feature Clusters

Strategic grouping of all roadmap and backlog work into three coherent layers. Use this before picking up any non-trivial task — it shows where the work fits, what it depends on, and what the right sequencing is.

**Last updated:** 2026-03-31

---

## Why clusters

The backlog contains ~40 items. Most of them are related. Working item by item misses the strategic picture — you can end up building a win/loss correlation display before the underlying signal computation is solid, or shipping AI coaching before there's enough clean data to make it useful.

The three clusters form a dependency chain:

```
Raw data (shots, points, journal, match stats)
               ↓
   ── CLUSTER A: Intelligence Layer ──
      Compute the right signals from raw data
               ↓                  ↓
  ── CLUSTER B: Viz ──    ── CLUSTER C: AI ──
     Show the signals        Synthesise signals
     clearly                 into coaching action
```

Build in this order. Clusters B and C are only as good as Cluster A.

---

## Cluster A — Intelligence Layer
**Mission: compute the right signals from the data we already have**

This is the foundation. Before anything can be shown or synthesised, the right patterns need to be extracted from raw match data, journal entries, and shot rows. Most of the raw material is already stored — this cluster is about making it mean something.

### Benchmark
**Whoop Recovery Score.** Raw inputs (HRV, RHR, sleep stages, respiratory rate) → one computed score that tells you what to do today. The insight isn't in the raw data — it's in the synthesis. Nobody looks at their raw HRV; they look at their Recovery score.

For Agassi: JD shouldn't need to read serve % and UE count separately and connect the dots himself. The app should compute "when your serve % drops below 60%, you lose 80% of matches" so that number is ready to display or feed to AI.

### Items (roadmap + backlog)

**Correlation signals (win/loss drivers)**
- Win/loss correlation surfacing — "when X, you win Y%" across: serve %, UE count, game plan execution, first-set result, recovery score, opponent difficulty *(NEXT #1)*
- Recovery vs UE count — does low recovery predict more errors? *(NEXT #3 / BACKLOG)*
- Game plan execution vs win rate — "when rated Yes/Mostly, you win X%" *(BACKLOG)*
- Time-of-day performance split — morning vs afternoon *(BACKLOG)*
- UTR trend over time — are you playing harder opponents as you improve? *(BACKLOG)*

**Rally & shot pattern signals (from `match_shots`)**
- Rally length vs outcome — do JD's wins come in short or long rallies? Cross-ref `rally_mean`/`rally_pct_short/long` with point winner *(BACKLOG)*
- Pressure point shot analysis — filter `match_shots` by `break_point=true`, compare shot selection and speed vs normal play *(BACKLOG)*
- Speed consistency signal — `fh_spd_std` as coaching signal: high std dev = erratic, low = controlled. Correlate with UE rate *(BACKLOG)*
- Contact height trend — track `fh_contact_z` / `bh_contact_z` over time: rising = more offensive stance *(BACKLOG)*
- Serve+1 pattern — `s1_after_dtl_pct` tells you how often JD follows a serve with DTL. Opponent tendency inferrable from their shot rows *(BACKLOG)*

**Quick signal surfacing (data already computed, just not displayed)**
- Serve direction tendency — `s1_t_pct` / `s1_wide_pct` stored per match, not shown anywhere. "You go wide 70% on ad side" *(BACKLOG — easiest item in this cluster)*
- Match intensity metric — `total_shots` as proxy for match grind level *(BACKLOG)*

### Dependencies
- Correlations need volume. Win/loss correlations are unreliable below ~15 matches. Time-of-day needs journal `match_time` field (not yet collected — see backlog: add time-of-day to journal).
- `match_shots` patterns need `has_shot_data=true` matches — only those uploaded with xlsx qualify.
- Serve direction, speed consistency, contact height: all already stored. Zero dependency — ready to surface now.

### Status (updated 2026-03-31)
**Most of Cluster A is shipped.** The `app/lib/signals/` module covers: win/loss correlations (16 stats with lift framing), tendencies (serve direction, speed consistency, contact height, serve+1, rally profile), stroke intelligence (per-stroke tagging), journal correlations, and auto-derived player profiles (JD + opponents).

**What remains:** Shot-level signals from `match_shots` (pressure points, fatigue curves, court zones, set progression) — needs a server API endpoint. Signal types are designed to plug in when this is built.

---

## Cluster B — Data Visualisation
**Mission: show the signals clearly, so JD can scan and act**

Once signals exist (computed by Cluster A or raw from the data model), present them in ways that are instantly readable on mobile. Distinct from intelligence — this is display and interaction design, not computation.

### Benchmark
**Strava activity feed + Oura trends.**
- Strava: you open the feed and instantly know the quality of the effort — map thumbnail, PR crowns, relative effort ring. No reading required. W/L equivalent for Agassi = color-coded score in match list.
- Oura: trend lines for each score over 30/90 days. Not just today's value — the direction. Equivalent = sparklines (already partially shipped) + evolution timeline.
- **SwingVision court diagrams** are the direct reference for court heatmaps — same coordinate space, same visual language JD already knows.

### Items (roadmap + backlog)

**Zero-dependency wins (ship immediately)**
- Color-coded W/L in match list — green/red score, win/loss streak visible without reading *(BACKLOG)*
- Surface filter in JDStats — Clay / Hard / Grass pill filter *(NEXT #2)*
- Personal bests tracking — fastest serve ever, highest 1st serve %, most winners *(BACKLOG)*
- Win/loss streak tracking *(BACKLOG)*

**Trend & evolution displays**
- Match timeline / evolution tab — key metrics plotted over time at match level, not just averages *(LATER)*
- Monthly / seasonal summary — "In March: 4 matches, 3 wins, serve up X%" *(BACKLOG)*
- Player evolution timeline — sparklines extended to full trend charts *(BACKLOG)*

**Court visualisations (needs shot data)**
- Court heatmaps — `bounce_x`/`bounce_y` plotted per stroke type, per-match and aggregated. Where JD's shots land. Where the opponent targets. *(LATER)*
- Opponent serve direction map — where the opponent serves on deuce/ad, plotted on mini court *(BACKLOG)*

**List & navigation improvements**
- Match History tab redesign — current list too flat, no visual trend signal *(BACKLOG)*
- Swipe between matches in Match Detail *(BACKLOG)*
- Empty state improvements — each tab explains what JD gets when data exists *(BACKLOG)*

### Dependencies
- W/L color, surface filter, personal bests, streaks: zero dependencies — build from existing data.
- Trend charts need 10+ matches to be non-trivial.
- Court heatmaps need `has_shot_data=true` matches. Gets more useful with each xlsx upload.
- Evolution timeline and monthly summary need time — app needs to be used for 6–8 weeks first.

### Starting point
Color-coded W/L is the highest-leverage item in this cluster. 30-minute fix, used every time the app opens. Do it before anything else in this cluster.

---

## Cluster C — AI Coaching Layer
**Mission: synthesise everything into actionable coaching output**

This is what separates a stats dashboard from a coaching system. AI reads the match data, journal, shot patterns, and historical context, and outputs targeted coaching bullets and game plans — not summaries of what happened, but recommendations for what to do.

### Benchmark
**Whoop Coach feature + Ultrahuman Ring AI analysis.**
- Whoop Coach doesn't say "your HRV was 62ms." It says "You're at 73% recovery. Prioritise aerobic work over strength today — your body is in repair mode." Same data, different framing: recommendation, not report.
- Ultrahuman: "Your glucose spiked at 11pm. This disrupted sleep onset by ~40 minutes. Consider moving your last meal earlier." Causal, specific, actionable.

For Agassi: not "your UE count was 18." But "18 unforced errors — 12 were backhand crosscourt. That's the pattern that cost you the second set. Before the next match: 20-ball backhand crosscourt drill, pace the second shot."

### Items (roadmap + backlog)

**Core AI coaching outputs**
- AI debrief — replace rule-based bullets with Claude-generated insights. Inputs: this match stats, journal, historical averages, shot-level data from `match_shots`. Output: 3–5 coaching bullets in coach voice *(NEXT #6)*
- AI pre-match prep — game plan generated from: opponent history, JD's surface stats, H2H tendencies, last match journal. Output: 3 focus points + 1 thing to watch for *(NEXT #5 — currently framed as "pre-match prep mode" but AI is the engine)*

**Opponent intelligence (AI-synthesised)**
- "What to watch for" from `opp_shots` — auto-generate 2–3 tactical bullets from recorded opponent shot data *(BACKLOG)*
- Opponent scouting profile — accumulate `match_shots` rows across multiple matches vs same opponent. AI synthesis of serve tendencies, preferred patterns, weaknesses *(BACKLOG)*
- Per-opponent priority history — "last 3 times you played Gonçalo, you flagged Reduce UE. Your UE was X in those matches" *(BACKLOG)*

**Pattern coaching (AI narrating Cluster A signals)**
- Surface-specific tactical advice — when surface selected, AI reads JD's actual stats on that surface and generates specific coaching rather than generic text *(BACKLOG)*
- Serve+1 coaching — AI reads `s1_after_dtl_pct` and `match_shots` to identify JD's serve-return patterns and suggest adjustments *(BACKLOG)*
- Contact height coaching — rising `fh_contact_z` over time = narrative: "you're taking the ball earlier — you're playing more offensively than 3 months ago" *(BACKLOG)*

### Dependencies
- Claude API already wired in `/api/extract` — no new infrastructure needed.
- AI debrief quality scales with: (a) how clean the stats are (screenshots > xlsx), (b) how many historical matches exist for context, (c) whether `match_shots` rows are available for shot-level analysis.
- Pre-match AI needs opponent history — only useful for recurring opponents.
- Opponent scouting synthesis needs multiple matches vs same opponent.

### Prompt design principles (when building)
- Always include: this match stats + journal + JD's historical averages (last 10 matches)
- Include when available: `match_shots` summary (stroke distribution, speed, rally stats — not raw rows)
- Never include: raw shot rows (context window too large, no value over aggregated stats)
- Output format: 3–5 bullets max. Coach voice. Direct. Numbers inline as `<span>` DM Mono. No hedging.
- Grounded: every bullet must cite a specific number from the data. No generic tennis advice.

### Starting point
AI debrief is the highest-leverage item in this cluster — it directly replaces the current rule-based debrief which is already shipping. The infrastructure (Claude API call, match data, response rendering) is already there. Upgrade the prompt, test across 3–4 real matches, ship.

---

## Recommended sequencing across clusters

| Phase | Work | Why now |
|---|---|---|
| **Immediate** | W/L color in match list (B) | Zero dependencies, daily use, 30 min |
| **Immediate** | Serve direction surfacing in Strategy (A) | Data stored, just display it |
| **Short term** | Surface filter in JDStats (B) | Simple, data exists |
| **Short term** | Win/loss correlations + journal analytics (A, merged) | Core promise — but only meaningful at 15+ matches |
| **Short term** | AI debrief upgrade (C) | Infrastructure exists, high impact |
| **Medium term** | Personal bests + streaks (B) | Needs a few months of data to feel real |
| **Medium term** | AI pre-match prep (C) | Needs opponent history to accumulate |
| **Later** | Court heatmaps (B) | Needs 10+ xlsx matches per opponent |
| **Later** | Full opponent scouting AI (C) | Needs sustained match volume vs same opponents |

---

## When building across cluster boundaries

Some features touch multiple clusters. Before starting, identify which cluster is primary:

- **Serve direction reveal** → Cluster A (computation) + Cluster B (display). Start with A: confirm the signal is correct. Then B: design the display in Strategy.
- **AI pre-match prep** → Cluster A (signals) + Cluster C (AI). The AI prompt needs clean signals from A. Build A first, feed into C.
- **Court heatmaps** → Cluster B entirely. The raw data (x/y coordinates) is already Cluster A output from the upload pipeline.
- **Win/loss correlations** → Cluster A (compute) + Cluster B (display). The computation is the hard part.
