# Agassi — Crowdsource Benchmark Layer

> **The benchmark is the product.**
> Marketing strategy ref: `~/Downloads/agassi-coach-marketing-strategy.html` (v1.0).
> This doc is the technical + product companion to that strategy. Read both together.

---

## Why this matters

Agassi's go-to-market is built on a single asset: **the first shot-level intelligence benchmark for amateur tennis, banded by UTR.** No public dataset combines shot stats + UTR for recreational players. The gap is the moat.

The benchmark is simultaneously:
- The **product hook** — "you hit 62% first serves" is meaningless; "top 28% of UTR 3–4" is shareable
- The **PR asset** — annual *Amateur Tennis Intelligence Report*, monthly stat drops, press citations
- The **retention engine** — personal report cards (the Wrapped moment for tennis)
- The **acquisition flywheel** — every contributor makes the product better for every other contributor
- The **competitive moat** — only Agassi has it, and it strengthens with each user

**North star metric:** matches in the database. Everything downstream of data density.

This means: **the schema and aggregation pipeline are not infrastructure. They are the product.** Every architectural decision should be made through the lens of "does this make the benchmark easier to grow, query, and publish?"

---

## Current vision (today, N=1 contributor)

Right now Agassi has one user (JD) producing two data points per match: JD's stats and the opponent's stats (`opp_shots`). UTR is captured per-opponent (`opponent_utr`) and implicitly per-JD (his own UTR is known).

**That is already a crowdsource dataset of N=1 with two perspectives per match.** Every match upload populates it. We are not doing anything with it yet — `app/lib/analyst/benchmarks.ts` uses synthetic numbers and the UI shows JD's stats against fabricated UTR-band medians.

The current vision is: **stop treating opponent data as decoration and start treating it as the seed of the public benchmark.** Same payload, same shape, same UTR-banding logic that the future multi-user version will use — just with one contributor today.

### What "ready" looks like for the current state

1. **Opponents are first-class records.** Promote `opponent_name` from a string column on `matches` to an `opponents` table. Schema: `id, name, utr, handedness, style, created_at`. Every match links by `opponent_id`. Side benefit: fixes the existing dedupe bug where the same opponent appears twice with different spellings.

2. **Opponent observation ledger.** New table `opponent_observations`: one row per `(opponent_id, match_id)` containing the full `opp_shots` payload + UTR at the time of the match + surface + date. **Critically: this is the exact shape a future external contributor will submit.** Build the schema once; JD fills it today via every match upload, others fill it tomorrow via opt-in.

3. **UTR-band aggregation query.** A view or query that groups `opponent_observations` by UTR band (bands: 1–2, 2–3, 3–4, 4–5, 5–6, 6–7, 7–8) and computes medians + percentiles for every stat in `shot_stats`. Returns the same shape as the current synthetic benchmarks.

4. **Feature flag in `benchmarks.ts`.** Per-stat-per-band: use real data when N ≥ threshold, synthetic when below. Threshold starts at 10 (per the marketing doc's "Early Signal" framing in Open Question Q2). Zero UI change required — the analyst layer reads from one function and doesn't care about the source.

5. **Contribution-readiness audit.** Walk every field in `opp_shots`, `shot_stats`, and `journal`. For each, decide: would I be comfortable if a stranger uploaded this anonymously? Free-text fields (`what_worked`, `what_didnt`, `key_number`), names, and any journal text get flagged for stripping at the aggregation layer. Numeric stats pass through. The output is a documented allowlist of "contribution-safe fields" that the future `/api/contribute` endpoint will enforce.

6. **`/api/contribute` endpoint (built now, used by JD only).** Takes a stripped match payload — no names, no journal free-text, just `opponent_utr + surface + date + shot_stats + opp_shots numerics`. Validates against the allowlist. Inserts into `opponent_observations`. **Built and battle-tested against JD's own data today**, so when the public toggle ships, the endpoint is already proven.

7. **Self-UTR vs observed-UTR drift detection.** Once N grows even modestly, compare a player's self-reported UTR to the stat profile of opponents in that band. Flag inflation/deflation. This is the dataset's quality immune system — start the scaffolding now even if it's not actionable until N is bigger.

**None of these are user-facing.** They are pure plumbing. The UI today changes nothing. But the day we want to flip the switch on the public crowdsource layer, everything is already in place.

---

## Future vision (multi-user, the marketing strategy)

This is what the marketing doc is selling. Read `agassi-coach-marketing-strategy.html` for the full GTM narrative. What follows is the product/technical view of the same plan.

### Phase 0 — Founding Layer (50–150 users, 150+ matches, 6 weeks)

**Product surface:**
- Opt-in **"Contribute to benchmark"** toggle in settings. Off by default. Clear copy: "Your match stats (no names, no notes) help build the first amateur tennis benchmark. Founding members shape what good looks like at every UTR level."
- **Self-reported UTR** at signup (range 1.0–8.0 in 0.5 steps, with "I don't know" → estimated from results).
- **Founding Member badge** + lifetime free tier for the first 100 contributors of 3+ matches. (Open Question Q1 in marketing doc — needs JD's call.)
- Waitlist landing page with the founding member pitch.

**Backend surface:**
- Auth (currently single-user, no auth). Email + magic link. No passwords.
- Multi-tenant `users` table. Every match scoped by `user_id`. Migration plan for JD's existing data: reassign all current matches to a `user_id` for JD.
- `users.contributes_to_benchmark` boolean. Aggregation queries filter on this.
- `users.utr` + `users.utr_self_reported_at` (so we can detect stale UTRs).
- The `opponent_observations` ledger built in the current phase now receives data from N users instead of 1.

**Data shape unchanged from current phase.** That's the point.

### Phase 1 — The Benchmark Drop (500 users, 12 weeks)

**Product surface:**
- **Personal Report Card** — every user's stats overlaid on the benchmark. "You're in the top 31% of UTR 3–4 for first serve %. Your UE rate under pressure is your biggest unlocked gain." This is the Wrapped moment. Designed to be screenshot-shareable (vertical format, branded, one-tap to Instagram/X/WhatsApp).
- **Public web report** — *The Amateur Tennis Intelligence Report v1*. Free, no signup wall. Editorial web page + downloadable PDF + 5–7 stat cards for social.
- **"How does your game stack up?"** interactive widget — embeddable, no login. Enter your UTR + a couple of stats, see your percentile. Pure top-of-funnel.

**Backend surface:**
- Public read-only API for the benchmark aggregates (cached, rate-limited). Powers the embeddable widget and the press visualizations.
- Report generation pipeline: monthly snapshot of the dataset → static HTML/PDF → versioned in Supabase Storage. Each snapshot is a citeable artifact.
- Analytics on report card shares (which stats get shared most → tells us which benchmarks to lead with in v2).

### Phase 2 — Scale (2,000+ users, 12 months)

**Product surface:**
- **UTR band leaderboards** (opt-in within the opt-in). Anonymous handles. Top 10 per stat per band. Retention + virality loop.
- **Coach Team Dashboards** — coach sees aggregate performance of their students vs the benchmark. B2B2C distribution channel (10 coaches × 10 students = 100 pre-sold users).
- **Drift alerts** — "Your serve % dropped from the 60th to the 40th percentile of your band over the last 5 matches." Re-engagement trigger.
- **Annual report cadence** — January drop becomes a recurring media moment. "Your year in tennis."

**Backend surface:**
- Coach role + team scoping. Coaches see aggregates only, never individual student stats unless explicitly shared.
- Cohort tagging on `opponent_observations` (region, surface mix, age bracket — all opt-in self-reported) so the benchmark can be sliced multiple ways for press content.
- Possible SwingVision or RecAce ingestion partnership — direct API import instead of screenshot/xlsx upload. (Marketing doc names this as a Phase 2 exploration.)

---

## How current vision feeds future vision

| Future need (Phase 0–2) | Built in current phase | Why this works |
|---|---|---|
| Multi-user contributions | `opponent_observations` ledger with the exact contribution shape | Same insert path, same validation, same aggregation. JD's matches are seed data. |
| UTR-banded benchmarks | Aggregation query + feature flag in `benchmarks.ts` | Real data replaces synthetic per-stat once N ≥ 10. Zero UI change. |
| Privacy guarantees | Contribution-readiness audit + allowlist enforced by `/api/contribute` | Audit happens once, against JD's data. By launch the rules are battle-tested. |
| Personal report cards | Same `shot_stats` + benchmark percentile lookup that powers JD's My Game tab today | The report card is just a styled, shareable export of an existing computation. |
| Public report / widget | Same aggregation query, exposed via a cached public endpoint | The hard work (binning, percentile math, edge cases) is already done. |
| Quality control | Self-UTR vs observed-UTR drift detector | Built against JD's data so the algorithm is tuned before strangers arrive. |
| Opponent dedupe | `opponents` table with stable IDs | Solves a current bug *and* makes per-opponent aggregation possible. |

**Every piece of the current-phase plumbing is load-bearing for the future-phase product.** Nothing is throwaway. The single-user version is the multi-user version with a hardcoded `user_id`.

---

## Hard constraints (non-negotiables)

1. **No PII in the benchmark, ever.** Names, free-text journal fields, opponent names, match IDs that could be cross-referenced — none of it touches `opponent_observations`. The allowlist is enforced at insert time, not at query time. Belt and braces.

2. **Opt-in is opt-in.** No dark patterns. The toggle is off by default, the copy is honest, and turning it off retroactively removes the user's contributions from future aggregations. (Past published reports are immutable — that's standard and we say so.)

3. **Sample size transparency in every published number.** Every stat in every report shows N. If N < threshold, the number is shown as "Early Signal — N=X" not as an authoritative median. This is the marketing doc's Q2 answer made into a hard product rule.

4. **Self-reported UTR is trusted but verified.** We don't gatekeep on UTR proof, but the drift detector flags suspicious profiles for exclusion from published aggregates (not from the user's own experience).

5. **The benchmark layer is read-only from the user's perspective.** Users see their percentile; they never see other users' raw data. Not even anonymized rows. Only aggregates.

6. **The schema doesn't change between current and future phases.** If a table or column would need to be reshaped to support multi-user, it must be reshaped *now*, before the public launch. The migration cost of doing it later is the entire business.

---

## What this means for next steps

**Before any of the Phase 0 marketing tactics in the strategy doc are real, the current-phase plumbing has to be in place.** That sequencing is non-negotiable: you cannot recruit founding members onto a benchmark that doesn't exist.

The next concrete unit of work, when JD is ready to commit it to the roadmap via the 6-gate process, is:

> **Cluster: Crowdsource Foundation (single-user)**
> Promote opponents to a table, create `opponent_observations`, build the UTR-band aggregation query, wire the feature flag in `benchmarks.ts`, run the contribution-readiness audit, build `/api/contribute` against JD's own data.

That cluster is the thing that has to ship before any marketing tactic from the strategy doc can fire. Everything in the strategy doc is downstream of those six tasks.

Backlog entries for each piece live in `BACKLOG.md` under the **Crowdsource Layer** section.

---

## Open questions (mirrored from marketing doc, plus product-side)

From the marketing doc:
- **Q1 — Founding Member offer.** What's the permanent benefit? Lifetime free tier? Name in report credits? *Owner: JD. Decide before outreach.*
- **Q2 — Minimum viable benchmark threshold.** Suggest N=10 per band as the "Early Signal" floor (matches the feature flag in the current phase).
- **Q3 — Shareable report card format.** Truncated in source; needs a design pass when Phase 1 is on deck.

Product-side, added here:
- **Q4 — When does auth ship?** Auth is the gate to multi-user. The current-phase plumbing is auth-free. Best answer: build the plumbing now, ship auth as the first step of Phase 0.
- **Q5 — Free vs paid tier.** The marketing doc implies a free tier. What's behind the paywall, if anything? The benchmark itself must stay free (it's the marketing engine). Personal AI coaching might be the paid layer. Decide before Phase 1.
- **Q6 — Data residency / GDPR.** Anonymous stats are low-risk but UTR + surface + date can theoretically be re-identifying for a known player in a small region. Probably fine, worth a once-over before public launch.
- **Q7 — SwingVision relationship.** Friendly ingestion partner or competitor? The marketing doc lists partnership exploration in Phase 2. Worth a soft outreach earlier — a blessing (or even just non-hostility) is worth a lot.

---

## Document discipline

This file is the source of truth for the crowdsource vision. Update it whenever:
- A piece of current-phase plumbing ships (move from "what ready looks like" to a SHIPPED note)
- An open question gets answered
- The marketing doc is revised (bump the version reference at the top)
- A constraint changes

Read it before any work that touches `opponent_observations`, `benchmarks.ts`, the opponents table, or anything in the contribution pipeline.
