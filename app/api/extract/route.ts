import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const { images, oppName, oppUtr, surface } = await req.json()

    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    const prompt = `You are extracting tennis stats from SwingVision screenshots for João Duarte (JD).
Extract ALL visible data and return ONLY valid JSON.

Opponent: ${oppName || 'Unknown'}, UTR: ${oppUtr || 'null'}, Surface: ${surface || 'Clay'}
Today's date if not visible in screenshots: ${new Date().toISOString().split('T')[0]}

Return this exact JSON structure (use null for any field not visible):
{
  "date": "YYYY-MM-DD",
  "opponent": {"name": "string", "utr": number_or_null},
  "surface": "string",
  "score": {
    "sets": "X-Y Z-W",
    "sets_arr": [[X,Y],[Z,W]],
    "winner": "JD or opponent"
  },
  "serve": {
    "first": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n},
    "second": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n}
  },
  "return": {
    "first": {"pct_ad": n, "pct_deuce": n, "spd": n, "deep_ad": n, "deep_deuce": n},
    "second": {"pct_ad": n, "pct_deuce": n, "spd": n, "deep_ad": n, "deep_deuce": n}
  },
  "forehand": {"cc_in": n, "dtl_in": n, "spd_cc": n, "spd_dtl": n, "depth_cc": n, "depth_dtl": n},
  "backhand": {"cc_in": n, "dtl_in": n, "spd_cc": n, "spd_dtl": n, "depth_cc": n, "depth_dtl": n},
  "shot_stats": {"winners": n, "ue": n, "df": n, "bp_saved_pct": n, "bp_won_pct": n},
  "what_worked": ["insight 1", "insight 2", "insight 3"],
  "what_didnt": ["issue 1", "issue 2", "issue 3"],
  "key_number": "single most diagnostic stat and why it mattered"
}

For what_worked, what_didnt, key_number: be Brad Gilbert. Direct, data-first, no fluff.
IMPORTANT: Return ONLY the JSON object. No preamble, no explanation, no markdown.`

    const content: any[] = [
      ...images.map((img: { data: string; type: string }) => ({
        type: 'image',
        source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data }
      })),
      { type: 'text', text: prompt }
    ]

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON robustly
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])

    // Override with user-provided values
    if (oppName) parsed.opponent.name = oppName
    if (oppUtr) parsed.opponent.utr = parseFloat(oppUtr)
    if (surface) parsed.surface = surface

    // Generate stable ID
    const slugName = (parsed.opponent?.name || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    parsed.id = `${parsed.date}-${slugName}`

    return NextResponse.json({ match: parsed })
  } catch (err: any) {
    console.error('Extract error:', err)
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}
