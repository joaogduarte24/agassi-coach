import type { Match } from '@/app/types'
import type {
  Brief,
  BriefBullet,
  BriefConfidence,
  BriefEvidenceClaim,
  BriefInMatchRule,
  BriefMentalRead,
  BriefServeReturn,
  BriefSrCard,
  BriefWarmupDrill,
  GenerateBriefInput,
} from './types'

const round = (n: number) => Math.round(n)

function avg(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => x != null && !isNaN(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

function pickLatestWithShotData(history: Match[]): Match | null {
  const withData = history.filter(m => m.opp_shots != null)
  if (!withData.length) return null
  return [...withData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
}

function readLefty(history: Match[]): boolean {
  for (const m of history) {
    if ((m.journal as any)?.opp_lefty === true) return true
  }
  return false
}

function readScoutField<T = string>(history: Match[], field: string): T | null {
  for (const m of [...history].reverse()) {
    const v = (m.journal as any)?.[field]
    if (v != null && v !== '') return v as T
  }
  return null
}

// ─── style + headline trait ──────────────────────────────────────────────────

function computeStyleTag(latest: Match, history: Match[]): string | null {
  const opp = latest.opp_shots as any
  if (!opp?.stats) return readScoutField(history, 'opp_style')

  const w = opp.stats.winners ?? 0
  const ue = opp.stats.ue ?? 0
  const rally = opp.stats.rally_mean ?? null
  const volley = opp.distribution?.volley_pct ?? 0
  const servePts = opp.stats.serve_pts_won_pct ?? 0
  const serveSpd = opp.serve?.first?.spd_ad ?? opp.serve?.first?.spd_deuce ?? 0

  if (servePts >= 65 && serveSpd >= 170) return 'Big Server'
  if (volley >= 10 && (rally ?? 5) < 4) return 'Serve & Volleyer'
  if (ue < 13 && w < 12 && (rally ?? 4) >= 5) return 'Counterpuncher'
  if (w >= 18 && serveSpd >= 140) return 'Aggressive Baseliner'
  if (w >= 15 && ue >= 15 && Math.abs(w - ue) <= 5) return 'Counterpuncher'
  return readScoutField(history, 'opp_style') ?? 'Baseliner'
}

function computeHeadlineTrait(latest: Match, lefty: boolean): string {
  const opp = latest.opp_shots as any
  const traits: string[] = []
  if (lefty) traits.push('Lefty')
  const serveSpd = avg([
    opp?.serve?.first?.spd_ad, opp?.serve?.first?.spd_deuce,
    opp?.serve?.second?.spd_ad, opp?.serve?.second?.spd_deuce,
  ])
  if (serveSpd != null && serveSpd < 95) traits.push('Slow serve')
  else if (serveSpd != null && serveSpd >= 160) traits.push('Big serve')
  const w = opp?.stats?.winners ?? 0
  const ue = opp?.stats?.ue ?? 0
  if (w >= 15 && ue >= 15 && Math.abs(w - ue) <= 5) traits.push('High variance')
  return traits.slice(0, 2).join(' · ')
}

// ─── EXPECT ──────────────────────────────────────────────────────────────────

function computeExpect(latest: Match, lefty: boolean): BriefBullet[] {
  const opp = latest.opp_shots as any
  const bullets: BriefBullet[] = []
  const matchDate = latest.date

  // 1. Handedness + serve speed
  const adSpd = opp?.serve?.first?.spd_ad
  const deuceSpd = opp?.serve?.first?.spd_deuce
  const ad2Spd = opp?.serve?.second?.spd_ad
  const deuce2Spd = opp?.serve?.second?.spd_deuce
  const meanSpdAll = avg([adSpd, deuceSpd, ad2Spd, deuce2Spd])
  const meanSpd1 = avg([adSpd, deuceSpd])
  if (lefty || adSpd != null) {
    const headline = lefty
      ? (meanSpdAll != null && meanSpdAll < 95 ? 'Lefty · slow serve' : 'Lefty · serve')
      : (meanSpdAll != null && meanSpdAll < 95 ? 'Slow serve' : 'Standard serve')
    const text = meanSpdAll != null
      ? `Avg ${round(meanSpdAll)} km/h across 1st + 2nd.${lefty ? ' On the ad side, expect the wide slider sliding away to your backhand.' : ''}`
      : 'Serve speed unknown.'
    bullets.push({
      headline,
      text,
      caveat: `From ${matchDate}. Combined 1st + 2nd serve speed avg ${round(meanSpdAll ?? 0)} km/h. 1st-only: ${round(meanSpd1 ?? 0)} km/h.`,
    })
  }

  // 2. W/UE pattern
  const w = opp?.stats?.winners ?? null
  const ue = opp?.stats?.ue ?? null
  if (w != null && ue != null && w >= 15 && ue >= 15 && Math.abs(w - ue) <= 5) {
    bullets.push({
      headline: 'High-variance shotmaker',
      text: `Winners and errors equal (${w}/${ue} last match). He will hit unreal shots and free errors at the same rate.`,
      caveat: `From ${matchDate}. Equal W and UE = unsustainable clean strikes. Stay on plan; the errors will come.`,
    })
  } else if (w != null && ue != null && ue - w >= 8) {
    bullets.push({
      headline: 'Error-prone',
      text: `${ue} UE vs ${w} winners last match. Patient rallies should compound his mistakes.`,
      caveat: `From ${matchDate}. UE-to-W ratio favours patient tennis.`,
    })
  } else if (w != null && ue != null && w - ue >= 5) {
    bullets.push({
      headline: 'Net positive',
      text: `${w} winners vs ${ue} errors. He's creating more than giving away. Force him to rally; pace will reduce his clean strikes.`,
      caveat: `From ${matchDate}. Positive W/UE delta — needs neutralising.`,
    })
  }

  // 3. Return tendency
  const retSpdDeuce = opp?.return?.first?.spd_deuce
  const retSpdAd = opp?.return?.first?.spd_ad
  const retSpdMean = avg([retSpdDeuce, retSpdAd])
  if (bullets.length < 3 && retSpdMean != null && retSpdMean < 75) {
    const slowest = (retSpdDeuce ?? Infinity) <= (retSpdAd ?? Infinity) ? 'deuce' : 'ad'
    const slowestVal = Math.min(retSpdDeuce ?? Infinity, retSpdAd ?? Infinity)
    bullets.push({
      headline: 'Floaty returns',
      text: `Averaged ${round(retSpdMean)} km/h — slower than your usual return. Means S&V is on the table, especially on the ${slowest} side (${round(slowestVal)} km/h there).`,
      caveat: `From ${matchDate}. Return speed deuce ${round(retSpdDeuce ?? 0)} km/h, ad ${round(retSpdAd ?? 0)} km/h.`,
    })
  }

  // 4. Rally tempo (fallback)
  const rallyMean = opp?.stats?.rally_mean ?? (latest.shot_stats as any)?.rally_mean ?? null
  if (bullets.length < 3 && rallyMean != null && rallyMean < 4.5) {
    bullets.push({
      headline: 'Wants short points',
      text: `Rally mean was ${rallyMean.toFixed(1)} shots. Below 4.5 = clear preference for first-strike points.`,
      caveat: `From ${matchDate}.`,
    })
  }

  return bullets.slice(0, 3)
}

// ─── DO ─────────────────────────────────────────────────────────────────────

function computeDo(latest: Match): BriefBullet[] {
  const opp = latest.opp_shots as any
  const bullets: BriefBullet[] = []
  const matchDate = latest.date

  const s1Ad = opp?.serve?.first?.pct_ad
  const s1Deuce = opp?.serve?.first?.pct_deuce
  if (s1Ad != null && s1Deuce != null) {
    const weaker = s1Deuce < s1Ad ? 'deuce' : 'ad'
    const weakPct = Math.min(s1Ad, s1Deuce)
    if (weakPct < 70) {
      bullets.push({
        headline: `Step inside on his ${weaker} 2nd serve`,
        text: `He was only ${round(weakPct)}% 1st-in on the ${weaker} side. That gives you the most 2nd-serve attack chances per game.`,
        caveat: `From ${matchDate}. Ad ${round(s1Ad)}%, deuce ${round(s1Deuce)}%.`,
      })
    }
  }

  const retSpdDeuce = opp?.return?.first?.spd_deuce
  const retSpdAd = opp?.return?.first?.spd_ad
  if (retSpdDeuce != null || retSpdAd != null) {
    const slowestVal = Math.min(retSpdDeuce ?? Infinity, retSpdAd ?? Infinity)
    if (slowestVal < 75) {
      const slowest = (retSpdDeuce ?? Infinity) <= (retSpdAd ?? Infinity) ? 'deuce' : 'ad'
      bullets.push({
        headline: `Serve-and-volley off his ${slowest} return`,
        text: `His ${slowest} return averaged ${round(slowestVal)} km/h — floaty, perfect for S&V. Approach off the slower side first.`,
        caveat: `From ${matchDate}. Deuce ${round(retSpdDeuce ?? 0)} km/h, ad ${round(retSpdAd ?? 0)} km/h.`,
      })
    }
  }

  const rallyMean = opp?.stats?.rally_mean ?? (latest.shot_stats as any)?.rally_mean ?? null
  if (rallyMean != null && rallyMean < 4.5) {
    bullets.push({
      headline: 'Extend rallies past 5 shots',
      text: `His rally mean was ${rallyMean.toFixed(1)} — he wants short points. Patient first ball, heavy second; force him out of his preferred tempo.`,
      caveat: `From ${matchDate}. Rally mean ${rallyMean.toFixed(1)} (his) — clear first-strike preference.`,
    })
  } else if (rallyMean != null && rallyMean >= 6) {
    bullets.push({
      headline: 'Shorten points',
      text: `His rally mean was ${rallyMean.toFixed(1)} — he wants long. First-strike tennis denies his rhythm.`,
      caveat: `From ${matchDate}. Grinder pattern.`,
    })
  }

  return bullets.slice(0, 3)
}

// ─── In-match rule ──────────────────────────────────────────────────────────

function computeInMatchRule(latest: Match, lefty: boolean): BriefInMatchRule {
  const opp = latest.opp_shots as any
  const slicePct = opp?.distribution?.slice_pct ?? 0
  const bhCC = opp?.backhand?.cc_in ?? null
  const fhCC = opp?.forehand?.cc_in ?? null
  const targetsBh = slicePct >= 10 || (bhCC != null && fhCC != null && bhCC < fhCC - 8)
  return {
    trigger: 'After losing serve',
    action: targetsBh
      ? 'Next service game: 2 body serves, first ball cross-court to his BH'
      : 'Next service game: 2 body serves, first ball deep CC',
  }
}

// ─── Serve · Return strategy ────────────────────────────────────────────────

function computeServeReturn(latest: Match, lefty: boolean): BriefServeReturn {
  const opp = latest.opp_shots as any
  const s1Ad = round(opp?.serve?.first?.pct_ad ?? 0)
  const s1Deuce = round(opp?.serve?.first?.pct_deuce ?? 0)
  const retSpdDeuce = round(opp?.return?.first?.spd_deuce ?? 0)
  const retSpdAd = round(opp?.return?.first?.spd_ad ?? 0)
  const slicePct = opp?.distribution?.slice_pct ?? 0
  const bhCC = opp?.backhand?.cc_in ?? null
  const fhCC = opp?.forehand?.cc_in ?? null
  const targetsBh = slicePct >= 10 || (bhCC != null && fhCC != null && bhCC < fhCC - 8)
  const bhTarget = targetsBh
    ? '4+ returns above service line to his BH wing — high, not deep'
    : '4+ deep returns to his BH cross-court'

  const returningDeuce: BriefSrCard = {
    instruction: s1Deuce && s1Deuce < 70
      ? 'Step inside, drive deep cross-court to his BH'
      : 'Standard return position, drive deep CC',
    stat: s1Deuce ? `his deuce 1st-in ${s1Deuce}% — plenty of 2nd serves to attack` : 'no serve % data',
    target: bhTarget,
  }

  const returningAd: BriefSrCard = {
    instruction: lefty
      ? 'Wider for the slider, block deep, reset'
      : (s1Ad && s1Ad >= 75 ? 'Stand back a half step, neutralise' : 'Standard position, block deep'),
    stat: lefty
      ? `his ad 1st-in ${s1Ad}% — slider slides away to your BH`
      : `his ad 1st-in ${s1Ad}%`,
    target: 'High cross-court to his BH, neutralise to a neutral rally',
  }

  const slowSide = (retSpdDeuce && retSpdAd) ? (retSpdDeuce <= retSpdAd ? 'deuce' : 'ad') : null

  const servingDeuce: BriefSrCard = {
    instruction: targetsBh ? 'Mix wide + body · +1 cross-court to his BH' : 'Mix wide + body · +1 deep CC',
    stat: retSpdDeuce && retSpdDeuce < 75 ? `his deuce return ${retSpdDeuce} km/h — floaty, S&V on the table` : `his deuce return ${retSpdDeuce} km/h`,
    target: slowSide === 'deuce' ? 'Step in on +1, finish at net' : 'Push him off the baseline on +1',
  }

  const servingAd: BriefSrCard = {
    instruction: lefty ? 'T-heavy · +1 short angle to his BH' : 'Body + T mix · +1 deep CC',
    stat: lefty
      ? `his ad 1st-in ${s1Ad}% — comfortable on wide, deny him that`
      : `his ad return ${retSpdAd} km/h`,
    target: 'Take time away on +1, push him off the baseline',
  }

  return {
    returning: { deuce: returningDeuce, ad: returningAd },
    serving: { deuce: servingDeuce, ad: servingAd },
    guardrail: 'If 1st-serve-in% drops below 50%, drop to 75% pace until 3 in a row.',
  }
}

// ─── Warm-up drills (each anchored to a stat) ───────────────────────────────

function computeWarmupDrills(latest: Match): BriefWarmupDrill[] {
  const opp = latest.opp_shots as any
  const drills: BriefWarmupDrill[] = []
  const s1Deuce = opp?.serve?.first?.pct_deuce
  const retSpdDeuce = opp?.return?.first?.spd_deuce
  const retSpdAd = opp?.return?.first?.spd_ad
  const rallyMean = opp?.stats?.rally_mean ?? (latest.shot_stats as any)?.rally_mean ?? null

  if (s1Deuce != null && s1Deuce < 70) {
    drills.push({
      drill: 'Take 8 returns standing 1 step inside the baseline',
      stat: `his deuce 1st-in was ${round(s1Deuce)}% — you will see plenty of 2nd serves to attack`,
    })
  }

  const retSlow = Math.min(retSpdDeuce ?? Infinity, retSpdAd ?? Infinity)
  if (retSlow < 75 && (retSpdDeuce != null || retSpdAd != null)) {
    const slowSide = (retSpdDeuce ?? Infinity) <= (retSpdAd ?? Infinity) ? 'deuce' : 'ad'
    drills.push({
      drill: `Hit 4 wide ${slowSide} serves + step into net immediately`,
      stat: `his ${slowSide} return averaged ${round(retSlow)} km/h — the float you want for S&V`,
    })
  }

  if (rallyMean != null && rallyMean < 4.5) {
    drills.push({
      drill: 'Rally 5 patient high cross-court FHs before any winner attempt',
      stat: `his rally mean was ${rallyMean.toFixed(1)} — you need to hit one more ball than he wants`,
    })
  } else if (rallyMean != null && rallyMean >= 6) {
    drills.push({
      drill: 'Hit 4 first-strike returns + immediately attack the next ball',
      stat: `his rally mean was ${rallyMean.toFixed(1)} — break his rhythm with first-strike tennis`,
    })
  }

  return drills.slice(0, 3)
}

// ─── Mental read (data-derived archetype cue) ───────────────────────────────

function computeMentalRead(latest: Match, styleTag: string | null): BriefMentalRead {
  const opp = latest.opp_shots as any
  const w = opp?.stats?.winners ?? 0
  const ue = opp?.stats?.ue ?? 0
  const serveSpd = avg([opp?.serve?.first?.spd_ad, opp?.serve?.first?.spd_deuce]) ?? 0
  const rallyMean = opp?.stats?.rally_mean ?? null

  // High variance — equal W/UE, both >= 15
  if (w >= 15 && ue >= 15 && Math.abs(w - ue) <= 5) {
    return {
      headline: 'Variance, not level',
      text: 'When he hits an unreal shot: smile, reset, next point starts now. He will hit 3–4 unsustainable winners. The errors will follow.',
      derivation: `${styleTag ?? 'High-variance'} · winners ${w} ≈ errors ${ue} (ratio ${(w / ue).toFixed(2)}) — high-variance shotmaker signal`,
    }
  }
  // Big server
  if (serveSpd >= 160) {
    return {
      headline: 'Aces happen',
      text: 'When his serve becomes unreturnable, breathe and reset. Focus on his 2nd serves — that is where you break.',
      derivation: `Big serve · 1st-serve avg ${round(serveSpd)} km/h`,
    }
  }
  // Grinder
  if (rallyMean != null && rallyMean >= 6 && ue < 15) {
    return {
      headline: 'Patience breaks pushers',
      text: 'When his retrieval frustrates you, the play is patience. Pace + depth eventually breaks pushers.',
      derivation: `Grinder · rally mean ${rallyMean.toFixed(1)}, low UE`,
    }
  }
  // Aggressive
  if (w >= 18) {
    return {
      headline: 'Ride out the storm',
      text: 'When he goes on a winner spree, slow play. Wait for the unforced errors that follow attempts at greatness.',
      derivation: `Aggressive · ${w} winners last match`,
    }
  }
  // Default — patient steady
  return {
    headline: 'Steady wins',
    text: 'No flash needed. Stay on plan. The right ball is patient + heavy + to his weaker side.',
    derivation: `${styleTag ?? 'Baseline'} · no clear archetype trigger`,
  }
}

// ─── Evidence ───────────────────────────────────────────────────────────────

function computeEvidence(latest: Match, lefty: boolean): BriefEvidenceClaim[] {
  const opp = latest.opp_shots as any
  const claims: BriefEvidenceClaim[] = []
  const matchIds = [latest.id]

  // Serve speed
  const adSpd = opp?.serve?.first?.spd_ad
  const deuceSpd = opp?.serve?.first?.spd_deuce
  const ad2Spd = opp?.serve?.second?.spd_ad
  const deuce2Spd = opp?.serve?.second?.spd_deuce
  const meanSpdAll = avg([adSpd, deuceSpd, ad2Spd, deuce2Spd])
  const meanSpd1 = avg([adSpd, deuceSpd])
  if (meanSpdAll != null) {
    const slow = meanSpdAll < 95
    claims.push({
      claim: slow ? `Slow serve (avg ${round(meanSpdAll)} km/h)` : `Serve avg ${round(meanSpdAll)} km/h`,
      data: `1st avg ${round(meanSpd1 ?? 0)} km/h · 2nd avg ${round(avg([ad2Spd, deuce2Spd]) ?? 0)} km/h · combined ${round(meanSpdAll)}`,
      matchIds,
    })
  }

  // W / UE
  const w = opp?.stats?.winners ?? null
  const ue = opp?.stats?.ue ?? null
  if (w != null && ue != null) {
    claims.push({
      claim: `Winner / error ratio (${w}W / ${ue}UE)`,
      data: `Winners ${w} · UE ${ue} · ratio ${(w / Math.max(ue, 1)).toFixed(2)}`,
      matchIds,
    })
  }

  // Return speed
  const retSpdDeuce = opp?.return?.first?.spd_deuce
  const retSpdAd = opp?.return?.first?.spd_ad
  if (retSpdDeuce != null || retSpdAd != null) {
    claims.push({
      claim: `Return speed (avg ${round(avg([retSpdDeuce, retSpdAd]) ?? 0)} km/h)`,
      data: `Deuce ${round(retSpdDeuce ?? 0)} km/h · ad ${round(retSpdAd ?? 0)} km/h`,
      matchIds,
    })
  }

  // Serve % per court
  const s1Ad = opp?.serve?.first?.pct_ad
  const s1Deuce = opp?.serve?.first?.pct_deuce
  if (s1Ad != null && s1Deuce != null) {
    claims.push({
      claim: 'Serve % per court',
      data: `1st-serve in% — ad ${round(s1Ad)}%, deuce ${round(s1Deuce)}%`,
      matchIds,
    })
  }

  // Rally tempo
  const rallyMean = opp?.stats?.rally_mean ?? (latest.shot_stats as any)?.rally_mean ?? null
  if (rallyMean != null) {
    claims.push({
      claim: `Rally tempo (mean ${rallyMean.toFixed(1)})`,
      data: `Rally mean ${rallyMean.toFixed(1)} · pct points <4 shots: ${round((latest.shot_stats as any)?.rally_pct_short ?? 0)}%`,
      matchIds,
    })
  }

  // Slice / spin gap
  const slicePct = opp?.distribution?.slice_pct
  if (slicePct == null) {
    claims.push({
      claim: 'Per-stroke slice usage',
      data: 'distribution.slice_pct unavailable — per-stroke spin not yet aggregated from match_shots',
      matchIds,
      gap: true,
    })
  }

  return claims
}

// ─── Coverage modes (cold-start) ────────────────────────────────────────────

function blankBrief(opponentName: string): Brief {
  return {
    opponent: opponentName,
    surface: null,
    styleTag: null,
    headlineTrait: null,
    isLefty: false,
    confidence: 'blank',
    matchesUsed: 0,
    expect: [],
    do: [
      { headline: 'Open patient', text: 'Observe his first 3 service games before committing to a pattern.', caveat: 'No prior data on this opponent.' },
      { headline: 'Test his backhand wing in warm-up', text: 'Note slice frequency and contact height — that drives the return target.', caveat: 'First-time scout. Use warm-up as data collection.' },
      { headline: 'Hold serve early', text: 'Take pressure off your return games.', caveat: 'No matchup priors.' },
    ],
    intent: '1+ first-strike attempt every return game',
    inMatchRule: { trigger: 'After losing serve', action: 'Next service game: 2 body serves, first ball deep CC' },
    serveReturn: {
      returning: {
        deuce: { instruction: 'Standard return position, drive deep CC', stat: 'no serve % data', target: '4+ deep returns' },
        ad: { instruction: 'Standard position, block deep', stat: 'no serve % data', target: 'Reset to neutral' },
      },
      serving: {
        deuce: { instruction: 'Mix wide + body · +1 deep CC', stat: 'no return data', target: 'Push him off the baseline' },
        ad: { instruction: 'Body + T mix · +1 deep CC', stat: 'no return data', target: 'Take time away on +1' },
      },
      guardrail: 'If 1st-serve-in% drops below 50%, drop to 75% pace until 3 in a row.',
    },
    warmupDrills: [
      { drill: 'Hit 6 high-percentage rally balls cross-court', stat: 'find your patient depth before any data exists' },
      { drill: 'Test his BH with 4 high topspin balls', stat: 'note contact height — drives your return target' },
      { drill: 'Hit 4 first serves to each spot (T, body, wide)', stat: 'no priors on his return — read in real time' },
    ],
    mentalRead: {
      headline: 'Read first, decide later',
      text: 'No history with this opponent. Use the first set as scouting. Trust your first read by game 4.',
      derivation: 'Cold start · no shot data',
    },
    evidence: [],
    generatedAt: new Date().toISOString(),
  }
}

function limitedBrief(opponentName: string, history: Match[]): Brief {
  const lefty = readLefty(history)
  const style = readScoutField<string>(history, 'opp_style')
  const weakness = readScoutField<string>(history, 'opp_weakness')
  return {
    opponent: opponentName,
    surface: history[history.length - 1]?.surface ?? null,
    styleTag: style ?? null,
    headlineTrait: lefty ? 'Lefty' : null,
    isLefty: lefty,
    confidence: 'limited',
    matchesUsed: history.length,
    expect: [
      ...(style ? [{ headline: `${style}`, text: 'Tagged from your prior journal scout. No SwingVision shot data on prior matches.', caveat: 'Limited data — directional only.' } as BriefBullet] : []),
      ...(weakness ? [{ headline: `Weakness: ${weakness}`, text: 'From journal scout. Confirm in real time.', caveat: 'No per-shot data.' } as BriefBullet] : []),
    ].slice(0, 3),
    do: [
      { headline: 'Open patient', text: 'Collect data through first 3 service games.', caveat: 'No shot history; use match start as scouting time.' },
      ...(weakness ? [{ headline: `Probe his ${weakness.toLowerCase()} early`, text: 'Confirm or rule out the journal note in real time.', caveat: 'Validate the scout.' } as BriefBullet] : []),
    ].slice(0, 3),
    intent: '1+ first-strike attempt every return game',
    inMatchRule: { trigger: 'After losing serve', action: 'Next service game: 2 body serves, first ball deep CC' },
    serveReturn: {
      returning: {
        deuce: { instruction: 'Standard return position, drive deep CC', stat: 'no shot data on this opponent', target: '4+ deep returns' },
        ad: { instruction: lefty ? 'Wider for the slider, block deep' : 'Standard position, block deep', stat: 'limited data', target: 'Reset to neutral' },
      },
      serving: {
        deuce: { instruction: 'Mix wide + body · +1 deep CC', stat: 'no return data on this opponent', target: 'Push him off the baseline' },
        ad: { instruction: 'Body + T mix · +1 deep CC', stat: 'limited data', target: 'Take time away on +1' },
      },
      guardrail: 'If 1st-serve-in% drops below 50%, drop to 75% pace until 3 in a row.',
    },
    warmupDrills: [],
    mentalRead: {
      headline: 'Validate the scout',
      text: 'You have a journal note but no shot data. First set is for confirmation; do not over-commit to the plan.',
      derivation: 'Limited data — journal only',
    },
    evidence: [],
    generatedAt: new Date().toISOString(),
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

export function generateBrief(input: GenerateBriefInput): Brief | null {
  const { opponentName, allMatches } = input
  if (!opponentName) return null

  const history = allMatches.filter(m => m.opponent?.name === opponentName)
  if (!history.length) return blankBrief(opponentName)

  const latest = pickLatestWithShotData(history)
  if (!latest) return limitedBrief(opponentName, history)

  const matchesWithData = history.filter(m => m.opp_shots != null)
  const confidence: BriefConfidence = matchesWithData.length >= 3 ? 'strong' : 'single_match'
  const lefty = readLefty(history)

  const styleTag = computeStyleTag(latest, history)
  const headlineTrait = computeHeadlineTrait(latest, lefty)

  return {
    opponent: opponentName,
    surface: latest.surface ?? null,
    styleTag,
    headlineTrait: headlineTrait || null,
    isLefty: lefty,
    confidence,
    matchesUsed: matchesWithData.length,
    expect: computeExpect(latest, lefty),
    do: computeDo(latest),
    intent: '1+ first-strike attempt every return game',
    inMatchRule: computeInMatchRule(latest, lefty),
    serveReturn: computeServeReturn(latest, lefty),
    warmupDrills: computeWarmupDrills(latest),
    mentalRead: computeMentalRead(latest, styleTag),
    evidence: computeEvidence(latest, lefty),
    generatedAt: new Date().toISOString(),
  }
}
