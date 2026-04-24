'use client'

// CoachesRead — AI-generated in-match coaching for a specific match.
// Fetches POST /api/coach/debrief on mount, renders 1-2 patterns with
// adjustments (in-match cues, not training drills).
//
// States:
//   - loading: subtle placeholder ("Coach is thinking…")
//   - error / empty: render nothing (failure is silent — rule-based diagnosis
//     + Phase-1 filtered Patterns section below handle the degraded case)
//   - success: 1-2 pattern cards with pattern / evidence / adjustment
//
// Data is not cached client-side. Server caches via Supabase coach_cache
// keyed on input-payload hash, so reopening the same match hits cache.

import { useEffect, useState } from 'react'
import type { Match } from '@/app/types'
import { G, A, FONT_BODY, FONT_DATA, FONT_DISPLAY, MUTED } from '@/app/lib/helpers'
import type { DebriefBullet, DebriefResponse } from '@/app/lib/coach/types'

interface Props {
  match: Match
  allMatches: Match[]
}

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; data: DebriefResponse; meta?: { cached?: boolean; elapsed_ms?: number } }

export default function CoachesRead({ match, allMatches }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    fetch('/api/coach/debrief', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ match, allMatches }),
    })
      .then(async r => {
        const body = await r.json()
        if (cancelled) return
        if (!r.ok || !body.patterns) {
          setState({ kind: 'error', message: body.error || `status ${r.status}` })
          return
        }
        setState({
          kind: 'success',
          data: { patterns: body.patterns as DebriefBullet[] },
          meta: { cached: body.cached, elapsed_ms: body.meta?.elapsed_ms },
        })
      })
      .catch(e => {
        if (!cancelled) setState({ kind: 'error', message: e?.message || 'network error' })
      })
    return () => {
      cancelled = true
    }
    // Re-fetch if match id changes. Array contents don't need to retrigger —
    // cache key on server is input-hash so unchanged data = cache hit anyway.
  }, [match.id])

  if (state.kind === 'loading') {
    return (
      <div style={{
        background: '#141414',
        border: `1px solid ${BORDER_FAINT}`,
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: 24,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 2, color: MUTED, textTransform: 'uppercase',
          fontFamily: FONT_DATA, marginBottom: 8,
        }}>
          Coach
        </div>
        <div style={{ fontSize: 13, color: '#777', fontFamily: FONT_BODY, fontStyle: 'italic' }}>
          Reading the tape…
        </div>
      </div>
    )
  }

  // Silent failure — existing rule-based diagnosis + Phase 1 Patterns below
  // cover the degraded experience. Don't show an error card.
  if (state.kind === 'error') return null

  const patterns = state.data.patterns
  if (!patterns.length) return null

  return (
    <div style={{
      background: '#141414',
      border: `1px solid ${BORDER_ACCENT}`,
      borderRadius: 16,
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 2, color: G, textTransform: 'uppercase', fontFamily: FONT_DATA,
        }}>
          Coach — on court next time
        </div>
        {state.meta?.cached === false && state.meta.elapsed_ms != null && (
          <div style={{ fontSize: 9, fontFamily: FONT_DATA, color: '#444' }}>
            fresh · {Math.round(state.meta.elapsed_ms / 100) / 10}s
          </div>
        )}
      </div>

      {patterns.map((p, i) => (
        <PatternRow key={i} bullet={p} isLast={i === patterns.length - 1} />
      ))}
    </div>
  )
}

function PatternRow({ bullet, isLast }: { bullet: DebriefBullet; isLast: boolean }) {
  return (
    <div style={{
      paddingBottom: isLast ? 0 : 14,
      marginBottom: isLast ? 0 : 14,
      borderBottom: isLast ? 'none' : `1px solid ${BORDER_FAINT}`,
    }}>
      {/* Pattern — what happened, as the header */}
      <div style={{
        fontFamily: FONT_BODY, fontSize: 14, color: '#e8d5b0', fontWeight: 600,
        lineHeight: 1.45, marginBottom: 8,
      }}>
        {bullet.pattern}
      </div>

      {/* Evidence — muted, mono-ish */}
      <div style={{
        fontFamily: FONT_DATA, fontSize: 11, color: '#888', lineHeight: 1.5, marginBottom: 10,
      }}>
        {bullet.evidence}
      </div>

      {/* Adjustment — the in-match cue, styled prominently */}
      <div style={{
        background: 'rgba(74,222,128,0.05)',
        borderLeft: `3px solid ${G}`,
        padding: '8px 12px',
        borderRadius: 4,
      }}>
        <div style={{
          fontSize: 9, fontFamily: FONT_DATA, fontWeight: 700, letterSpacing: 2,
          textTransform: 'uppercase', color: G, marginBottom: 4,
        }}>
          Next time on court
        </div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 13, color: '#ddd', lineHeight: 1.5,
        }}>
          {bullet.adjustment}
        </div>
      </div>
    </div>
  )
}

// Local style constants (hoist if they spread)
const BORDER_FAINT = 'rgba(255,255,255,0.06)'
const BORDER_ACCENT = 'rgba(74,222,128,0.15)'
