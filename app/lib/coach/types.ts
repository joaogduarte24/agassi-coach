// Types for the AI coaching layer (Phase 2). Kept separate from signals/types.ts
// because the coaching layer is a consumer of signals, not a producer.

export type DebriefBullet = {
  /** What happened in this match, tied to a broader JD pattern when possible. */
  pattern: string
  /** Specific numbers from this match + career context, proving the pattern. */
  evidence: string
  /** Concrete training prescription: name, pace, reps, target. Not generic advice. */
  drill: string
}

export type DebriefResponse = {
  /** 1–2 match-deciding patterns. Never more. */
  patterns: DebriefBullet[]
}

// ─── HAND-ROLLED VALIDATION ──────────────────────────────────────────────────
// Zod would be idiomatic but adds a dep. Output shape is tiny enough that
// hand-rolled guards are fine and make the contract readable at a glance.
// If the project adds Zod later, the `validate*` functions are the migration
// points.

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function validateDebriefBullet(raw: unknown): DebriefBullet | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isNonEmptyString(r.pattern)) return null
  if (!isNonEmptyString(r.evidence)) return null
  if (!isNonEmptyString(r.drill)) return null
  return { pattern: r.pattern, evidence: r.evidence, drill: r.drill }
}

/**
 * Parse + validate the model's raw JSON response into a DebriefResponse.
 * Returns null if the shape is unrecoverable (caller falls back to Phase-1
 * filtered signal list). Caps patterns at 2 — if the model returns more,
 * extras are dropped rather than rejected (models over-produce more often
 * than they under-produce).
 */
export function validateDebriefResponse(raw: unknown): DebriefResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.patterns)) return null
  const patterns: DebriefBullet[] = []
  for (const p of r.patterns) {
    const ok = validateDebriefBullet(p)
    if (ok) patterns.push(ok)
    if (patterns.length >= 2) break
  }
  if (patterns.length === 0) return null
  return { patterns }
}

// ─── INLINE SELF-CHECKS ──────────────────────────────────────────────────────
export function _selfCheck(): { passed: number; failed: string[] } {
  const failed: string[] = []
  let passed = 0

  const good = { pattern: 'p', evidence: 'e', drill: 'd' }
  const ok = validateDebriefResponse({ patterns: [good] })
  ok?.patterns.length === 1 ? passed++ : failed.push('valid single pattern should validate')

  // Empty array → null
  validateDebriefResponse({ patterns: [] }) === null ? passed++ : failed.push('empty patterns array should return null')

  // Missing field → null
  validateDebriefResponse({ patterns: [{ pattern: 'p', evidence: 'e' }] }) === null ? passed++ : failed.push('missing field should return null')

  // Over-produces 3 → capped at 2
  const capped = validateDebriefResponse({ patterns: [good, good, good] })
  capped?.patterns.length === 2 ? passed++ : failed.push('over-produced patterns should cap at 2')

  // Mixed valid/invalid — take only valid ones, cap 2
  const mixed = validateDebriefResponse({ patterns: [good, { pattern: 'only' }, good] })
  mixed?.patterns.length === 2 ? passed++ : failed.push('mixed valid/invalid should filter + cap')

  // Completely wrong shape → null
  validateDebriefResponse('garbage') === null ? passed++ : failed.push('non-object should return null')
  validateDebriefResponse({ nope: true }) === null ? passed++ : failed.push('missing patterns key should return null')

  return { passed, failed }
}
