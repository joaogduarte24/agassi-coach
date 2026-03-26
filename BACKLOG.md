# Agassi — Backlog

Raw ideas captured as they come. No commitment, no priority, no gate required to add something here. When an idea is ready to become real work, it moves to `ROADMAP.md` and goes through the 6-gate process.

**How to add:** one line minimum. Add context if you have it. Don't overthink it.
**Status tags:** `[idea]` → `[considering]` → `[→ roadmap]` → `[dropped: reason]`

---

## Upload & Data Capture

- [idea] Merge duplicate opponent entries in Supabase (e.g. two Gonçalo Oliveira records from before the opponent dropdown existed)
- [idea] Batch upload — process multiple matches at once from a folder
- [idea] Let SwingVision export a CSV/JSON directly instead of screenshots — check if API exists
- [idea] Detect if the same match is being uploaded twice and warn before overwriting

## Match Journal

- [idea] Stress-test journal question set — cut physical feel dots (redundant with recovery score?), cut conditions section (low-leverage?)
- [idea] Add time-of-day question to journal (morning/afternoon/evening) — correlates with performance
- [idea] "Opponent notes" free-text field (optional, collapsible) — one thing to remember about this player
- [idea] Auto-open journal after a loss — gentle nudge to reflect when it matters most

## Stats & Analysis

- [idea] Surface filter in JDStats — show stats for Clay/Hard/Grass only
- [idea] Recovery score vs UE count correlation — show in JDStats when enough journal data exists
- [idea] Game plan execution vs win rate — "when you rate execution Yes or Mostly, you win X%"
- [idea] UTR trend over time — are you playing harder opponents as you improve?
- [idea] First-set performance vs warmup — does skipping warmup hurt your first set?
- [idea] Time-of-day performance split — are you better in the morning or afternoon?
- [idea] Match intensity metric using total_shots — longer rallies, more shots = harder match

## Strategy & Coaching

- [idea] Pre-match prep mode — streamlined day-of-match view: game plan summary, opponent tendencies, key stats to hit
- [idea] Per-opponent priority history in Strategy — "last 3 times you played Gonçalo, you flagged Reduce UE as priority. Your UE was X in those matches."
- [idea] Surface-specific tactical advice — when surface selected, show JD's actual stats on that surface, not just generic text
- [idea] "What to watch for" based on opp_shots — auto-generate 2-3 tactical bullets from recorded opponent data
- [idea] Opponent database page — dedicated profile per opponent (beyond H2H panel in Strategy)

## UX & Design

- [idea] Full UX/UI revamp — rethink visual hierarchy, stat presentation, navigation across all tabs (in ROADMAP.NEXT)
- [idea] Functionality review — audit every tab against product goals, cut what's not earning its place (in ROADMAP.NEXT)
- [idea] Match History tab redesign — current list view is too flat, no visual signal of win/loss trend
- [idea] Swipe between matches in Match Detail — instead of going back to the list
- [idea] "Last match" landing screen redesign — first thing JD sees, should feel like a debrief not a form
- [idea] Color-coded score in match list — W/L immediately scannable without reading
- [idea] Empty state improvements — each tab's empty state should explain what JD gets when there's data

## Progress & Evolution

- [idea] Player evolution timeline — key metrics plotted over time at match level, not just average
- [idea] Monthly or seasonal summary — "In March you played 4 matches, won 3, your serve improved by X%"
- [idea] Personal bests tracking — fastest serve ever recorded, highest 1st serve %, most winners in a match
- [idea] Win streak and loss streak tracking — simple but motivating

## Sharing & Export

- [idea] Post-match summary export — PDF or text, shareable with a real coach
- [idea] Share a single match stat card — image format, for WhatsApp / social

## Infrastructure

- [idea] Auth / login — needed when opening to more users, not before
- [idea] Multi-user support — "JD" becomes a variable, each user has their own match history
- [idea] Offline support — cache last loaded matches for viewing without internet
- [idea] Push notification after match upload completes — confirmation when processing done
