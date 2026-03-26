# Agassi — Roadmap

This is the single source of truth for what's being built, what's next, and what's not happening. Updated after every shipped feature or priority change.

**Last updated:** 2026-03-26

---

## NOW — In progress

### Journal function (match stats + player input)
The Whoop-style post-match journal is implemented in the upload flow. Outstanding work:
- [ ] Run Supabase migration: `ALTER TABLE matches ADD COLUMN IF NOT EXISTS journal JSONB;`
- [ ] Stress-test the question set — cut low-leverage questions (physical feel dots may be redundant with recovery score, conditions section may be too low-leverage)
- [ ] Surface journal data in JDStats (recovery score correlation with stats, game plan execution vs win rate)
- [ ] Surface journal priority notes in Strategy tab (per-opponent priority history)

**Why it matters:** Connects subjective player state to objective match data. Enables the coach relationship — "when your recovery is Low, your UE spikes by 40%".

---

## NEXT — Queued and prioritised

### 1. UX/UI revamp — full design rethink
The current app works but the way stats are presented isn't ideal. This is a design-first initiative: rethink the visual hierarchy, stat presentation, and navigation across every tab. Goes through the full 6-gate process.

Key questions to answer in the design phase:
- Is the current tab structure (Last Match / Match History / Next Strategy / Evolution / JD Stats) the right mental model?
- How should stats be presented to feel like coaching insight rather than raw numbers?
- What does the "coach relationship" feel and look like at a UI level?
- What are the most important things on each screen, and are they visually dominant?

**Why it matters:** JD said the stat presentation isn't ideal. Design debt compounds — fixing it now before more features are added is the right time.

---

### 2. Functionality review — full audit against current context
Review every tab, every feature, every data point against the full product context we now have. Questions to answer:
- What's currently shown that isn't earning its place?
- What data is collected but not surfaced anywhere useful?
- What interactions feel wrong on mobile?
- Does the tab structure make sense for the three goals (coach relationship, match wins, progress tracking)?

**Why it matters:** The app has grown feature-by-feature. A top-down review ensures everything coheres into a coaching system, not a collection of features.

---

### 3. Win/loss correlation surfacing
The data needed to say "when X happens, you win Y% of the time" already exists. It needs to be surfaced clearly — in JDStats, in Strategy, and potentially as a dedicated insight panel.

Examples of insights to surface:
- "When your 1st serve Ad is above 68%, you win 82% of matches"
- "Your UE count is the single strongest predictor of your result"
- "You've won 100% of matches where you rated game plan execution as Yes or Mostly"

---

### 4. Journal data in Strategy + JDStats
The journal is being stored. The next step is making it analytically visible:
- Recovery score distribution in wins vs losses
- Game plan execution vs win rate
- Per-opponent priority history in the Strategy tab

---

## LATER — Planned but unscoped

- **Match timeline / evolution tab** — visual progress over time (sparklines at match level, not just stat level)
- **Opponent database** — dedicated profiles per opponent (beyond the H2H panel in Strategy)
- **Pre-match prep mode** — a streamlined "day of match" view: game plan summary, opponent tendencies, key stats to hit
- **Export / session summary** — PDF or text summary after upload, shareable with a real coach
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
