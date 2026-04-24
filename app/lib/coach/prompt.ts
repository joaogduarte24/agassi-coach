import type { Match } from '@/app/types'
import type { Signal } from '@/app/lib/signals/types'

// ─── INPUT SHAPE FOR THE DEBRIEF PROMPT ──────────────────────────────────────
export type DebriefPromptInput = {
  /** The match being debriefed. */
  match: Match
  /** JD's last N matches before this one (for baseline comparison). */
  recentMatches: Match[]
  /** Coachability-filtered career signals from selectForDebrief(). */
  filteredSignals: Signal[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(v: number | null | undefined, suffix = ''): string {
  if (v == null || (typeof v === 'number' && !Number.isFinite(v))) return '—'
  return typeof v === 'number' ? `${Math.round(v * 10) / 10}${suffix}` : `${v}${suffix}`
}

function avg(vals: Array<number | null | undefined>): number | null {
  const xs = vals.filter((v): v is number => v != null && Number.isFinite(v))
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

function matchStatSummary(m: Match): string {
  // shot_stats carries extended xlsx-only fields (rally_mean, fh_cc_pct, etc.)
  // not present in the strict ShotStats type. Cast loose; runtime data is JSONB.
  const s = (m.shot_stats ?? {}) as any
  const lines: string[] = []
  lines.push(`- Unforced errors: ${fmt(s.ue)} (FH: ${fmt(s.fh_ue)}, BH: ${fmt(s.bh_ue)})`)
  lines.push(`- Winners: ${fmt(s.winners)} (FH: ${fmt(s.fh_winners)}, BH: ${fmt(s.bh_winners)})`)
  lines.push(`- Double faults: ${fmt(s.df)}`)
  // Serve %
  const s1Ad = m.serve?.first?.pct_ad, s1De = m.serve?.first?.pct_deuce
  if (s1Ad != null || s1De != null) {
    const combined = ((s1Ad ?? 0) + (s1De ?? 0)) / ((s1Ad != null ? 1 : 0) + (s1De != null ? 1 : 0))
    lines.push(`- 1st serve %: ${fmt(combined, '%')} (ad ${fmt(s1Ad, '%')}, deuce ${fmt(s1De, '%')})`)
  }
  lines.push(`- Serve pts won %: ${fmt(s.serve_pts_won_pct, '%')} (1st: ${fmt(s.s1_pts_won_pct, '%')}, 2nd: ${fmt(s.s2_pts_won_pct, '%')})`)
  lines.push(`- Return pts won %: ${fmt(s.return_pts_won_pct, '%')}`)
  lines.push(`- Break points: saved ${fmt(s.bp_saved_pct, '%')} (${fmt(s.bp_saved_n)}/${fmt(s.bp_saved_total)}), won ${fmt(s.bp_won_pct, '%')} (${fmt(s.bp_won_n)}/${fmt(s.bp_won_total)})`)
  // xlsx-only enriched fields
  if (s.rally_mean != null) lines.push(`- Rally length: avg ${fmt(s.rally_mean)} shots, ${fmt(s.rally_pct_short, '%')} ≤3 shots, ${fmt(s.rally_pct_long, '%')} 7+ shots`)
  if (s.fh_cc_pct != null) lines.push(`- FH direction: ${fmt(s.fh_cc_pct, '%')} CC / ${fmt(s.fh_dtl_pct, '%')} DTL`)
  if (s.bh_cc_pct != null) lines.push(`- BH direction: ${fmt(s.bh_cc_pct, '%')} CC / ${fmt(s.bh_dtl_pct, '%')} DTL`)
  return lines.join('\n')
}

function baselineSummary(recent: Match[]): string {
  const stats = recent.map(m => m.shot_stats).filter(Boolean) as any[]
  if (stats.length === 0) return '(no recent matches with stats)'
  const lines: string[] = [`Baseline over last ${stats.length} matches with stats:`]
  const push = (label: string, getter: (s: any) => number | null | undefined, suffix = '') => {
    const a = avg(stats.map(getter))
    lines.push(`- ${label}: ${fmt(a, suffix)}`)
  }
  push('Avg UE', s => s.ue)
  push('Avg winners', s => s.winners)
  push('Avg DF', s => s.df)
  push('Avg serve pts won', s => s.serve_pts_won_pct, '%')
  push('Avg return pts won', s => s.return_pts_won_pct, '%')
  push('Avg BP saved', s => s.bp_saved_pct, '%')
  // Win rate
  const wins = recent.filter(m => m.score?.winner === 'JD').length
  lines.push(`- Record in this window: ${wins}W ${recent.length - wins}L`)
  return lines.join('\n')
}

function signalsSummary(signals: Signal[]): string {
  if (signals.length === 0) return '(no coachable career patterns clear the threshold yet)'
  return signals.map(s => `- ${s.key}: ${s.insight} (lift ${s.lift}%, ${s.confidence} confidence, ${s.matchesUsed} matches)`).join('\n')
}

function journalSummary(m: Match): string {
  // Same loose-cast rationale: journal is Partial at runtime (user can skip fields).
  const j = (m.journal ?? {}) as any
  const parts: string[] = []
  if (j.composure != null) parts.push(`Composure ${j.composure}/5`)
  if (j.focus != null) parts.push(`Focus ${j.focus}/5`)
  if (j.plan_executed) parts.push(`Plan executed: ${j.plan_executed}`)
  if (j.match_arc_start) parts.push(`Start: ${j.match_arc_start}`)
  if (j.match_arc_finish) parts.push(`Finish: ${j.match_arc_finish}`)
  if (j.momentum) parts.push(`Momentum: ${j.momentum}`)
  if (j.body_state) parts.push(`Body: ${j.body_state}`)
  if (j.worst_moment) parts.push(`Worst moment: ${j.worst_moment}`)
  if (j.decided_by && Array.isArray(j.decided_by) && j.decided_by.length) parts.push(`Decided by: ${j.decided_by.join(', ')}`)
  if (j.reflection_text) parts.push(`JD wrote: "${j.reflection_text}"`)
  return parts.length ? parts.join('. ') : '(no journal entry)'
}

function opponentShotsSummary(m: Match): string {
  const opp = (m as any).opp_shots
  if (!opp?.stats) return '(no opponent shot data for this match)'
  const s = opp.stats
  const lines: string[] = []
  if (s.ue != null) lines.push(`- Opp UE: ${fmt(s.ue)}`)
  if (s.winners != null) lines.push(`- Opp winners: ${fmt(s.winners)}`)
  if (s.s1_pts_won_pct != null) lines.push(`- Opp 1st serve pts won: ${fmt(s.s1_pts_won_pct, '%')}`)
  if (s.return_pts_won_pct != null) lines.push(`- Opp return pts won: ${fmt(s.return_pts_won_pct, '%')}`)
  const distribution = opp.distribution
  if (distribution) {
    if (distribution.fh_pct != null) lines.push(`- Opp shot mix: ${fmt(distribution.fh_pct, '%')} FH / ${fmt(distribution.bh_pct, '%')} BH`)
  }
  return lines.length ? lines.join('\n') : '(opp_shots present but no usable fields)'
}

// ─── MAIN PROMPT BUILDER ─────────────────────────────────────────────────────
export function buildDebriefPrompt(input: DebriefPromptInput): string {
  const { match, recentMatches, filteredSignals } = input
  const outcome = match.score?.winner === 'JD' ? 'WIN' : 'LOSS'
  const oppName = match.opponent?.name || 'unknown'
  const oppUtr = match.opponent?.utr != null ? `UTR ${match.opponent.utr}` : 'UTR unknown'

  return `You are JD's in-match tennis coach. You just watched his match and you are preparing him for the NEXT time he's on court. Your job is to identify the 1–2 patterns that decided THIS match and, for each, give him a concrete IN-MATCH ADJUSTMENT he can execute during play next time the pattern starts showing up.

CRITICAL: JD has a real human coach who handles practice and drilling. Your job is ON-COURT orientation only. Never prescribe practice drills, rep counts, training sessions, or technique fixes. Everything you suggest must be executable DURING A LIVE POINT or between points at a changeover.

MATCH
- Date: ${match.date}
- Opponent: ${oppName} (${oppUtr})
- Surface: ${match.surface || 'unknown'}
- Score: ${match.score?.sets || 'unknown'} — ${outcome}

THIS MATCH — JD'S STATS
${matchStatSummary(match)}

THIS MATCH — OPPONENT STATS
${opponentShotsSummary(match)}

JD'S RECENT BASELINE
${baselineSummary(recentMatches)}

JD'S CAREER COACHING SIGNALS (already filtered for coachability)
${signalsSummary(filteredSignals)}

JD'S JOURNAL FOR THIS MATCH
${journalSummary(match)}

YOUR OUTPUT FORMAT — JSON only, no preamble, no markdown:
{
  "patterns": [
    {
      "pattern": "<one sentence: what happened in THIS match, tied to a broader truth about JD's game. Connect this match to the career baseline or signals when you can.>",
      "evidence": "<the specific numbers from THIS match + baseline/signals that prove the pattern. Cite at least two numbers.>",
      "adjustment": "<a specific IN-MATCH cue JD uses during the next match when this pattern starts. A shot selection rule, a trigger-to-action, a mental reset, a pattern to commit to. Must be executable mid-point or at a changeover. NOT a practice drill, NOT training.>"
    }
  ]
}

HARD CONSTRAINTS
- 1 or 2 patterns. Fewer is better. If only one thing actually decided this match, return one.
- Each "pattern" must connect THIS match to a broader truth. Not "you had 14 UEs." But "your 14 BH CC UEs today mirror your pattern: >10 BH CC UEs in 7 of your 9 losses this year."
- Each "evidence" must cite ≥2 specific numbers from the data above.
- Each "adjustment" must be a STANDING COMMITMENT, a SCORE-STATE TRIGGER, or an OPPONENT-BEHAVIOR TRIGGER. Never a numeric counter.
- Coach voice: direct, 2nd person, short sentences. Sound like Brad Gilbert between points, not a blog post.
- Do NOT restate the match score — JD already sees it in the UI.
- Do NOT give generic tennis advice. Everything must be grounded in the data above.
- Do NOT prescribe practice drills, rep counts, training routines, or technique fixes. JD's human coach handles those.
- If the data genuinely does not support a clear pattern (weak sample, no stats, missing journal), return a single pattern that says so honestly instead of inventing one.

CRITICAL — NEVER USE NUMERIC TRIGGERS
Tennis players do not count errors, winners, or serve % in their head during a match. An adjustment that starts with "when X count hits N" is useless — the player cannot observe the trigger. The same applies to "when your 1st serve % drops below 60%" or "after 3 double faults." Players notice SCORE STATE, OPPONENT BEHAVIOR, and FEEL — not tallies.

Valid trigger shapes:
  1. STANDING COMMITMENT — applies all match, no trigger needed.
     Example: "Standing plan: every rally, cross-court until you get a short ball inside the service line, then attack DTL."
  2. SCORE-STATE TRIGGER — tied to things the player naturally tracks.
     Examples: "on any break point", "in deciding sets", "after losing your serve", "on ad-side deuce points", "when down 0-30 in your service game".
  3. OPPONENT-BEHAVIOR TRIGGER — tied to something the player observes.
     Examples: "when Gonçalo steps in on your 2nd serve", "when he slices the return back short", "when he starts chipping instead of driving the return".
  4. TEMPO / MENTAL TRIGGER — tied to felt state, not counted.
     Examples: "when rallies start feeling rushed", "if you catch yourself aiming for lines", "at the changeover after losing two games in a row".

INVALID trigger shapes (rejected):
  - "When FH UE count hits 10…"
  - "If your 1st serve % drops below 60%…"
  - "After 3 double faults in a set…"
  - "When you've lost 5 return points in a row…"
Anything that requires counting in real time.

EXAMPLES OF GOOD ADJUSTMENTS
- "Standing plan all match: first 3 rally balls are cross-court, no exceptions. Only open up the court after you've earned a short ball."
- "On break point down, go to the first serve no matter what your percentage looks like. Your BP conversion is 67% on 1st, 22% on 2nd."
- "If Gonçalo steps in on your 2nd serve, go WIDER, not slower. Placement over spin."
- "After losing your serve, start the next return game with a chip return — don't rip. Buy a point to settle."
- "At the changeover after losing two games in a row, one deep breath and commit to the first ball cross-court for three points."

EXAMPLES OF BAD ADJUSTMENTS (rejected)
- "When FH UEs hit 12, shift to safer shots." (counting required)
- "Keep your 1st serve % above 60%." (calculation required)
- "Practice cross-court FH at 70% pace for 20 reps daily." (training drill)
- "Work on your backhand consistency." (generic + training)
- "Add topspin to your 2nd serve." (technique fix, not mid-point)

Output JSON only.`
}
