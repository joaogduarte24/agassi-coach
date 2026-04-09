/**
 * Tempo helper — how fast does JD play?
 *
 * Composite of:
 *   - Avg 1st serve speed (km/h)
 *   - Avg groundstroke speed (FH + BH, CC + DTL)
 *   - Optional rally length from xlsx-only `shot_stats.rally_mean` if present
 *
 * Compared against the typical UTR-band median (synthetic v1) to produce a
 * verdict: Above pace / On pace / Below pace.
 */
import type { Match } from '@/app/types'

export type TempoResult = {
  serveSpeed: number | null     // avg 1st serve km/h
  rallySpeed: number | null     // avg groundstroke km/h
  rallyMean: number | null      // avg rally length (xlsx only)
  bandRallySpeed: number | null // synthetic v1 band ref
  paceDelta: number | null      // rallySpeed - bandRallySpeed
  label: 'Above pace' | 'On pace' | 'Below pace' | 'Unknown'
  insight: string
} | null

function avg(arr: (number | null | undefined)[]): number | null {
  const v = arr.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

// Synthetic baseline rally pace per UTR band (km/h on the FH/BH side).
// These are placeholder reference points until we have real crowdsource data.
const BAND_RALLY_PACE: Record<string, number> = {
  '3.0-3.5': 75,
  '3.5-4.0': 82,
  '4.0-4.5': 88,
  '4.5-5.0': 94,
  '5.0-5.5': 100,
  '5.5-6.0': 105,
  '6.0-6.5': 110,
  '6.5-7.0': 114,
  '7.0-7.5': 118,
  '7.5-8.0': 122,
}

function utrToBand(utr: number | null): string | null {
  if (utr == null) return null
  const lo = (Math.floor(utr * 2) / 2).toFixed(1)
  const hi = (Math.floor(utr * 2) / 2 + 0.5).toFixed(1)
  return `${lo}-${hi}`
}

export function computeTempo(matches: Match[], utr: number | null): TempoResult {
  const serveSpeed = avg(matches.flatMap(m => [
    m.serve?.first?.spd_ad,
    m.serve?.first?.spd_deuce,
  ]))

  const rallySpeed = avg(matches.flatMap(m => [
    m.forehand?.spd_cc,
    m.forehand?.spd_dtl,
    m.backhand?.spd_cc,
    m.backhand?.spd_dtl,
  ]))

  const rallyMean = avg(matches.map(m => (m.shot_stats as any)?.rally_mean))

  const band = utrToBand(utr)
  const bandRally = band ? (BAND_RALLY_PACE[band] ?? null) : null

  if (rallySpeed == null) {
    return {
      serveSpeed,
      rallySpeed: null,
      rallyMean,
      bandRallySpeed: bandRally,
      paceDelta: null,
      label: 'Unknown',
      insight: 'Not enough groundstroke pace data yet.',
    }
  }

  const delta = bandRally != null ? rallySpeed - bandRally : null
  let label: 'Above pace' | 'On pace' | 'Below pace' = 'On pace'
  if (delta != null) {
    if (delta >= 4) label = 'Above pace'
    else if (delta <= -4) label = 'Below pace'
  }

  const subParts = [
    `${rallySpeed} km/h`,
    delta != null ? `${delta > 0 ? '+' : ''}${delta} vs band` : null,
  ].filter(Boolean)

  return {
    serveSpeed,
    rallySpeed,
    rallyMean,
    bandRallySpeed: bandRally,
    paceDelta: delta,
    label,
    insight: subParts.join(' · '),
  }
}
