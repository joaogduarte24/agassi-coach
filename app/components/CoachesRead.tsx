'use client'

// CoachesRead — AI-generated in-match coaching, shared by debrief + pre-match.
//
// Fetches POST /api/coach/{debrief|pre-match} on mount, renders 1-3 patterns
// with adjustments (in-match cues, not training drills).
//
// States:
//   - loading: subtle placeholder ("Reading the tape…" | "Scouting…")
//   - error / empty: render nothing (failure is silent — rule-based diagnosis
//     + Phase-1 filtered Patterns section cover the degraded case)
//   - success: 1-3 pattern cards with pattern / evidence / adjustment
//
// Server caches both surfaces in Supabase coach_cache. Re-mounting with the
// same inputs hits cache in ~130ms vs ~8s cold.

import { useEffect, useState } from 'react'
import type { Match } from '@/app/types'
import { G, FONT_BODY, FONT_DATA, MUTED } from '@/app/lib/helpers'
import type { DebriefBullet, DebriefResponse } from '@/app/lib/coach/types'

type DebriefProps = {
  mode: 'debrief'
  match: Match
  allMatches: Match[]
}

type PreMatchProps = {
  mode: 'pre-match'
  opponent: {
    name: string
    utr: number | null
    style?: string | null
    weapon?: string | null
    weakness?: string | null
    notes?: string | null
    lefty?: boolean
  }
  allMatches: Match[]
  surface?: string | null
}

type Props = DebriefProps | PreMatchProps

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; data: DebriefResponse; meta?: { cached?: boolean; elapsed_ms?: number } }

export default function CoachesRead(props: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  // Depend on the identifying keys — match.id for debrief, opponent.name for
  // pre-match. Changes to allMatches array reference don't retrigger (server
  // cache key covers content-level changes via hashInput).
  const depKey =
    props.mode === 'debrief'
      ? `debrief:${props.match.id}`
      : `pre-match:${props.opponent.name}:${props.opponent.utr ?? ''}:${props.surface ?? ''}`

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })

    const endpoint = props.mode === 'debrief' ? '/api/coach/debrief' : '/api/coach/pre-match'
    const body =
      props.mode === 'debrief'
        ? { match: props.match, allMatches: props.allMatches }
        : { opponent: props.opponent, allMatches: props.allMatches, surface: props.surface }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async r => {
        const json = await r.json()
        if (cancelled) return
        if (!r.ok || !json.patterns) {
          setState({ kind: 'error', message: json.error || `status ${r.status}` })
          return
        }
        setState({
          kind: 'success',
          data: { patterns: json.patterns as DebriefBullet[] },
          meta: { cached: json.cached, elapsed_ms: json.meta?.elapsed_ms },
        })
      })
      .catch(e => {
        if (!cancelled) setState({ kind: 'error', message: e?.message || 'network error' })
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey])

  const mode = props.mode
  const headerLabel = mode === 'debrief' ? 'Coach — on court next time' : 'Coach — game plan'
  const loadingText = mode === 'debrief' ? 'Reading the tape…' : 'Scouting the opponent…'
  const adjustmentLabel = mode === 'debrief' ? 'Next time on court' : 'On court today'

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
          {loadingText}
        </div>
      </div>
    )
  }

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
          {headerLabel}
        </div>
        {state.meta?.cached === false && state.meta.elapsed_ms != null && (
          <div style={{ fontSize: 9, fontFamily: FONT_DATA, color: '#444' }}>
            fresh · {Math.round(state.meta.elapsed_ms / 100) / 10}s
          </div>
        )}
      </div>

      {patterns.map((p, i) => (
        <PatternRow key={i} bullet={p} isLast={i === patterns.length - 1} adjustmentLabel={adjustmentLabel} />
      ))}
    </div>
  )
}

function PatternRow({
  bullet,
  isLast,
  adjustmentLabel,
}: {
  bullet: DebriefBullet
  isLast: boolean
  adjustmentLabel: string
}) {
  return (
    <div style={{
      paddingBottom: isLast ? 0 : 14,
      marginBottom: isLast ? 0 : 14,
      borderBottom: isLast ? 'none' : `1px solid ${BORDER_FAINT}`,
    }}>
      <div style={{
        fontFamily: FONT_BODY, fontSize: 14, color: '#e8d5b0', fontWeight: 600,
        lineHeight: 1.45, marginBottom: 8,
      }}>
        {bullet.pattern}
      </div>

      <div style={{
        fontFamily: FONT_DATA, fontSize: 11, color: '#888', lineHeight: 1.5, marginBottom: 10,
      }}>
        {bullet.evidence}
      </div>

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
          {adjustmentLabel}
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

const BORDER_FAINT = 'rgba(255,255,255,0.06)'
const BORDER_ACCENT = 'rgba(74,222,128,0.15)'
