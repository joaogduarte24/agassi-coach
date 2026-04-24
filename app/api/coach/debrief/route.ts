import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { computeSignals } from '@/app/lib/signals/compute'
import { selectForDebrief } from '@/app/lib/signals/select'
import { buildDebriefPrompt } from '@/app/lib/coach/prompt'
import { validateDebriefResponse } from '@/app/lib/coach/types'
import { getCached, setCached, hashInput } from '@/app/lib/coach/cache'
import type { Match } from '@/app/types'

// Model parity with /api/extract — established working model in this codebase.
// Upgrade in lockstep when /api/extract upgrades; do not diverge.
const MODEL = 'claude-sonnet-4-20250514'

// Output tokens: each bullet is ~50 tokens, we cap at 2 bullets → 120-token
// headroom. 600 is plenty and prevents runaway output.
const MAX_TOKENS = 600

// Baseline window: last 10 matches before this one. Per CLUSTERS.md prompt
// design principles.
const BASELINE_WINDOW = 10

export async function POST(req: NextRequest) {
  try {
    const { match, allMatches } = (await req.json()) as {
      match: Match
      allMatches: Match[]
    }

    if (!match?.id) {
      return NextResponse.json({ error: 'match is required' }, { status: 400 })
    }
    if (!Array.isArray(allMatches)) {
      return NextResponse.json({ error: 'allMatches must be an array' }, { status: 400 })
    }

    // ─── PREPARE INPUTS ────────────────────────────────────────────────────
    // Recent baseline: matches strictly before this one, newest first, capped.
    const recentMatches = [...allMatches]
      .filter(m => m.id !== match.id && m.date <= match.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, BASELINE_WINDOW)

    // Filtered career signals (same selector as the UI uses).
    const signalSet = computeSignals(allMatches)
    const filteredSignals = selectForDebrief(signalSet.correlations)

    const promptInput = { match, recentMatches, filteredSignals }
    const cacheKey = hashInput({ surface: 'debrief', match, recentMatches, filteredSignals })

    // ─── CACHE LOOKUP ──────────────────────────────────────────────────────
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ ...((cached as object) || {}), cached: true })
    }

    // ─── CALL CLAUDE ───────────────────────────────────────────────────────
    const prompt = buildDebriefPrompt(promptInput)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const started = Date.now()
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    })
    const elapsedMs = Date.now() - started

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Model did not return JSON', raw: text.slice(0, 500) },
        { status: 502 }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (e) {
      return NextResponse.json(
        { error: 'Malformed JSON from model', raw: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const validated = validateDebriefResponse(parsed)
    if (!validated) {
      return NextResponse.json(
        { error: 'Model output failed shape validation', raw: parsed },
        { status: 502 }
      )
    }

    // ─── CACHE + RESPOND ───────────────────────────────────────────────────
    const response = {
      patterns: validated.patterns,
      meta: {
        model: MODEL,
        elapsed_ms: elapsedMs,
        input_signals: filteredSignals.length,
        baseline_matches: recentMatches.length,
        usage: message.usage,
      },
    }

    // Fire-and-forget cache write. Don't block the response.
    setCached({
      cacheKey,
      surface: 'debrief',
      payload: response,
      matchId: match.id,
      opponentId: match.opponent?.name ?? null,
    }).catch(() => {})

    return NextResponse.json({ ...response, cached: false })
  } catch (err: any) {
    console.error('[coach/debrief] error:', err)
    return NextResponse.json({ error: err?.message || 'debrief failed' }, { status: 500 })
  }
}
