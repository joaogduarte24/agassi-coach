import type { Match } from '@/app/types'
import type { Signal } from './types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function winRate(matches: Match[]): number {
  if (!matches.length) return 0
  return Math.round(matches.filter(m => m.score?.winner === 'JD').length / matches.length * 100)
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── BUCKET CORRELATION HELPER ───────────────────────────────────────────────
// Splits matches into two groups by a numeric value, computes lift
function numericCorrelation(
  matches: Match[],
  key: string,
  label: string,
  extract: (m: Match) => number | null,
  higherIsBetter: boolean,
): Signal | null {
  const pairs: { match: Match; value: number }[] = []
  for (const m of matches) {
    const v = extract(m)
    if (v != null) pairs.push({ match: m, value: v })
  }
  if (pairs.length < 5) return null

  const med = median(pairs.map(p => p.value))
  const above = pairs.filter(p => p.value >= med)
  const below = pairs.filter(p => p.value < med)
  if (above.length < 2 || below.length < 2) return null

  const wrAbove = winRate(above.map(p => p.match))
  const wrBelow = winRate(below.map(p => p.match))
  const lift = higherIsBetter ? wrAbove - wrBelow : wrBelow - wrAbove
  if (Math.abs(lift) < 10) return null

  const goodDir = higherIsBetter ? 'above' : 'below'
  const goodWr = higherIsBetter ? wrAbove : wrBelow
  const badWr = higherIsBetter ? wrBelow : wrAbove

  return {
    key: `${key}_journal`,
    label,
    insight: `${label} ${goodDir} ${Math.round(med)} boosts your win chance by ${Math.abs(lift)}%`,
    detail: `${goodWr}% win rate when ${goodDir} ${Math.round(med)} vs ${badWr}% otherwise`,
    category: 'journal',
    direction: lift > 0 ? 'positive' : 'negative',
    confidence: pairs.length >= 10 ? 'moderate' : 'low',
    lift,
    value: Math.round(med),
    threshold: Math.round(med),
    winRateAbove: wrAbove,
    winRateBelow: wrBelow,
    matchesUsed: pairs.length,
  }
}

// Splits matches into named groups, computes win rate per group
function categoricalCorrelation(
  matches: Match[],
  key: string,
  label: string,
  extract: (m: Match) => string | null,
): Signal | null {
  const groups: Record<string, Match[]> = {}
  for (const m of matches) {
    const v = extract(m)
    if (v != null) {
      if (!groups[v]) groups[v] = []
      groups[v].push(m)
    }
  }

  const entries = Object.entries(groups).filter(([, ms]) => ms.length >= 2)
  if (entries.length < 2) return null

  // Find best and worst group
  const rates = entries.map(([name, ms]) => ({ name, wr: winRate(ms), n: ms.length }))
  rates.sort((a, b) => b.wr - a.wr)
  const best = rates[0]
  const worst = rates[rates.length - 1]
  const lift = best.wr - worst.wr
  if (lift < 10) return null

  const totalMatches = entries.reduce((s, [, ms]) => s + ms.length, 0)

  return {
    key: `${key}_journal`,
    label,
    insight: `"${best.name}" boosts your win chance by ${lift}% vs "${worst.name}"`,
    detail: rates.map(r => `${r.name}: ${r.wr}% (${r.n} matches)`).join(' · '),
    category: 'journal',
    direction: 'positive',
    confidence: totalMatches >= 10 ? 'moderate' : 'low',
    lift,
    value: best.wr,
    matchesUsed: totalMatches,
  }
}

// ─── JOURNAL SIGNALS ─────────────────────────────────────────────────────────
export function computeJournalCorrelations(matches: Match[]): Signal[] {
  const withJournal = matches.filter(m => m.journal != null)
  if (withJournal.length < 5) return []

  const signals: Signal[] = []

  // ── NUMERIC CORRELATIONS (median split, "higher is better") ──────────────
  const recovery = numericCorrelation(withJournal, 'recovery', 'Recovery',
    m => m.journal?.recovery ?? null, true)
  if (recovery) signals.push(recovery)

  const composure = numericCorrelation(withJournal, 'composure', 'Composure',
    m => m.journal?.composure ?? null, true)
  if (composure) signals.push(composure)

  const focus = numericCorrelation(withJournal, 'focus', 'Focus',
    m => m.journal?.focus ?? null, true)
  if (focus) signals.push(focus)

  // Pre-match confidence (journal v2)
  const preConf = numericCorrelation(withJournal, 'pre_confidence', 'Pre-match Confidence',
    m => m.journal?.pre_confidence ?? null, true)
  if (preConf) signals.push(preConf)

  // Days since last play — lower isn't strictly better; we still split on median
  // and report which side wins. Direction is computed by numericCorrelation
  // based on the higherIsBetter flag; we flip it for rust vs rhythm.
  const daysOff = numericCorrelation(withJournal, 'days_since_last_play', 'Days Since Last Play',
    m => m.journal?.days_since_last_play ?? null, false)
  if (daysOff) signals.push(daysOff)

  // Tension — numeric; only signal if enough matches carry a value
  const tension = numericCorrelation(withJournal, 'tension_kg', 'String Tension (kg)',
    m => m.journal?.tension_kg ?? null, true)
  if (tension) signals.push(tension)

  // ── CATEGORICAL CORRELATIONS ─────────────────────────────────────────────
  const planExec = categoricalCorrelation(withJournal, 'plan_executed', 'Game Plan Execution',
    m => {
      const v = m.journal?.plan_executed
      if (!v) return null
      return v === 'Yes' || v === 'Mostly' ? 'Yes/Mostly' : 'No'
    })
  if (planExec) signals.push(planExec)

  const warmup = categoricalCorrelation(withJournal, 'warmup', 'Warmup',
    m => m.journal?.warmup ?? null)
  if (warmup) signals.push(warmup)

  const oppDiff = categoricalCorrelation(withJournal, 'opp_difficulty', 'Opponent Difficulty',
    m => m.journal?.opp_difficulty ?? null)
  if (oppDiff) signals.push(oppDiff)

  // Match vibe (journal v2) — how JD felt during the match
  const vibe = categoricalCorrelation(withJournal, 'match_vibe', 'Match Vibe',
    m => m.journal?.match_vibe ?? null)
  if (vibe) signals.push(vibe)

  // Expectation (journal v2) — pressure vs skill gap
  const expect = categoricalCorrelation(withJournal, 'expectation', 'Expectation',
    m => m.journal?.expectation ?? null)
  if (expect) signals.push(expect)

  // Racket (journal v2) — per-racket win rate
  const racket = categoricalCorrelation(withJournal, 'racket', 'Racket',
    m => m.journal?.racket ?? null)
  if (racket) signals.push(racket)

  // Match arc — start tendency
  const arcStart = categoricalCorrelation(withJournal, 'match_arc_start', 'Match Start',
    m => m.journal?.match_arc_start ?? null)
  if (arcStart) signals.push(arcStart)

  // Body state
  const body = categoricalCorrelation(withJournal, 'body_state', 'Body State',
    m => m.journal?.body_state ?? null)
  if (body) signals.push(body)

  // Decided-by frequency (not a correlation — a frequency analysis)
  const decidedCounts: Record<string, number> = {}
  let decidedTotal = 0
  for (const m of withJournal.filter(m => m.score?.winner !== 'JD')) {
    const reasons = m.journal?.decided_by
    if (Array.isArray(reasons)) {
      for (const r of reasons) {
        decidedCounts[r] = (decidedCounts[r] || 0) + 1
        decidedTotal++
      }
    }
  }
  if (decidedTotal >= 3) {
    const sorted = Object.entries(decidedCounts).sort((a, b) => b[1] - a[1])
    const top = sorted[0]
    const topPct = Math.round(top[1] / decidedTotal * 100)
    signals.push({
      key: 'decided_by_frequency',
      label: 'Loss Attribution',
      insight: `You attribute ${topPct}% of losses to "${top[0]}"`,
      detail: sorted.map(([r, n]) => `${r}: ${Math.round(n / decidedTotal * 100)}%`).join(' · '),
      category: 'journal',
      direction: 'negative',
      confidence: decidedTotal >= 8 ? 'moderate' : 'low',
      lift: 0,
      value: topPct,
      matchesUsed: withJournal.filter(m => m.score?.winner !== 'JD').length,
    })
  }

  // Sort by |lift| descending
  signals.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))

  return signals
}
