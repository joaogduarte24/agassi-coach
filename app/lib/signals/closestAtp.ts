/**
 * Closest ATP player to JD based on stat-profile similarity.
 *
 * Uses normalized euclidean distance over a small set of distinguishing traits.
 * Returns the single nearest ATP_PLAYERS entry + distance + the dimensions
 * that drove the match (so the UI can show evidence).
 *
 * NOTE: ATP_PLAYERS is currently 10 men's top-10 players. The pool is small and
 * elite — JD's "closest ATP" should be read as "most similar profile shape",
 * not "you play at this level". Copy in the UI must reflect that.
 */
import { ATP_PLAYERS, type ATPPlayer } from '@/lib/atp-players'
import type { Match } from '@/app/types'

// ─── Trait extraction ────────────────────────────────────────────────────────

type Trait = {
  key: string
  label: string
  weight: number     // higher = matters more in distance
  // Range used to normalize. Distance is computed in [0..1] space.
  min: number
  max: number
}

// 8 traits chosen for shape, not raw level. Things that say WHAT KIND of player
// you are, not how good you are.
const TRAITS: Trait[] = [
  { key: 'first_serve_pct',  label: '1st serve %',    weight: 1.0, min: 40,  max: 80  },
  { key: 'first_serve_spd',  label: '1st serve pace', weight: 1.0, min: 140, max: 220 },
  { key: 'second_serve_spd', label: '2nd serve pace', weight: 0.8, min: 100, max: 180 },
  { key: 'fh_cc_in',         label: 'FH CC in %',     weight: 0.9, min: 50,  max: 100 },
  { key: 'fh_dtl_in',        label: 'FH DTL in %',    weight: 0.7, min: 40,  max: 100 },
  { key: 'bh_cc_in',         label: 'BH CC in %',     weight: 0.9, min: 50,  max: 100 },
  { key: 'bh_dtl_in',        label: 'BH DTL in %',    weight: 0.7, min: 40,  max: 100 },
  { key: 'fh_bias',          label: 'FH-heavy bias',  weight: 0.6, min: -20, max: 20  }, // fh_pace - bh_pace
]

type TraitVec = Record<string, number | null>

function avg(arr: (number | null | undefined)[]): number | null {
  const v = arr.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** Pull a single trait vector from a list of matches (career averages). */
export function jdTraitVector(matches: Match[]): TraitVec {
  const fhPaceCC = avg(matches.map(m => m.forehand?.spd_cc))
  const fhPaceDTL = avg(matches.map(m => m.forehand?.spd_dtl))
  const bhPaceCC = avg(matches.map(m => m.backhand?.spd_cc))
  const bhPaceDTL = avg(matches.map(m => m.backhand?.spd_dtl))
  const fhPace = avg([fhPaceCC, fhPaceDTL])
  const bhPace = avg([bhPaceCC, bhPaceDTL])

  const s1Ad = avg(matches.map(m => m.serve?.first?.pct_ad))
  const s1Du = avg(matches.map(m => m.serve?.first?.pct_deuce))
  const s1SpdAd = avg(matches.map(m => m.serve?.first?.spd_ad))
  const s1SpdDu = avg(matches.map(m => m.serve?.first?.spd_deuce))
  const s2SpdAd = avg(matches.map(m => m.serve?.second?.spd_ad))
  const s2SpdDu = avg(matches.map(m => m.serve?.second?.spd_deuce))

  return {
    first_serve_pct:  avg([s1Ad, s1Du]),
    first_serve_spd:  avg([s1SpdAd, s1SpdDu]),
    second_serve_spd: avg([s2SpdAd, s2SpdDu]),
    fh_cc_in:         avg(matches.map(m => m.forehand?.cc_in)),
    fh_dtl_in:        avg(matches.map(m => m.forehand?.dtl_in)),
    bh_cc_in:         avg(matches.map(m => m.backhand?.cc_in)),
    bh_dtl_in:        avg(matches.map(m => m.backhand?.dtl_in)),
    fh_bias:          fhPace != null && bhPace != null ? fhPace - bhPace : null,
  }
}

function atpTraitVector(p: ATPPlayer): TraitVec {
  const fhPace = (p.forehand.spd_cc + p.forehand.spd_dtl) / 2
  const bhPace = (p.backhand.spd_cc + p.backhand.spd_dtl) / 2
  return {
    first_serve_pct:  (p.serve.first.pct_ad + p.serve.first.pct_deuce) / 2,
    first_serve_spd:  (p.serve.first.spd_ad + p.serve.first.spd_deuce) / 2,
    second_serve_spd: (p.serve.second.spd_ad + p.serve.second.spd_deuce) / 2,
    fh_cc_in:         p.forehand.cc_in,
    fh_dtl_in:        p.forehand.dtl_in,
    bh_cc_in:         p.backhand.cc_in,
    bh_dtl_in:        p.backhand.dtl_in,
    fh_bias:          fhPace - bhPace,
  }
}

// ─── Distance ────────────────────────────────────────────────────────────────

function norm(v: number, t: Trait): number {
  return Math.max(0, Math.min(1, (v - t.min) / (t.max - t.min)))
}

/**
 * Weighted euclidean distance over the 8 traits, ignoring traits where JD
 * has no data. Range is roughly [0, ~2.5] — lower = more similar.
 */
function distance(jd: TraitVec, atp: TraitVec): { d: number; usedTraits: number } {
  let sum = 0
  let weightTotal = 0
  let used = 0
  for (const t of TRAITS) {
    const a = jd[t.key]
    const b = atp[t.key]
    if (a == null || b == null) continue
    const diff = norm(a, t) - norm(b, t)
    sum += diff * diff * t.weight
    weightTotal += t.weight
    used++
  }
  if (used === 0 || weightTotal === 0) return { d: Infinity, usedTraits: 0 }
  return { d: Math.sqrt(sum / weightTotal), usedTraits: used }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ClosestAtpResult = {
  player: ATPPlayer
  distance: number          // 0 = identical, ~1 = very different
  similarity: number        // 0..100, friendlier display
  matchedTraits: number     // how many of the 8 traits had data on both sides
  topMatchingTraits: { label: string; jd: number; atp: number; gap: number }[]
} | null

/**
 * Returns the ATP player closest in stat-profile shape to JD.
 * Returns null if JD has fewer than 3 traits with data (not enough signal).
 */
export function closestAtp(matches: Match[]): ClosestAtpResult {
  if (matches.length === 0) return null
  const jd = jdTraitVector(matches)

  let best: { player: ATPPlayer; d: number; used: number } | null = null
  for (const p of ATP_PLAYERS) {
    const atp = atpTraitVector(p)
    const { d, usedTraits } = distance(jd, atp)
    if (usedTraits < 3) continue
    if (!best || d < best.d) best = { player: p, d, used: usedTraits }
  }
  if (!best) return null

  // Find the 3 traits where JD and the matched player are closest (the "why")
  const atpVec = atpTraitVector(best.player)
  const traitGaps = TRAITS
    .map(t => {
      const a = jd[t.key]
      const b = atpVec[t.key]
      if (a == null || b == null) return null
      return { label: t.label, jd: a, atp: b, gap: Math.abs(norm(a, t) - norm(b, t)) }
    })
    .filter((x): x is { label: string; jd: number; atp: number; gap: number } => x != null)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3)

  return {
    player: best.player,
    distance: best.d,
    similarity: Math.round(Math.max(0, 100 - best.d * 100)),
    matchedTraits: best.used,
    topMatchingTraits: traitGaps,
  }
}
