/**
 * Stamina helper — does JD's level hold up across long matches?
 *
 * Two stats:
 *  1. Set 1 vs Set 3 win rate — across matches that went 3 sets, how often
 *     did JD win the third set?
 *  2. 3-set match record — overall record in matches that went the distance.
 *
 * Returns null if N < 3 three-set matches (too noisy).
 */
import type { Match } from '@/app/types'

export type StaminaResult = {
  threeSetMatches: number
  threeSetWins: number
  threeSetLosses: number
  threeSetWinPct: number       // 0..100
  set1WinPct: number | null    // % of all matches where JD won set 1
  finalSetWinPct: number | null // % of 3-setters where JD won set 3
  insight: string              // human-readable
} | null

function setWinner(set: [number, number]): 'jd' | 'opp' {
  return set[0] > set[1] ? 'jd' : 'opp'
}

export function computeStamina(matches: Match[]): StaminaResult {
  // Set 1 win rate (across all matches with set data)
  const withSets = matches.filter(m => m.score?.sets_arr && m.score.sets_arr.length > 0)
  const set1Won = withSets.filter(m => setWinner(m.score.sets_arr![0]) === 'jd').length
  const set1Pct = withSets.length ? Math.round((set1Won / withSets.length) * 100) : null

  // 3-set matches
  const threeSet = matches.filter(m => m.score?.sets_arr && m.score.sets_arr.length === 3)
  if (threeSet.length < 3) {
    return {
      threeSetMatches: threeSet.length,
      threeSetWins: 0,
      threeSetLosses: 0,
      threeSetWinPct: 0,
      set1WinPct: set1Pct,
      finalSetWinPct: null,
      insight: 'Not enough 3-set matches to read stamina yet.',
    }
  }

  const wins = threeSet.filter(m => m.score?.winner === 'JD').length
  const losses = threeSet.length - wins
  const winPct = Math.round((wins / threeSet.length) * 100)

  // Final set win rate (in 3-setters)
  const finalSetWon = threeSet.filter(m => setWinner(m.score.sets_arr![2]) === 'jd').length
  const finalSetPct = Math.round((finalSetWon / threeSet.length) * 100)

  let label: string
  if (winPct >= 65) label = 'Holds late'
  else if (winPct >= 45) label = 'Even fade'
  else label = 'Drops late'

  const insight = `${wins}-${losses} in 3-setters · ${finalSetPct}% set 3 wins`

  return {
    threeSetMatches: threeSet.length,
    threeSetWins: wins,
    threeSetLosses: losses,
    threeSetWinPct: winPct,
    set1WinPct: set1Pct,
    finalSetWinPct: finalSetPct,
    insight: `${label} — ${insight}`,
  }
}
