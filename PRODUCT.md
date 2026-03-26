# Agassi — Product Document

## What this is

A personal coaching system built on match data. Not a stats dashboard. Not a fitness tracker. A system that connects what happened on court with why it happened — and tells JD what to do differently next time.

The name matters: Agassi was the player who proved that intelligence wins matches, not just athleticism. The goal of this app is to give JD that same analytical edge at the amateur level.

---

## Who this is for

**Right now: João Duarte (JD).**
Every decision — design, data model, feature priority — is made with one user in mind. This simplifies everything. When a question arises ("should this be optional?", "how much friction is too much?"), the answer is always: what would JD actually do?

**Future: any serious amateur player.**
At a certain point, "JD" becomes a variable. The architecture should always make that swap easy — but we don't build for it until the decision is made. No multi-user features, no generalisation overhead, no "what if someone else uses this" thinking in v1.

---

## The problem it solves

Amateur tennis players have no coaching infrastructure. No video review. No stats. No one analysing why they lost or what to fix before the next match. They play, lose, forget, repeat.

SwingVision gave JD the data. This app makes that data useful.

---

## What success looks like — in priority order

### 1. Coach relationship with the data
The app should feel like having a data-driven coach on call. After every match, JD understands: what drove the result, what his tendencies are, where he's improving and where he's regressing. The data connects to outcomes — not just "your FH CC was 78%" but "when your FH CC drops below 72%, you lose 80% of matches."

### 2. More match wins
Better preparation = better performance. Before every match, JD has a specific game plan built from his own data — not generic tennis advice. He knows his numbers, knows the opponent's tendencies, knows what worked and what didn't last time. That edge compounds over time.

### 3. Progress and evolution tracking
JD should be able to see himself improving. Not just "I played 12 matches" but "my 1st serve is up 8% since January, my UE count is down, I've never lost to this type of opponent when my return is above 70%." Long-term player development, made visible.

---

## Product principles

**Coach, not dashboard.**
Every feature earns its place by changing what JD does on court. If it's interesting but doesn't change behaviour, it doesn't get built.

**Mobile-first, always.**
JD uses this on his phone, post-match, probably still sweating. Every interaction must work perfectly on a 390px screen with one thumb.

**Reflection, not admin.**
Logging a match should feel like a ritual, not a chore. Tap-based. Fast. Every optional thing is truly optional.

**High-leverage only.**
We cut ruthlessly. A feature that slightly improves something already working is worse than a gap that blocks a key use case. Build the important thing, build it well, move on.

**Data integrity over completeness.**
A match with fewer correct stats is better than a match with more wrong ones. The extraction pipeline should always prefer null over a guess.

**Single user, clean architecture.**
All decisions are made for JD. The architecture is kept clean enough that "JD" can become a configurable variable later — but we never build that abstraction until the moment it's needed.

---

## What this is not

- Not a social platform or a leaderboard
- Not a fitness or health tracker (Whoop does that — we use its output, we don't replicate it)
- Not a general tennis stats product
- Not trying to replace a real coach — it's a complement, not a replacement
- Not built to impress anyone other than JD

---

## Design reference

**Interaction model:** Whoop journal — tap-based, nothing required, feels like reflection
**Visual language:** dark, high-contrast, data-dense but not cluttered — sports analytics aesthetic
**Tone of copy:** direct, confident, no filler. Like a good coach talking, not a product manager writing.
