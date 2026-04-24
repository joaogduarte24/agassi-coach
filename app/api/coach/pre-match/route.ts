import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { computeSignals } from '@/app/lib/signals/compute'
import { selectForPreMatch } from '@/app/lib/signals/select'
import { buildPreMatchPrompt, type PreMatchPromptInput } from '@/app/lib/coach/prompt'
import { validateDebriefResponse } from '@/app/lib/coach/types'
import { getCached, setCached, hashInput } from '@/app/lib/coach/cache'
import type { Match } from '@/app/types'

// Model parity with /api/extract + /api/coach/debrief — move in lockstep.
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 600
const JD_BASELINE_WINDOW = 10

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      opponent: PreMatchPromptInput['opponent']
      allMatches: Match[]
      surface?: string | null
    }
    const { opponent, allMatches, surface } = body

    if (!opponent?.name) {
      return NextResponse.json({ error: 'opponent.name is required' }, { status: 400 })
    }
    if (!Array.isArray(allMatches)) {
      return NextResponse.json({ error: 'allMatches must be an array' }, { status: 400 })
    }

    // ─── SPLIT ALL MATCHES INTO H2H + JD BASELINE ──────────────────────────
    const opponentMatches = allMatches.filter(m => m.opponent?.name === opponent.name)
    const jdRecentMatches = [...allMatches]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, JD_BASELINE_WINDOW)

    // Filtered career signals using pre-match selector (specificity ≥ 0.6,
    // in-match actionable only, non-tautological).
    const signalSet = computeSignals(allMatches)
    const filteredSignals = selectForPreMatch(signalSet.correlations)

    const promptInput: PreMatchPromptInput = {
      opponent,
      jdRecentMatches,
      opponentMatches,
      filteredSignals,
      surface: surface ?? null,
    }
    const cacheKey = hashInput({
      surface: 'pre-match',
      opponent,
      opponentMatches,
      jdRecentMatches,
      filteredSignals,
      matchSurface: surface ?? null,
    })

    // ─── CACHE LOOKUP ──────────────────────────────────────────────────────
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ ...((cached as object) || {}), cached: true })
    }

    // ─── CALL CLAUDE ───────────────────────────────────────────────────────
    const prompt = buildPreMatchPrompt(promptInput)
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
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON from model', raw: text.slice(0, 500) },
        { status: 502 }
      )
    }

    // Pre-match reuses DebriefResponse shape — same {patterns: [{pattern,
    // evidence, adjustment}]}. Different context in the content, same contract
    // on the wire. CoachesRead renders both identically.
    const validated = validateDebriefResponse(parsed)
    if (!validated) {
      return NextResponse.json(
        { error: 'Model output failed shape validation', raw: parsed },
        { status: 502 }
      )
    }

    const response = {
      patterns: validated.patterns,
      meta: {
        model: MODEL,
        elapsed_ms: elapsedMs,
        input_signals: filteredSignals.length,
        h2h_matches: opponentMatches.length,
        jd_recent: jdRecentMatches.length,
        usage: message.usage,
      },
    }

    setCached({
      cacheKey,
      surface: 'pre-match',
      payload: response,
      matchId: null,
      opponentId: opponent.name,
    }).catch(() => {})

    return NextResponse.json({ ...response, cached: false })
  } catch (err: any) {
    console.error('[coach/pre-match] error:', err)
    return NextResponse.json({ error: err?.message || 'pre-match failed' }, { status: 500 })
  }
}
