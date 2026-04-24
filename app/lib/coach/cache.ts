import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
// Same pattern as app/api/opponents/route.ts — dev fallback when env is absent.
const DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── STABLE HASHING ──────────────────────────────────────────────────────────
/**
 * Recursively sort object keys so `JSON.stringify` produces a canonical form.
 * Two payloads with the same content but different key order hash identically.
 * Arrays preserve order (order matters for signal rankings).
 */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const obj = value as Record<string, unknown>
  return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = canonicalize(obj[k])
    return acc
  }, {})
}

export function hashInput(payload: unknown): string {
  const canonical = JSON.stringify(canonicalize(payload))
  return createHash('sha256').update(canonical).digest('hex')
}

// ─── CACHE SHAPE ─────────────────────────────────────────────────────────────
export type CoachCacheSurface = 'pre-match' | 'debrief'

export type CoachCacheRow = {
  cache_key: string
  surface: CoachCacheSurface
  payload: unknown
  match_id: string | null
  opponent_id: string | null
  created_at: string
}

// ─── GET ─────────────────────────────────────────────────────────────────────
/**
 * Look up a cached response by its input hash. Returns null on miss, on error,
 * or in DEV_MODE. Never throws — caching is a quality enhancement, not a
 * correctness gate.
 */
export async function getCached(cacheKey: string): Promise<unknown | null> {
  if (DEV_MODE) return null
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('coach_cache')
      .select('payload')
      .eq('cache_key', cacheKey)
      .maybeSingle()
    if (error) {
      console.warn('[coach_cache] get error:', error.message)
      return null
    }
    return data?.payload ?? null
  } catch (e) {
    console.warn('[coach_cache] get exception:', e)
    return null
  }
}

// ─── SET ─────────────────────────────────────────────────────────────────────
export async function setCached(args: {
  cacheKey: string
  surface: CoachCacheSurface
  payload: unknown
  matchId?: string | null
  opponentId?: string | null
}): Promise<void> {
  if (DEV_MODE) return
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('coach_cache').upsert({
      cache_key: args.cacheKey,
      surface: args.surface,
      payload: args.payload,
      match_id: args.matchId ?? null,
      opponent_id: args.opponentId ?? null,
    })
    if (error) console.warn('[coach_cache] set error:', error.message)
  } catch (e) {
    console.warn('[coach_cache] set exception:', e)
  }
}

// ─── INVALIDATE ──────────────────────────────────────────────────────────────
/**
 * Drop all cached responses tied to a match. Call from match update/delete
 * paths so stale coaching doesn't linger after JD edits a journal.
 */
export async function invalidateForMatch(matchId: string): Promise<void> {
  if (DEV_MODE) return
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('coach_cache').delete().eq('match_id', matchId)
    if (error) console.warn('[coach_cache] invalidate match error:', error.message)
  } catch (e) {
    console.warn('[coach_cache] invalidate match exception:', e)
  }
}

/**
 * Drop all cached responses tied to an opponent. Call from opponents PUT path
 * so opponent scouting edits invalidate pre-match briefs vs that opponent.
 */
export async function invalidateForOpponent(opponentId: string): Promise<void> {
  if (DEV_MODE) return
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('coach_cache').delete().eq('opponent_id', opponentId)
    if (error) console.warn('[coach_cache] invalidate opp error:', error.message)
  } catch (e) {
    console.warn('[coach_cache] invalidate opp exception:', e)
  }
}
