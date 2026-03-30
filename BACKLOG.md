# Agassi — Backlog

Raw ideas captured as they come. No commitment, no priority, no gate required to add something here. When an idea is ready to become real work, it moves to `ROADMAP.md` and goes through the 6-gate process.

**How to add:** one line minimum. Add context if you have it. Don't overthink it.
**Status tags:** `[idea]` → `[considering]` → `[→ roadmap]` → `[dropped: reason]` → `[shipped]`

---

## Raw Shot & Point Data (xlsx-exclusive)

- [idea] **Court heatmaps** — plot `bounce_x/bounce_y` for JD's FH/BH to show where shots are landing vs where the opponent is targeting. Per-match and aggregated across matches.
- [idea] **Opponent scouting profile** — accumulate opponent `match_shots` rows across multiple matches to build a shot tendency map: where they serve, where their BH lands, where they attack from the net. Gets richer the more matches you have vs same opponent.
- [idea] **Rally length vs outcome** — do JD's wins come in short rallies (serve+1) or long ones? Cross-ref `rally_mean`/`rally_pct_short/long` with point winner to identify the pattern that wins matches.
- [idea] **Pressure point shot analysis** — filter `match_shots` by points flagged as break points (`match_points.break_point = true`) to see if JD's shot selection or speed changes under pressure vs normal play.
- [idea] **Serve direction tendency reveal** — `s1_t_pct` / `s1_wide_pct` per side already computed; surface it in Strategy tab pre-match for JD's own tendencies ("you go wide 70% on ad side — opponent will cheat") and for opponent.
- [idea] **Contact height trend** — track `fh_contact_z` and `bh_contact_z` over time. Rising contact height = more offensive stance. Useful for tracking tactical evolution.
- [idea] **Speed consistency** — `fh_spd_std` as a coaching signal: high std dev = erratic hitting, low = controlled. Correlate with UE rate.
- [idea] **Serve+1 pattern** — `s1_after_dtl_pct` tells you how often JD follows a serve with a DTL shot. Opponent tendency can be inferred from their `match_shots` serve+1 data.

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

- [→ roadmap] Surface filter in JDStats — show stats for Clay/Hard/Grass only — **ICE 432, NEXT #2**
- [→ roadmap] Recovery score vs UE count correlation — show in JDStats when enough journal data exists — **ICE 343, NEXT #3**
- [→ roadmap] Game plan execution vs win rate — "when you rate execution Yes or Mostly, you win X%" — **ICE 343, NEXT #3**
- [→ roadmap] Win/loss correlation surfacing — **ICE 448, NEXT #1**
- [idea] UTR trend over time — are you playing harder opponents as you improve?
- [idea] First-set performance vs warmup — does skipping warmup hurt your first set?
- [idea] Time-of-day performance split — are you better in the morning or afternoon?
- [idea] Match intensity metric using total_shots — longer rallies, more shots = harder match

## AI & Intelligence

- [→ roadmap] **AI coaching layer** — replace rule-based debrief bullets with Claude-generated insights using full match data, journal, and historical context. Applies to: Debrief (post-match), Next Match strategy, JDStats patterns. Uses the same Claude API already wired in `/api/extract`. **ICE 315, NEXT #6**

## Strategy & Coaching

- [→ roadmap] Pre-match prep mode — streamlined day-of-match view: game plan summary, opponent tendencies, key stats to hit — **ICE 336, NEXT #5**
- [idea] Per-opponent priority history in Strategy — "last 3 times you played Gonçalo, you flagged Reduce UE as priority. Your UE was X in those matches."
- [idea] Surface-specific tactical advice — when surface selected, show JD's actual stats on that surface, not just generic text
- [idea] "What to watch for" based on opp_shots — auto-generate 2-3 tactical bullets from recorded opponent data
- [idea] Opponent database page — dedicated profile per opponent (beyond H2H panel in Strategy)

## UX & Design

- [shipped] Full UX/UI revamp — Premium Sports Editorial design language, 4-tab navigation, match state model
- [→ roadmap] Functionality review — audit every tab against product goals, cut what's not earning its place — **ICE 336, NEXT #4**
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
