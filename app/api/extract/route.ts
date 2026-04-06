import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

// ─── EXTRACTION VALIDATION ──────────────────────────────────────────────────
// Null out any extracted value outside expected ranges.
// Screenshots are Tier 2 ground truth — bad values here poison everything downstream.
function validateExtraction(data: any): any {
  const clampPct = (v: any) => typeof v === 'number' && v >= 0 && v <= 100 ? v : null
  const clampSpeed = (v: any) => typeof v === 'number' && v >= 30 && v <= 250 ? v : null
  const clampCount = (v: any) => typeof v === 'number' && v >= 0 && v <= 500 ? Math.round(v) : null
  const clampGameScore = (v: any) => typeof v === 'number' && v >= 0 && v <= 7 ? v : null

  // Validate serve/return/forehand/backhand slot structures
  const validateSlot = (slot: any, hasDeep = false) => {
    if (!slot || typeof slot !== 'object') return slot
    return {
      ...slot,
      pct_ad: clampPct(slot.pct_ad),
      pct_deuce: clampPct(slot.pct_deuce),
      spd_ad: clampSpeed(slot.spd_ad),
      spd_deuce: clampSpeed(slot.spd_deuce),
      ...(hasDeep ? { deep_ad: clampPct(slot.deep_ad), deep_deuce: clampPct(slot.deep_deuce) } : {}),
    }
  }

  const validateGroundstroke = (gs: any) => {
    if (!gs || typeof gs !== 'object') return gs
    return {
      ...gs,
      cc_in: clampPct(gs.cc_in),
      dtl_in: clampPct(gs.dtl_in),
      spd_cc: clampSpeed(gs.spd_cc),
      spd_dtl: clampSpeed(gs.spd_dtl),
      depth_cc: clampPct(gs.depth_cc),
      depth_dtl: clampPct(gs.depth_dtl),
    }
  }

  const validateShotStats = (ss: any) => {
    if (!ss || typeof ss !== 'object') return ss
    const result = { ...ss }
    // Percentage fields
    for (const k of ['serve_pts_won_pct', 's1_pts_won_pct', 's2_pts_won_pct', 'return_pts_won_pct',
      'ret1_pts_won_pct', 'ret2_pts_won_pct', 'total_pts_won_pct', 'bp_saved_pct', 'bp_won_pct',
      'fh_pct', 'bh_pct', 'volley_pct', 'flat_pct', 'topspin_pct', 'slice_pct']) {
      result[k] = clampPct(result[k])
    }
    // Count fields
    for (const k of ['aces', 'service_winners', 'winners', 'fh_winners', 'bh_winners',
      'ue', 'fh_ue', 'bh_ue', 'df', 's1_in_n', 's1_in_total', 's2_in_n', 's2_in_total',
      'bp_saved_n', 'bp_saved_total', 'bp_won_n', 'bp_won_total', 'total_shots']) {
      result[k] = clampCount(result[k])
    }
    // Speed fields
    result.max_ball_spd = clampSpeed(result.max_ball_spd)
    return result
  }

  // Validate score sets_arr
  if (data.score?.sets_arr && Array.isArray(data.score.sets_arr)) {
    data.score.sets_arr = data.score.sets_arr.map((set: any) => {
      if (!Array.isArray(set) || set.length !== 2) return set
      return [clampGameScore(set[0]) ?? set[0], clampGameScore(set[1]) ?? set[1]]
    })
  }

  // JD stats
  if (data.serve?.first) data.serve.first = validateSlot(data.serve.first)
  if (data.serve?.second) data.serve.second = validateSlot(data.serve.second)
  if (data.return?.first) data.return.first = validateSlot(data.return.first, true)
  if (data.return?.second) data.return.second = validateSlot(data.return.second, true)
  if (data.forehand) data.forehand = validateGroundstroke(data.forehand)
  if (data.backhand) data.backhand = validateGroundstroke(data.backhand)
  if (data.shot_stats) data.shot_stats = validateShotStats(data.shot_stats)

  // Opponent stats (same structure)
  if (data.opp_shots) {
    if (data.opp_shots.serve?.first) data.opp_shots.serve.first = validateSlot(data.opp_shots.serve.first)
    if (data.opp_shots.serve?.second) data.opp_shots.serve.second = validateSlot(data.opp_shots.serve.second)
    if (data.opp_shots.return?.first) data.opp_shots.return.first = validateSlot(data.opp_shots.return.first, true)
    if (data.opp_shots.return?.second) data.opp_shots.return.second = validateSlot(data.opp_shots.return.second, true)
    if (data.opp_shots.forehand) data.opp_shots.forehand = validateGroundstroke(data.opp_shots.forehand)
    if (data.opp_shots.backhand) data.opp_shots.backhand = validateGroundstroke(data.opp_shots.backhand)
    if (data.opp_shots.stats) data.opp_shots.stats = validateShotStats(data.opp_shots.stats)
  }

  return data
}

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const { images, oppName, oppUtr, surface } = await req.json()

    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    const prompt = `You are extracting tennis match stats from SwingVision screenshots for João Duarte (JD).

PLAYER IDENTIFICATION — CRITICAL:
• Screenshots showing "João's Shots" or "JD" tab selected → JD's shot stats → populate serve/return/forehand/backhand/shot_stats fields
• Screenshots showing "[Any other name]'s Shots" → OPPONENT's shot stats → populate opp_shots fields ONLY
• Match Stats tab (side-by-side) → LEFT column / green / checkmark side = JD → shot_stats | RIGHT column / orange side = opponent → opp_shots.stats
• NEVER put opponent stats in JD's fields or vice versa

Opponent: ${oppName || 'Unknown'}, UTR: ${oppUtr || 'null'}, Surface: ${surface || 'Clay'}
Today's date if not visible: ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON with this exact structure (null for any field not visible):

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
    "first": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n, "deep_ad": n, "deep_deuce": n},
    "second": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n, "deep_ad": n, "deep_deuce": n}
  },
  "forehand": {"cc_in": n, "dtl_in": n, "spd_cc": n, "spd_dtl": n, "depth_cc": n, "depth_dtl": n},
  "backhand": {"cc_in": n, "dtl_in": n, "spd_cc": n, "spd_dtl": n, "depth_cc": n, "depth_dtl": n},
  "shot_stats": {
    "aces": n, "service_winners": n,
    "winners": n, "fh_winners": n, "bh_winners": n,
    "ue": n, "fh_ue": n, "bh_ue": n, "df": n,
    "s1_in_n": n, "s1_in_total": n,
    "s2_in_n": n, "s2_in_total": n,
    "serve_pts_won_pct": n, "s1_pts_won_pct": n, "s2_pts_won_pct": n,
    "return_pts_won_pct": n, "ret1_pts_won_pct": n, "ret2_pts_won_pct": n,
    "total_pts_won_pct": n,
    "bp_saved_pct": n, "bp_saved_n": n, "bp_saved_total": n,
    "bp_won_pct": n, "bp_won_n": n, "bp_won_total": n,
    "set_pts_saved_n": n, "set_pts_saved_total": n,
    "serve_pts_won_n": n, "serve_pts_won_total": n,
    "s1_pts_won_n": n, "s1_pts_won_total": n,
    "s2_pts_won_n": n, "s2_pts_won_total": n,
    "return_pts_won_n": n, "return_pts_won_total": n,
    "ret1_pts_won_n": n, "ret1_pts_won_total": n,
    "ret2_pts_won_n": n, "ret2_pts_won_total": n,
    "total_pts_won_n": n, "total_pts_won_total": n,
    "max_ball_spd": n,
    "total_shots": n, "fh_pct": n, "bh_pct": n,
    "first_serve_pct_dist": n, "second_serve_pct_dist": n, "volley_pct": n,
    "flat_pct": n, "topspin_pct": n, "slice_pct": n
  },
  "opp_shots": {
    "serve": {
      "first": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n},
      "second": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n}
    },
    "return": {
      "first": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n, "deep_ad": n, "deep_deuce": n},
      "second": {"pct_ad": n, "pct_deuce": n, "spd_ad": n, "spd_deuce": n, "deep_ad": n, "deep_deuce": n}
    },
    "forehand": {"cc_in": n, "dtl_in": n, "spd_cc": n, "spd_dtl": n, "depth_cc": n, "depth_dtl": n},
    "backhand": {"cc_in": n, "dtl_in": n, "spd_cc": n, "spd_dtl": n, "depth_cc": n, "depth_dtl": n},
    "stats": {
      "aces": n, "service_winners": n,
      "winners": n, "fh_winners": n, "bh_winners": n,
      "ue": n, "fh_ue": n, "bh_ue": n, "df": n,
      "s1_in_n": n, "s1_in_total": n,
      "s2_in_n": n, "s2_in_total": n,
      "serve_pts_won_pct": n, "s1_pts_won_pct": n, "s2_pts_won_pct": n,
      "return_pts_won_pct": n, "ret1_pts_won_pct": n, "ret2_pts_won_pct": n,
      "total_pts_won_pct": n,
      "bp_saved_pct": n, "bp_saved_n": n, "bp_saved_total": n,
      "bp_won_pct": n, "bp_won_n": n, "bp_won_total": n,
      "set_pts_saved_n": n, "set_pts_saved_total": n,
      "serve_pts_won_n": n, "serve_pts_won_total": n,
      "s1_pts_won_n": n, "s1_pts_won_total": n,
      "s2_pts_won_n": n, "s2_pts_won_total": n,
      "return_pts_won_n": n, "return_pts_won_total": n,
      "ret1_pts_won_n": n, "ret1_pts_won_total": n,
      "ret2_pts_won_n": n, "ret2_pts_won_total": n,
      "total_pts_won_n": n, "total_pts_won_total": n,
      "max_ball_spd": n
    },
    "distribution": {
      "total_shots": n, "fh_pct": n, "bh_pct": n,
      "first_serve_pct": n, "second_serve_pct": n, "volley_pct": n,
      "flat_pct": n, "topspin_pct": n, "slice_pct": n
    }
  },
  "what_worked": ["insight 1", "insight 2", "insight 3"],
  "what_didnt": ["issue 1", "issue 2", "issue 3"],
  "key_number": "single most diagnostic stat and why it mattered"
}

EXTRACTION RULES:
- serve/return/forehand/backhand/shot_stats = JD's data ONLY (from João's Shots tab or JD column in Match Stats)
- opp_shots = opponent's data ONLY (from opponent's Shots tab or opponent column in Match Stats)
- For fractions like "39/77 (51%)": extract n=39, total=77, pct=51 separately
- "Set Points Saved", "Max ball speed" are easy to miss — look carefully
- Ball Speed section shows "Avg: X km/h Max: Y km/h" — capture max as max_ball_spd
- what_worked/what_didnt/key_number: be Brad Gilbert — direct, data-first, no fluff
- Return ONLY the JSON object. No preamble, no explanation, no markdown.`

    const content: any[] = [
      ...images.map((img: { data: string; type: string }) => ({
        type: 'image',
        source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data }
      })),
      { type: 'text', text: prompt }
    ]

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON robustly
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const raw = JSON.parse(jsonMatch[0])
    const parsed = validateExtraction(raw)

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
