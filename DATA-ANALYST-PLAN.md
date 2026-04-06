# Data Analyst — Plan

Planning artifact for the next evolution of the Data Analyst skill + in-app intelligence surface. This is a gate 02/03 document. No code is written until JD signs off on the sections marked **DECISION**.

Last updated: 2026-04-06

---

## 1. Vision

The Data Analyst is JD's **personal performance intelligence layer**. It does three jobs:

1. **Diagnose** — what happened in a match, what's the pattern, what's the why
2. **Prescribe** — what to run on court next time, what to drill, what to cut
3. **Benchmark** — where JD sits vs his UTR band and what closes the gap to the next level

It exists as **two interlocked surfaces**:

| Surface | Role | Audience |
|---|---|---|
| **The skill** (`anthropic-skills:agassi-coach` + a new `data-analyst` skill) | Generates insights as structured JSON. Also serves as a strategic advisor in product planning conversations. | Claude (in dev sessions + scheduled runs) |
| **The "My Game" tab** | Renders the JSON as visual cards, court diagrams, ladders, dossiers. JD's consumption surface. | JD on his phone |

The skill is the brain. The app is the face. Same model as `app/lib/signals/` today — just much more ambitious outputs.

---

## 2. Skill responsibilities

### 2a. Insight generator (the primary job)

The skill runs over the full match history and produces a single structured artifact: **`analyst_state.json`**, written into Supabase or a JSON column on a new `analyst_runs` table. The app reads the latest run.

Triggers for a new run:
- New match logged (auto)
- New xlsx uploaded (auto)
- Manual refresh from My Game tab
- Scheduled weekly recompute (catches drift in benchmarks/profiles)

The skill owns these output sections (schema in §4):
- **Player profile** (style, weapons, weaknesses, clutch, aggression — extends today's `profile.ts`)
- **Pattern library** (top winning + losing 2–4 shot sequences mined from `match_shots`)
- **Opponent dossiers** (one per opponent JD has played, regenerated when stats change)
- **Signal set** (today's `SignalSet` + new pressure-point signals + first-strike + serve+1)
- **UTR ladder** (JD's stats vs benchmark bands, gap-to-next-level ranked)
- **Pre-match brief** (when an upcoming opponent is named, draft a brief)
- **Match debrief enrichments** (per-match coach notes the app appends to existing MatchDetail)

### 2b. Product strategist (the second job)

The skill carries opinions about what the app should become. It's consulted in any gate 01/02 conversation about new features. Concretely:

- The skill file gets a **"Strategic principles"** section (see §8) that future-Claude reads when planning
- Anything new added to `BACKLOG.md` or `ROADMAP.md` related to data, intelligence, or coaching gets a vote from the skill
- The skill knows the cluster framework (`CLUSTERS.md`) and can place new ideas
- It can challenge ideas: "this duplicates an existing signal," "this won't change on-court behavior," "this needs data we don't capture"

This is the bit that makes the skill *load-bearing* on product direction, not just a reporting tool.

---

## 3. "My Game" tab — information architecture

Today the tab exists as `JDStats`. The new IA replaces it. **Anatomy mirrors `MatchDetail`** — same hero pattern, same Card component, same color system. JD already knows the visual language; My Game tab uses it at *career level* instead of *match level*.

**Coherence rule:** every section in My Game tab maps 1:1 to a section in MatchDetail.

```
┌─────────────────────────────────────────┐
│ HERO                                    │  ← mirrors MatchDetail hero
│ JD · UTR 3.2 · 23 matches · 14-9        │
│ "Aggressive baseliner"                  │
│ [Edit UTR] · last updated 2026-04-01    │
├─────────────────────────────────────────┤
│ IDENTITY TILES (4 across)               │  ← mirrors MatchDetail key tiles row
│ ┌────┬────┬────┬────┐                   │
│ │WEAP│WEAK│STYL│NEXT│                   │
│ │ FH │BHDT│Aggr│Ret%│                   │
│ │ CC │  L │Base│ +12│                   │
│ └────┴────┴────┴────┘                   │
│ (tap any tile → drill into that stroke) │
├─────────────────────────────────────────┤
│ SERVE  card                             │  ← mirrors MatchDetail Card
│ ─ Career averages bar (3-way: you ·     │
│   your band · next band when v2 ships)  │
│ ─ Top winning serve pattern (mini court)│
│ ─ Top losing serve pattern (mini court) │
├─────────────────────────────────────────┤
│ RETURN  card                            │
│ ─ same structure ─                      │
├─────────────────────────────────────────┤
│ FOREHAND  card                          │
│ ─ same structure ─                      │
├─────────────────────────────────────────┤
│ BACKHAND  card                          │
│ ─ same structure ─                      │
├─────────────────────────────────────────┤
│ OPPONENT GALLERY                        │  ← mirrors MatchDetail Opponent Scout
│ Grid of opponents played, with H2H      │
│ Tap → full dossier (v2)                 │
├─────────────────────────────────────────┤
│ [  SEE ALL STATS  ]                     │  ← escape valve
│ Opens the full numerical breakdown      │
│ (existing JDStats component)            │
└─────────────────────────────────────────┘
```

### Mapping to MatchDetail

| My Game section | MatchDetail equivalent | What's new |
|---|---|---|
| Hero | Hero | UTR + identity tag instead of single match score |
| Identity tiles | Key tiles row | Weapon / weakness / style / next-step instead of pts won / 1st serve etc |
| Serve / Return / FH / BH cards | Same cards | Career averages + top patterns + (v2) ladder bar |
| Opponent gallery | Opponent Scout | Grid of all opponents instead of one |
| See all stats | — | New escape valve linking to existing JDStats |

### Why stroke-anchored

- **Tennis coach lens:** real coaches review players stroke-by-stroke. "Let's talk about your serve. Now your forehand."
- **Data lens:** stroke-by-stroke maps 1:1 to existing JSONB shapes (`serve`, `return`, `forehand`, `backhand`). Pattern mining clusters naturally by stroke.
- **Psychologist lens:** identity at the top stabilizes self-image *before* digging into mechanics. Frame next-step copy as growth, never deficit.
- **Designer lens:** zero new mental model. Same `Card`, same colors, same hero pattern as MatchDetail.

### What's intentionally cut from earlier proposals

- Separate "Pattern Library" room — patterns now live inside their stroke card
- Separate "Trends" room — trends will appear as sparklines *inside* stroke cards in v2
- Separate "What's Working / What's Not" room — that's just the top winning/losing pattern in each stroke card
- Separate "UTR Ladder" room — ladder bars live *inside* each stroke card in v2

### Empty states
- < 3 matches: hero + identity tiles only, stroke cards locked with "log more matches"
- No xlsx uploads yet: stroke cards show career averages but the pattern slots show "needs shot data"
- < 1 match vs an opponent in gallery: tap shows "first meeting — generic plan"

---

## 4. Output schema (`analyst_state.json`)

This is the contract between the skill and the app. Stable schema = independent evolution of brain and face.

**Six core principles** (applied throughout):
1. **Versioned** — top-level `schema_version` so future migrations are graceful
2. **Confidence on every claim** — every insight, dossier, ladder entry carries `confidence: 0..1` and `sample_n`
3. **Unified insights** — signals and patterns are both `insights[]` with a `kind` field, no duplication
4. **Coordinate-safe** — every visual pattern declares its `coord_system` so the renderer can't get it wrong
5. **Stable ladder reference** — ladder stores 3 reference bands, app picks which to display
6. **Change-tracked enrichments** — per-match enrichments carry `last_changed_at` to avoid rewriting unchanged data

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-04-06T14:30:00Z",
  "match_count": 23,
  "shot_data_match_count": 11,

  "player_profile": {
    "style": "Aggressive baseliner",
    "weapon": "Forehand cross-court",
    "weakness": "Backhand DTL under pressure",
    "clutch_index": 0.42,
    "aggression_index": 0.61,
    "rally_preference": "short",
    "confidence": 0.82,
    "sample_n": 23
  },

  "utr": {
    "current": 3.2,
    "last_updated": "2026-04-01",
    "current_band": "3.0-3.5",
    "next_band": "3.5-4.0",
    "two_bands_up": "4.0-4.5"
  },

  "ladder": [
    {
      "stat": "return_depth_first_serve",
      "label": "Return depth on 1st serve",
      "stroke": "return",                    // anchors to a stroke card
      "you": 0.28,
      "current_band_p50": 0.31,
      "next_band_p50": 0.41,
      "two_bands_up_p50": 0.49,
      "gap_to_next": 0.13,
      "leverage_rank": 1,
      "verdict": "Biggest gap to 3.5 — drill this",
      "confidence": 0.74,
      "sample_n": 18
    }
  ],

  "insights": [
    // Unified — replaces separate signals/patterns blocks
    {
      "id": "ins_001",
      "kind": "sequence_pattern",            // sequence_pattern | stroke_pattern | pressure_pattern | style_observation
      "stroke": "serve",                     // anchors to a stroke card
      "name": "Wide deuce → FH inside-out",
      "verdict": "winning",                  // winning | losing | neutral
      "sequence": [
        { "shot": "serve", "from": [0.5, 0.0], "to": [0.95, 0.45], "speed": 168 },
        { "shot": "fh",    "from": [0.3, 0.1], "to": [0.8, 0.85] }
      ],
      "coord_system": "normalized_jd_bottom",
      "usage_pct": 0.18,
      "win_pct": 0.71,
      "sample_n": 24,
      "confidence": 0.81,
      "video_clips": ["match_id:point_n"]
    },
    {
      "id": "ins_023",
      "kind": "stroke_pattern",
      "stroke": "forehand",
      "name": "FH cross-court is your hidden weapon",
      "verdict": "winning",
      "metric": { "name": "fh_cc_win_pct", "value": 0.68 },
      "confidence": 0.79,
      "sample_n": 31
    }
  ],

  "stroke_cards": {
    // Pre-computed for the app: which insights belong in which card
    "serve":    { "insight_ids": ["ins_001", "ins_004"], "ladder_stat_ids": ["l_001"] },
    "return":   { "insight_ids": ["ins_007"],            "ladder_stat_ids": ["l_002"] },
    "forehand": { "insight_ids": ["ins_023"],            "ladder_stat_ids": [] },
    "backhand": { "insight_ids": ["ins_018"],            "ladder_stat_ids": ["l_003"] }
  },

  "opponent_dossiers": [
    {
      "opponent_name": "Marco",
      "matches_played": 4,
      "h2h": "1-3",
      "style_tag": "Pusher",
      "weapon": "Backhand cross-court",
      "weakness": "Second serve return",
      "patterns_to_run": ["ins_001", "ins_007"],
      "patterns_to_avoid": ["ins_014"],
      "rally_plan": "Keep rallies under 6 shots — your UE rate doubles after shot 6 vs him",
      "serve_targets": { "deuce": "T", "ad": "body" },
      "key_number": "Win 60%+ of points under 4 shots",
      "confidence": 0.65
    }
  ],

  "trends": [
    {
      "stat": "first_serve_pct",
      "label": "1st serve %",
      "stroke": "serve",
      "series": [ { "date": "2026-01-12", "value": 0.62 } ],
      "regression": null,
      "breakthrough": null
    }
  ],

  "match_enrichments": {
    "<match_id>": {
      "last_changed_at": "2026-04-06T14:30:00Z",
      "coach_notes": ["..."],
      "linked_insight_ids": ["ins_001"]
    }
  }
}
```

**Storage:** new Supabase table `analyst_runs` — `id uuid pk`, `generated_at timestamptz`, `payload jsonb`, `match_count int`, `is_latest bool`, `schema_version int`. App reads `where is_latest = true`. Full history kept (per Q2).

---

## 5. Court viz component spec

A new file: `app/components/Court.tsx`, plus a small set of primitives in `app/components/court/`.

### 5a. Primitives (SVG, no dependencies)

- **`<Court />`** — base SVG with proportional court (single + doubles lines, service boxes, baseline, T). Coordinate system normalized to `[0,1] × [0,1]` so any input stat maps cleanly.
- **`<ShotArrow from to kind speed />`** — colored arrow (kind: serve / groundstroke / volley), thickness = speed bucket
- **`<BounceDot at intensity />`** — small circle for a single shot bounce
- **`<Zone cell value />`** — overlays a 3×3 grid cell with a value + color
- **`<PlayerMarker side />`** — JD/opponent stick figure or dot at baseline

### 5b. Composite components

- **`<PatternCard pattern />`** — court + 2-4 arrows + label + win% + usage%. The hero of the pattern library.
- **`<ServeMap shots />`** — court + bounce dots in service boxes, color-coded by win/loss
- **`<ZoneGrid cells />`** — court + 3×3 win% matrix
- **`<TrajectoryDot rallies time />`** — animated dot replay (this is where we escalate)

### 5c. When we escalate to visx

- **Heatmaps** that need real density estimation (kernel density) → visx
- **Animated rally replays** with smooth transitions → visx
- Everything else stays plain SVG

### 5d. Court coordinate convention

Single source of truth:
- `x`: 0 = left sideline, 1 = right sideline
- `y`: 0 = JD's baseline, 1 = opponent's baseline
- All `match_shots.bounce_x/y` get normalized in a helper before any viz

---

## 6. Tennis Abstract benchmark scrape

The UTR ladder needs real numbers, not vibes. Tennis Abstract publishes match-charted stats for thousands of matches, including amateur/college.

### 6a. What to fetch

- Match Charting Project (MCP) data: player-level aggregate stats per match
- Filter to players in roughly UTR 2.5–4.5 range (we infer from ITF/ATP/college rating bands)
- Stats we want per player per match: 1st serve %, 1st serve win %, 2nd serve win %, return win %, BP saved %, winners, UE, rally length, ace %, DF %, first-strike effectiveness

### 6b. Mapping to UTR bands

- We can't pull UTR directly. We use proxy ratings:
  - ITF level → ~UTR 4–7
  - College D3 → ~UTR 5–8
  - College D1 → ~UTR 9–13
  - Local USTA 3.0/3.5/4.0 → ~UTR 2.5/3.5/4.5
- For the 3.0–4.0 band JD cares about, we lean on USTA-level charted matches + any verified-UTR public datasets

### 6c. Storage

New Supabase table `benchmarks`:
```
id uuid pk
utr_band text         -- "2.5-3.0" | "3.0-3.5" | "3.5-4.0" | etc
stat_name text
sample_n int
p25 numeric
p50 numeric
p75 numeric
source text           -- "tennis_abstract_mcp" | "usta_published" | etc
fetched_at timestamptz
```

App joins on `(utr_band, stat_name)` to render ladder bars.

### 6d. One-time vs ongoing

- v1: one-time scrape stored in Supabase. Refresh quarterly.
- v2: scheduled scrape (Vercel cron) if MCP grows materially.

### 6e. Risks

- MCP licensing: data is publicly published, attribution required. Verify before launch.
- Sample size in low UTR bands may be thin. Path B (synthetic USTA-published bands) is the fallback for any band where `sample_n < 50`.

---

## 7. Phasing

### v1 — "The stroke cards come alive"
*Smallest thing that makes My Game tab feel new and coherent with MatchDetail*

- New Vercel API route `/api/analyst/run` (per Q1 — server-side compute)
- New Supabase table `analyst_runs` with full history (per Q2)
- Skill writes `analyst_state.json` on every match upload + manual refresh
- **Hero** with identity tag, UTR (manual edit field, last-updated timestamp), record
- **4 identity tiles** — weapon / weakness / style / next-step (uses existing signals)
- **4 stroke cards** (Serve / Return / FH / BH) — each shows: career averages (existing data) + top winning pattern + top losing pattern
- **`PatternCard` SVG component** — the single net-new visual primitive
- **Opponent gallery v1** — list of opponents played with H2H, no full dossier yet
- **"See all stats" button** — opens existing JDStats as modal/route

**Out of scope for v1:** UTR ladder bars in stroke cards, heatmaps, rally animation, trend sparklines, full opponent dossiers, pre-match brief, chat surface

### v2 — "The mirror"
*JD sees himself vs others*

- Tennis Abstract scrape + `benchmarks` table
- UTR ladder section in My Game tab
- Pressure-point signals (BP/SP filtered)
- First-strike + serve+1 patterns
- Trends section with sparklines + regression flags

### v3 — "The strategist"
*The skill becomes load-bearing on product*

- Strategic principles section in skill file (started in v1, fleshed out by v3)
- Pre-match brief surface in MatchDetail (skill drafts, app renders)
- Counterfactual moments in match debrief
- Practice prescriptions tied to gaps
- Heatmaps + zone grids (visx escalation)

### v4 — "The conversation"
*The chat surface*

- In-app chat with the analyst across all tabs
- Animated rally replays
- Video clip integration (SwingVision deep-links from patterns)

---

## 8. Strategic principles (the skill's product voice)

These go into the skill file and are read by future-Claude in any planning conversation. Five rules, no more.

1. **Visual > verbal.** If a pattern can be drawn on a court, draw it. Text is the fallback.
2. **Behavior change is the only metric.** A feature that doesn't change what JD does on court doesn't ship.
3. **Diagnose the why.** "UE went up" is bad. "DTL on short BHs hit the tape" is good.
4. **Confidence over completeness.** Hide low-sample insights. Trust is the moat.
5. **One job per screen.** Self-knowledge (My Game), one match (MatchDetail), opponent prep (Dossier). Don't blend.

The other rules from earlier drafts (three-way comparison, restraint, no duplication, skill-first, plan-first) are real but they belong in `CLAUDE.md` working principles, not in the analyst's strategic voice.

---

## 9. Risks & open questions

**Risks**
- Pattern mining over `match_shots` may be slow on the client — likely needs to run in the skill / on a server route, not in-browser
- Tennis Abstract sample sizes for low UTR bands could be too thin to be credible
- The "smarter" feeling depends on confidence scoring being honest — undisciplined surfacing kills trust faster than missing a feature

**Resolved (JD decisions)**
1. ✅ Skill runs **server-side** as a Vercel API route. App reads cached JSON.
2. ✅ `analyst_runs` keeps **full history** for audit trail and future "evolution" features.
3. ✅ Pre-match brief trigger = **option C**: "Prep next match" button on My Game tab opens a quick form (opponent name + optional date), creates a future match record, lands JD on that MatchDetail in pre-match mode.
4. ✅ UTR is **manually entered and updated by JD**, with a "last updated" field. More scalable for future multi-player.

---

## 10. What I need from JD before code starts

- Sign-off on the IA in §3
- Sign-off on the schema in §4 (especially the fields — this is the contract)
- Answers to the 4 open questions in §9
- Confirmation of v1 scope in §7

Once those are answered, gate 04 (scope + tradeoffs) is a one-pager and gate 05 (implement) starts.
