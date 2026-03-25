'use client'
import { useState } from 'react'
import { G, A, R, B, AD, avg, fmtDate } from '@/app/lib/helpers'

interface NextMatchStrategyProps {
  matches: any[]
  avgs: any
}

export default function NextMatchStrategy({ matches }: NextMatchStrategyProps) {
  const [oppName, setOppName] = useState('')
  const [oppUtr, setOppUtr] = useState('')
  const [oppStyle, setOppStyle] = useState('')
  const [isLefty, setIsLefty] = useState<'yes'|'no'|''>('')
  const [surface, setSurface] = useState('')

  const utr = parseFloat(oppUtr)
  const utrValid = !isNaN(utr) && utr > 0

  // Sort newest first — needed for recency weighting
  const byDate = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Weighted average: last 5 matches get 2× weight, older 1×
  const wAvg = (fn: (m: any) => number | null | undefined): number | null => {
    const entries: { v: number; w: number }[] = []
    byDate.forEach((m, i) => {
      const v = fn(m)
      if (v != null && !isNaN(Number(v))) entries.push({ v: Number(v), w: i < 5 ? 2 : 1 })
    })
    if (!entries.length) return null
    const wSum = entries.reduce((s, e) => s + e.w, 0)
    return Math.round(entries.reduce((s, e) => s + e.v * e.w, 0) / wSum)
  }

  // Past opponents dropdown
  const pastOpponents = Array.from(
    new Map(matches.filter(m => m.opponent?.name).map(m => [m.opponent.name, m.opponent])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name))

  // Matches vs selected opponent
  const historyMatches = oppName ? matches.filter(m => m.opponent?.name === oppName) : []
  const isKnown = historyMatches.length > 0
  const knownWins = historyMatches.filter(m => m.score?.winner === 'JD').length
  const knownLosses = historyMatches.length - knownWins
  const knownWinRate = historyMatches.length ? Math.round(knownWins / historyMatches.length * 100) : null

  // Matches vs similar UTR opponents (±0.5)
  const similarMatches = utrValid
    ? matches.filter(m => m.opponent?.utr != null && Math.abs(m.opponent.utr - utr) <= 0.5)
    : []
  const simWins = similarMatches.filter(m => m.score?.winner === 'JD').length
  const simWinRate = similarMatches.length ? Math.round(simWins / similarMatches.length * 100) : null

  // JD's weighted stats (recency-adjusted)
  const jd = {
    s1Ad:    wAvg(m => m.serve?.first?.pct_ad),
    s1Deuce: wAvg(m => m.serve?.first?.pct_deuce),
    s2Ad:    wAvg(m => m.serve?.second?.pct_ad),
    spd2:    wAvg(m => m.serve?.second?.spd_ad),
    ret1Ad:  wAvg(m => m.return?.first?.pct_ad),
    ret2Ad:  wAvg(m => m.return?.second?.pct_ad),
    fhCC:    wAvg(m => m.forehand?.cc_in),
    fhDTL:   wAvg(m => m.forehand?.dtl_in),
    bhCC:    wAvg(m => m.backhand?.cc_in),
    bhDTL:   wAvg(m => m.backhand?.dtl_in),
    winners: wAvg(m => m.shot_stats?.winners),
    ue:      wAvg(m => m.shot_stats?.ue),
    df:      wAvg(m => m.shot_stats?.df),
    bpSaved: wAvg(m => m.shot_stats?.bp_saved_pct),
    bpWon:   wAvg(m => m.shot_stats?.bp_won_pct),
  }

  // Stats in wins vs losses vs known opponent
  const vsWins  = historyMatches.filter(m => m.score?.winner === 'JD')
  const vsLosses = historyMatches.filter(m => m.score?.winner !== 'JD')
  const vsAvg   = (fn: (m: any) => any) => avg(historyMatches.map(fn))
  const vsWinAvg  = (fn: (m: any) => any) => avg(vsWins.map(fn))
  const vsLossAvg = (fn: (m: any) => any) => avg(vsLosses.map(fn))

  // Stats vs similar-UTR opponents
  const simAvg = (fn: (m: any) => any) => avg(similarMatches.map(fn))

  // JD weakness flags (recency-weighted)
  const weak = {
    serveAd:  jd.s1Ad  != null && jd.s1Ad  < 68,
    df:       jd.df    != null && jd.df    > 3.5,
    bhDTL:    jd.bhDTL != null && jd.bhDTL < 72,
    ue:       jd.ue    != null && jd.ue    > 20,
    bpSaved:  jd.bpSaved != null && jd.bpSaved < 60,
    ret1:     jd.ret1Ad != null && jd.ret1Ad < 70,
  }
  const strong = {
    fhCC: jd.fhCC != null && jd.fhCC >= 78,
    s2:   jd.s2Ad != null && jd.s2Ad >= 78,
    ret2: jd.ret2Ad != null && jd.ret2Ad >= 78,
    bhCC: jd.bhCC != null && jd.bhCC >= 75,
  }

  // Serve placement — changes completely with handedness
  const lefty = isLefty === 'yes'
  const serveAd = {
    primary:   lefty ? 'T (into their backhand)' : 'Wide (to their backhand)',
    secondary: lefty ? 'Body (jam their forehand)' : 'Body (jam their forehand)',
    avoid:     lefty ? 'Wide — goes to their forehand, sets up their attack' : 'T — goes to their forehand',
  }
  const serveDeuce = {
    primary:   lefty ? 'Wide (big angle — into their backhand)' : 'T (to their backhand)',
    secondary: lefty ? 'T (to their forehand — use sparingly)' : 'Wide (opens court)',
    avoid:     lefty ? 'T often feeds their forehand' : 'Body only — use for surprise, not default',
  }

  // Style playbook
  type StyleData = { label: string; threat: string; returnTactic: string; rallyTactic: string; watchOut: string }
  const styleMap: Record<string, StyleData> = {
    baseliner: {
      label: 'Baseliner',
      threat: 'Consistent from the back — heavy topspin, good depth, will outlast you in long rallies.',
      returnTactic: 'Return deep CC to their BH. Get to neutral first — don\'t gamble on an early winner.',
      rallyTactic: 'BH CC deep to push them behind the baseline → wait for the short ball → attack FH inside-out CC or DTL.',
      watchOut: 'Don\'t try to out-rally them. Attack the first medium-pace ball — don\'t wait for the perfect ball.',
    },
    serveVolley: {
      label: 'Serve & Volleyer',
      threat: 'Serve and charge the net. Short, sharp points. Uncomfortable if your return isn\'t precise.',
      returnTactic: 'Return low and at their feet. Chip-and-charge back or lob over them when pinned back.',
      rallyTactic: 'If they come in, pass low DTL or lob crosscourt. Take the net yourself when they stay back.',
      watchOut: 'Don\'t go for too much on the return — low and in beats trying to blast it past them.',
    },
    allCourt: {
      label: 'All-Court',
      threat: 'Comfortable everywhere — can hurt you from the back, mid-court, or at the net. No obvious weakness.',
      returnTactic: 'Deep CC, stay disciplined. Make them earn every ball — don\'t gift them errors.',
      rallyTactic: 'Out-compete them with consistency and court position. Win the rally, then attack when FH CC opens the court.',
      watchOut: 'Going for too much too early. Control the tempo — let them make the first mistake.',
    },
    pusher: {
      label: 'Pusher',
      threat: 'Every ball comes back, high and heavy. Will frustrate you into errors — that\'s their entire game plan.',
      returnTactic: 'Attack 2nd serve immediately. Step inside and drive — don\'t let them reset into their rhythm.',
      rallyTactic: 'Attack short balls early. Come in, volley, close the point. Don\'t stay back and rally with a pusher.',
      watchOut: 'Getting pulled into slow exchanges. The moment you start rallying patiently with them, they win.',
    },
    bigServer: {
      label: 'Big Server',
      threat: 'Serve is their weapon — hard to get into rallies. Very dangerous on 1st serve, vulnerable on 2nd.',
      returnTactic: 'Block deep to their body on 1st serve — depth matters, not pace. Attack every 2nd serve by stepping inside.',
      rallyTactic: 'Survive the serve, extend the rally. Grind on their 2nd serve game — that\'s where you break them.',
      watchOut: 'Trying to blast their big serve back. Deep and in is your return goal — get in the rally first.',
    },
  }

  // Surface modifiers
  type SurfaceData = { serveNote: string; rallyNote: string; patternNote: string; tbNote: string }
  const surfaceMap: Record<string, SurfaceData> = {
    clay: {
      serveNote: 'Kick 2nd serve high to their BH — extra bounce off clay makes it harder to attack. 1st serve % matters more than pace.',
      rallyNote: 'BH CC depth is your weapon on clay — pushes them behind the baseline and opens the court.',
      patternNote: 'Be patient. Build the rally, wait for the right ball to attack. Don\'t force on clay.',
      tbNote: 'Clay tiebreaks favour the more consistent player — slow it down, go for 70% pace, don\'t spray.',
    },
    hard: {
      serveNote: 'Pace counts on hard courts. Flat wide serves stay low — use them. Lead with serve + 1 patterns.',
      rallyNote: 'Hard court rewards aggression — step in early, take the ball on the rise, attack mid-court.',
      patternNote: 'Serve + 1: force a weak return → inside-out FH CC. Keep points short.',
      tbNote: 'Hard court tiebreaks are decided by the serve. Go for your serve — don\'t coast to 2nd serve.',
    },
    grass: {
      serveNote: 'Serve is king on grass. Go T on both sides — the low bounce amplifies a flat serve.',
      rallyNote: 'Come in on short balls. Slice BH keeps the ball skidding low — hard for them to attack.',
      patternNote: 'Short, sharp points. Mix in serve + volley occasionally to force them into uncomfortable positions.',
      tbNote: 'Grass tiebreaks are fast and chaotic. Trust your serve. First to 5 with confidence wins.',
    },
  }

  const sd = oppStyle ? styleMap[oppStyle] : null
  const surf = surface ? surfaceMap[surface] : null

  interface CardData { n: string; title: string; stat: string; body: string; action: string }
  const buildCards = (): CardData[] => {
    const cards: CardData[] = []

    // CARD 01: OPPONENT READ
    const parts01: string[] = []
    let stat01 = ''
    let action01 = ''

    if (isKnown) {
      stat01 = `Head-to-head: ${knownWins}W ${knownLosses}L · Win rate ${knownWinRate}%`
      const winUe   = vsWinAvg(m => m.shot_stats?.ue)
      const lossUe  = vsLossAvg(m => m.shot_stats?.ue)
      const winS1   = vsWinAvg(m => m.serve?.first?.pct_ad)
      const lossS1  = vsLossAvg(m => m.serve?.first?.pct_ad)
      const winRet  = vsWinAvg(m => m.return?.first?.pct_ad)
      const lossRet = vsLossAvg(m => m.return?.first?.pct_ad)

      if (winUe != null && lossUe != null && lossUe - winUe > 3)
        parts01.push(`UE spikes in your losses: ${lossUe} vs ${winUe} in wins — errors are costing you this matchup.`)
      if (winS1 != null && lossS1 != null && winS1 - lossS1 > 5)
        parts01.push(`1st serve Ad drops to ${lossS1}% in losses vs ${winS1}% in wins — your serve dictates the result.`)
      if (winRet != null && lossRet != null && winRet - lossRet > 5)
        parts01.push(`Return is ${winRet}% in wins vs ${lossRet}% in losses — start aggressively or you'll be on the back foot.`)
      if (parts01.length === 0)
        parts01.push(historyMatches.length === 1
          ? 'Only one match on record — use all data points below to build your plan.'
          : `${historyMatches.length} matches played. Review the pattern — execution consistency is the differentiator.`)
      if (sd) parts01.push(`Style: ${sd.threat}`)

      const oppShotMatches = historyMatches.filter(m => m.opp_shots != null)
      if (oppShotMatches.length > 0) {
        const oppS1Ad  = avg(oppShotMatches.map(m => m.opp_shots?.serve?.first?.pct_ad))
        const oppBhCC  = avg(oppShotMatches.map(m => m.opp_shots?.backhand?.cc_in))
        const oppUE    = avg(oppShotMatches.map(m => m.opp_shots?.stats?.ue))
        const oppSpd   = avg(oppShotMatches.map(m => m.opp_shots?.serve?.first?.spd_ad))
        const oppS2Won = avg(oppShotMatches.map(m => m.opp_shots?.stats?.s2_pts_won_pct))

        if (oppS1Ad != null) parts01.push(`Their 1st serve: ${oppS1Ad}% in — ${oppS1Ad < 55 ? 'low, expect lots of 2nd serves' : oppS1Ad < 65 ? 'average' : 'reliable — read direction early'}.`)
        if (oppSpd != null) parts01.push(`Serve speed: avg ${oppSpd} km/h — ${oppSpd < 100 ? 'slow — step in and attack' : oppSpd < 130 ? 'medium pace' : 'heavy — block deep, don\'t swing big'}.`)
        if (oppBhCC != null && oppBhCC < 65) parts01.push(`Their BH CC at ${oppBhCC}% — they miss it often. Push them wide to their backhand.`)
        if (oppUE != null) parts01.push(`They averaged ${oppUE} UE — ${oppUE > 35 ? 'error-prone, stay consistent and let them self-destruct' : 'disciplined player, you need to create your own opportunities'}.`)
        if (oppS2Won != null) parts01.push(`Their 2nd serve points won: ${oppS2Won}% — ${oppS2Won < 40 ? 'attack their 2nd serve, it\'s a free point' : 'they hold well even on 2nd serve — step in early'}.`)
      }

      action01 = knownWinRate != null && knownWinRate >= 50
        ? `YOU'VE BEATEN THEM BEFORE — EXECUTE THE SAME PLAN. DON'T REINVENT THE WHEEL.`
        : `MORE LOSSES THAN WINS — SOMETHING MUST CHANGE. START WITH YOUR SERVE AND UE COUNT.`
    } else {
      const simCtx = similarMatches.length >= 2 && simWinRate != null
        ? ` Against UTR ${(utr - 0.5).toFixed(1)}–${(utr + 0.5).toFixed(1)} opponents you're ${simWinRate}% (${simWins}W ${similarMatches.length - simWins}L).`
        : ''
      if (utr < 2.5) stat01 = `UTR ${utr.toFixed(1)} — Below your level. Win this convincingly.`
      else if (utr < 3.3) stat01 = `UTR ${utr.toFixed(1)} — Your level. Errors decide the match.`
      else if (utr < 4.0) stat01 = `UTR ${utr.toFixed(1)} — Slightly above your level. Compete hard.`
      else stat01 = `UTR ${utr.toFixed(1)} — Strong player. Nothing to lose — go for your shots.`
      if (simCtx) parts01.push(simCtx.trim())
      if (sd) parts01.push(`Playing style: ${sd.threat}`)
      else parts01.push('Add a playing style above for more specific tactical advice.')

      const simOppShotMatches = similarMatches.filter(m => m.opp_shots != null)
      if (simOppShotMatches.length > 0) {
        const oppS1Ad  = avg(simOppShotMatches.map(m => m.opp_shots?.serve?.first?.pct_ad))
        const oppBhCC  = avg(simOppShotMatches.map(m => m.opp_shots?.backhand?.cc_in))
        const oppUE    = avg(simOppShotMatches.map(m => m.opp_shots?.stats?.ue))
        const oppSpd   = avg(simOppShotMatches.map(m => m.opp_shots?.serve?.first?.spd_ad))
        const oppS2Won = avg(simOppShotMatches.map(m => m.opp_shots?.stats?.s2_pts_won_pct))

        if (oppS1Ad != null) parts01.push(`Similar UTR opponents avg 1st serve: ${oppS1Ad}% — ${oppS1Ad < 55 ? 'expect lots of 2nd serves, attack them' : oppS1Ad < 65 ? 'average serve, read direction early' : 'reliable servers at this level — stay sharp'}.`)
        if (oppSpd != null) parts01.push(`Avg serve speed at this UTR: ${oppSpd} km/h — ${oppSpd < 100 ? 'slow — step in and attack' : oppSpd < 130 ? 'medium pace' : 'heavy — block deep'}.`)
        if (oppBhCC != null && oppBhCC < 65) parts01.push(`Opponents at this level avg BH CC at ${oppBhCC}% — push wide to their backhand.`)
        if (oppUE != null) parts01.push(`Similar opponents avg ${oppUE} UE — ${oppUE > 35 ? 'error-prone level, stay consistent' : 'disciplined at this UTR, create your own chances'}.`)
        if (oppS2Won != null) parts01.push(`Their 2nd serve pts won avg ${oppS2Won}% at this UTR — ${oppS2Won < 40 ? 'attack 2nd serves hard' : 'they compete well on 2nd serve — stay aggressive'}.`)
      }

      action01 = utr >= 3.5
        ? 'COMPETE WITH NOTHING TO LOSE — YOUR BEST TENNIS WINS HERE, NOT SAFE TENNIS'
        : 'EXECUTE YOUR GAME — THE DATA SHOWS YOU CAN WIN AT THIS LEVEL'
    }

    cards.push({ n: '01', title: isKnown ? `Reading ${oppName}` : 'Reading the Opponent', stat: stat01, body: parts01.join(' '), action: action01 })

    // CARD 02: SERVE
    const parts02: string[] = []
    if (isLefty !== '') {
      parts02.push(`Ad court: lead with ${serveAd.primary}. Mix in ${serveAd.secondary}. Avoid ${serveAd.avoid}.`)
      parts02.push(`Deuce court: ${serveDeuce.primary}. Secondary: ${serveDeuce.secondary}.`)
    } else {
      parts02.push('Ad court: Wide to BH or Body to jam. Commit to the target before the toss — no last-second changes.')
      parts02.push('Deuce court: T to their BH or Wide to open the court.')
    }
    if (surf?.serveNote) parts02.push(surf.serveNote)
    if (weak.df) parts02.push(`Double faults avg ${jd.df} per match — slow your 2nd serve down, spin it in, don't go for too much.`)
    if (isKnown) {
      const vs1 = vsAvg(m => m.serve?.first?.pct_ad)
      if (vs1 != null && jd.s1Ad != null) {
        if (vs1 < jd.s1Ad - 5) parts02.push(`Your 1st serve drops to ${vs1}% vs ${oppName} (normally ${jd.s1Ad}%) — they pressure your serve. Extra focus pre-toss.`)
        else if (vs1 > jd.s1Ad + 3) parts02.push(`Serve is actually better vs ${oppName} (${vs1}% vs avg ${jd.s1Ad}%) — lead with it aggressively.`)
      }
    } else if (similarMatches.length >= 2) {
      const simS1 = simAvg(m => m.serve?.first?.pct_ad)
      if (simS1 != null && jd.s1Ad != null && simS1 < jd.s1Ad - 5)
        parts02.push(`Your 1st serve tends to drop vs this UTR bracket (avg ${simS1}% here vs ${jd.s1Ad}% overall) — conscious pre-toss routine.`)
    }
    const stat02 = jd.s1Ad != null
      ? `Weighted 1st serve Ad: ${jd.s1Ad}%${jd.s1Deuce != null ? ` · Deuce: ${jd.s1Deuce}%` : ''} · 2nd serve: ${jd.s2Ad ?? '—'}%`
      : 'Serve data building...'
    const action02 = weak.serveAd
      ? `AD SERVE AT ${jd.s1Ad}% — BELOW 68% TARGET. ONE TARGET. COMMIT BEFORE THE TOSS.`
      : `SERVE IS SOLID (${jd.s1Ad}%) — LEAD WITH IT. SET UP BALL 2 WITH YOUR 1ST SERVE.`
    cards.push({ n: '02', title: 'Serve Plan', stat: stat02, body: parts02.join(' '), action: action02 })

    // CARD 03: RETURN
    const parts03: string[] = []
    if (sd) {
      parts03.push(sd.returnTactic)
    } else {
      parts03.push('Return deep CC to their backhand — depth over pace. Get to neutral first.')
      parts03.push('Attack every 2nd serve: step inside the baseline and drive.')
    }
    if (surf?.rallyNote) parts03.push(surf.rallyNote)
    if (isKnown) {
      const vsR1 = vsAvg(m => m.return?.first?.pct_ad)
      if (vsR1 != null && jd.ret1Ad != null) {
        if (vsR1 > jd.ret1Ad + 5) parts03.push(`Your return is actually better vs ${oppName} (${vsR1}% vs avg ${jd.ret1Ad}%) — be aggressive from ball one.`)
        else if (vsR1 < jd.ret1Ad - 5) parts03.push(`Return struggles vs ${oppName}: ${vsR1}% (avg is ${jd.ret1Ad}%) — focus on depth, not winners.`)
      }
    }
    const stat03 = jd.ret1Ad != null
      ? `Weighted return won: 1st ${jd.ret1Ad}%${jd.ret2Ad != null ? ` · 2nd ${jd.ret2Ad}%` : ''}`
      : 'Return data building...'
    const action03 = sd?.returnTactic
      ? (oppStyle === 'serveVolley' ? 'LOW AT FEET OR LOB — DON\'T GIVE THEM A HIGH BALL TO VOLLEY'
        : oppStyle === 'pusher' ? 'ATTACK THEIR 2ND SERVE. COME IN ON SHORT BALLS.'
        : 'DEEP CC → STEP IN ON BALL 3')
      : 'DEEP CC RETURN → STEP IN ON BALL 3'
    cards.push({ n: '03', title: 'Return Game', stat: stat03, body: parts03.join(' '), action: action03 })

    // CARD 04: PATTERN OF PLAY
    const parts04: string[] = []
    if (sd) {
      parts04.push(sd.rallyTactic)
    } else if (strong.fhCC) {
      parts04.push(`FH CC is your strongest shot (${jd.fhCC}% weighted avg) — use it as the primary weapon. Build with depth → FH CC to open court → attack inside-out.`)
    } else {
      parts04.push('Build the rally deep with BH CC → wait for a mid-court ball → attack with FH.')
    }
    if (surf?.patternNote) parts04.push(surf.patternNote)
    if (isKnown && vsWins.length > 0) {
      const winFhCC = vsWinAvg(m => m.forehand?.cc_in)
      const winBhCC = vsWinAvg(m => m.backhand?.cc_in)
      if (winFhCC != null) parts04.push(`In your ${knownWins} win${knownWins > 1 ? 's' : ''} vs ${oppName}: FH CC was ${winFhCC}%${winBhCC != null ? `, BH CC ${winBhCC}%` : ''} — prioritise those patterns.`)
    }
    if (similarMatches.length >= 2 && simWinRate != null) {
      if (simWinRate < 40) parts04.push(`This UTR bracket has been tough (${simWinRate}% win rate) — stay patient, reduce UE, don't force the play.`)
      else if (simWinRate >= 70) parts04.push(`You handle this UTR level well (${simWinRate}%) — play your game with confidence.`)
    }
    const stat04 = `FH CC: ${jd.fhCC ?? '—'}% · BH CC: ${jd.bhCC ?? '—'}% · BH DTL: ${jd.bhDTL ?? '—'}% · Winners avg: ${jd.winners ?? '—'}`
    const watchOut04 = sd?.watchOut
      ?? (weak.ue ? `UE AVG IS ${jd.ue} — SLOW DOWN, HIT 70% PACE WHEN UNDER PRESSURE` : 'ATTACK THE FIRST SHORT BALL — DON\'T WAIT FOR THE PERFECT OPPORTUNITY')
    cards.push({ n: '04', title: 'Pattern of Play', stat: stat04, body: parts04.join(' '), action: `WATCH OUT: ${watchOut04}` })

    // CARD 05: PRESSURE MOMENTS
    const parts05: string[] = []
    parts05.push(surf?.tbNote ?? 'Slow down on big points. Pick a target, commit, execute.')
    if (weak.bpSaved) parts05.push(`BP saved at ${jd.bpSaved}% weighted — below 60% is critical. On deuce/ad: serve body or T, follow with FH CC.`)
    if (isKnown && historyMatches.length >= 2) {
      const winBp = vsWinAvg(m => m.shot_stats?.bp_saved_pct)
      const lossBp = vsLossAvg(m => m.shot_stats?.bp_saved_pct)
      if (winBp != null && lossBp != null && winBp - lossBp > 10)
        parts05.push(`BP saved: ${winBp}% in wins vs ${lossBp}% in losses vs ${oppName} — saving BPs is the deciding factor in this matchup.`)
    }
    const stat05 = `BP saved: ${jd.bpSaved ?? '—'}% · BP won: ${jd.bpWon ?? '—'}% (weighted)`
    const action05 = `ON BIG POINTS: ONE BREATH. ONE TARGET. COMMIT FULLY.`
    cards.push({ n: '05', title: 'Pressure & Tiebreaks', stat: stat05, body: parts05.join(' '), action: action05 })

    return cards
  }

  const focusCards = (utrValid || isKnown) ? buildCards() : []

  const buildPlan = () => [
    { l: '1st serve Ad',   v: isLefty !== '' ? `${serveAd.primary}. Mix: ${serveAd.secondary}` : `Wide or Body — pick before the toss. Target: ${jd.s1Ad ?? '—'}%+` },
    { l: '1st serve Deuce', v: isLefty !== '' ? `${serveDeuce.primary}` : `T (to BH) or Wide (opens court)` },
    { l: '2nd serve',       v: surf?.serveNote ? surf.serveNote.split('.')[0] : `Kick to body. Weighted avg: ${jd.s2Ad ?? '—'}%. Don't overthink.` },
    { l: 'Return 1st',      v: sd ? sd.returnTactic.split('.')[0] : 'Block deep CC. Depth over pace.' },
    { l: 'Rally pattern',   v: sd ? sd.rallyTactic.split('.')[0] : `Deep BH CC → wait → attack FH` },
    { l: 'Pressure points', v: `Slow down. One target. Commit. BP saved: ${jd.bpSaved ?? '—'}% weighted avg.` },
  ]

  const inp = (extra: any = {}) => ({
    background: '#161616', border: '1px solid #252525', borderRadius: 8,
    padding: '10px 14px', color: '#e8d5b0', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, ...extra,
  })
  const pillBtn = (active: boolean, color = G) => ({
    padding: '5px 11px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
    letterSpacing: 0.5, cursor: 'pointer', border: `1px solid ${active ? color : '#252525'}`,
    background: active ? `${color}18` : '#161616', color: active ? color : '#444',
  })

  const FocusCard = ({ n, title, stat, body, action }: any) => (
    <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginBottom: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 44, color: '#1e1e1e', lineHeight: 1, flexShrink: 0, width: 40 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e8d5b0', marginBottom: 6 }}>{title}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#444', background: '#1a1a1a', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 8 }}>{stat}</div>
        <div style={{ fontSize: 13, color: '#777', lineHeight: 1.65, marginBottom: 10 }}>{body}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: A, background: AD, padding: '5px 10px', borderRadius: 4, display: 'inline-block' }}>{action}</div>
      </div>
    </div>
  )
  const PlanRow = ({ l, v, last }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: last ? 'none' : '1px solid #1a1a1a', gap: 16 }}>
      <span style={{ fontSize: 12, color: '#444', minWidth: 140, flexShrink: 0 }}>{l}</span>
      <span style={{ fontSize: 12, color: '#999', textAlign: 'right' }}>{v}</span>
    </div>
  )

  const ready = utrValid || isKnown

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, letterSpacing: 3, color: '#e8d5b0' }}>Next Match Strategy</div>
        <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 4 }}>
          {matches.length > 0 ? `${matches.length} matches · last 5 weighted 2× · updated after every session` : 'Add your first match to get personalised strategy'}
        </div>
      </div>

      {/* INPUTS */}
      <div style={{ background: '#141414', border: '1px solid #252525', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 16 }}>Next Opponent</div>

        {/* Row 1: opponent + UTR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>OPPONENT <span style={{ color: '#2a2a2a' }}>optional</span></div>
            <select
              value={oppName}
              onChange={e => {
                const name = e.target.value
                setOppName(name)
                if (name) {
                  const lastM = matches.filter(m => m.opponent?.name === name).slice(-1)[0]
                  if (lastM?.opponent?.utr) setOppUtr(String(lastM.opponent.utr))
                }
              }}
              style={inp({ cursor: 'pointer', appearance: 'none' as any, color: oppName ? '#e8d5b0' : '#555' })}
            >
              <option value=''>— New opponent —</option>
              {pastOpponents.map((p: any) => {
                const pm = matches.filter(m => m.opponent?.name === p.name)
                const pw = pm.filter(m => m.score?.winner === 'JD').length
                return <option key={p.name} value={p.name}>{p.name}{p.utr ? ` · UTR ${p.utr}` : ''} ({pw}W {pm.length - pw}L)</option>
              })}
            </select>
            {isKnown && <div style={{ marginTop: 5, fontSize: 10, fontFamily: 'monospace', color: G }}>✓ {historyMatches.length} match{historyMatches.length > 1 ? 'es' : ''} · {knownWins}W {knownLosses}L</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>UTR LEVEL <span style={{ color: A, marginLeft: 4 }}>required</span></div>
            <input value={oppUtr} onChange={e => setOppUtr(e.target.value)} placeholder="e.g. 3.2" type="number" step="0.1" min="0" max="16"
              style={inp({ borderColor: oppUtr && !utrValid ? R : '#252525' })} />
            {utrValid && <div style={{ marginTop: 5, fontSize: 10, fontFamily: 'monospace', color: '#555' }}>
              {utr < 2.5 ? 'Below your level' : utr < 3.3 ? 'Around your level (~3.1 est.)' : utr < 4.0 ? 'Above your level' : 'Well above — tough match'}
              {simWinRate != null && similarMatches.length >= 2 ? ` · ${simWinRate}% vs similar UTR` : ''}
            </div>}
          </div>
        </div>

        {/* Row 2: surface + style + lefty */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 10 }}>Optional — add these for a sharper plan</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: 16 }}>
            {/* Surface */}
            <div>
              <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>SURFACE</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['clay', 'hard', 'grass'] as const).map(s => (
                  <button key={s} onClick={() => setSurface(surface === s ? '' : s)} style={pillBtn(surface === s, '#c084fc')}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* Style */}
            <div>
              <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>PLAYING STYLE</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as any }}>
                {(['baseliner', 'serveVolley', 'allCourt', 'pusher', 'bigServer'] as const).map(s => (
                  <button key={s} onClick={() => setOppStyle(oppStyle === s ? '' : s)} style={pillBtn(oppStyle === s, B)}>
                    {styleMap[s].label}
                  </button>
                ))}
              </div>
            </div>
            {/* Lefty */}
            <div>
              <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>HANDEDNESS</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['no', 'yes'] as const).map(v => (
                  <button key={v} onClick={() => setIsLefty(isLefty === v ? '' : v)} style={pillBtn(isLefty === v, A)}>
                    {v === 'yes' ? 'Lefty' : 'Right-handed'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No input yet */}
      {!ready && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#2a2a2a', fontFamily: 'monospace', fontSize: 12 }}>
          Enter opponent UTR above to generate your match strategy ↑
        </div>
      )}

      {/* STRATEGY CONTENT */}
      {ready && (
        <>
          {/* Matchup banner */}
          <div style={{ background: '#141414', border: '1px solid #252525', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as any, gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#444', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>Matchup</div>
              <div style={{ fontSize: 14, color: '#e8d5b0', fontWeight: 600 }}>
                {oppName || 'New Opponent'}{utrValid ? ` · UTR ${utr.toFixed(1)}` : ''}{sd ? ` · ${sd.label}` : ''}{isLefty === 'yes' ? ' · Lefty' : ''}{surface ? ` · ${surface.charAt(0).toUpperCase() + surface.slice(1)}` : ''}
              </div>
              {similarMatches.length >= 2 && simWinRate != null && (
                <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginTop: 2 }}>
                  Similar UTR bracket: {simWinRate}% win rate ({simWins}W {similarMatches.length - simWins}L across {similarMatches.length} matches)
                </div>
              )}
            </div>
            {isKnown && knownWinRate != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: knownWinRate >= 50 ? G : R }}>{knownWinRate}%</div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', letterSpacing: 1 }}>WIN RATE VS THEM</div>
              </div>
            )}
          </div>

          {/* Known opponent stats breakdown */}
          {isKnown && (
            <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>Stats vs {oppName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { l: 'Record',      v: `${knownWins}W ${knownLosses}L` },
                  { l: '1st Srv Ad',  v: vsAvg(m => m.serve?.first?.pct_ad) != null ? `${vsAvg(m => m.serve?.first?.pct_ad)}%` : '—' },
                  { l: 'Return 1st',  v: vsAvg(m => m.return?.first?.pct_ad) != null ? `${vsAvg(m => m.return?.first?.pct_ad)}%` : '—' },
                  { l: 'Avg UE',      v: vsAvg(m => m.shot_stats?.ue) ?? '—' },
                  { l: 'FH CC',       v: vsAvg(m => m.forehand?.cc_in) != null ? `${vsAvg(m => m.forehand?.cc_in)}%` : '—' },
                ].map(({ l, v }, i) => (
                  <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: '#e8d5b0' }}>{v}</div>
                    <div style={{ fontSize: 8, color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontFamily: 'monospace' }}>{l}</div>
                  </div>
                ))}
              </div>
              {vsWins.length > 0 && vsLosses.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'In Wins', matches: vsWins, color: G },
                    { label: 'In Losses', matches: vsLosses, color: R },
                  ].map(({ label, matches: ms, color }) => (
                    <div key={label} style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, letterSpacing: 1, color, fontFamily: 'monospace', marginBottom: 6 }}>{label}</div>
                      {[
                        ['1st Srv', avg(ms.map(m => m.serve?.first?.pct_ad)), '%'],
                        ['UE', avg(ms.map(m => m.shot_stats?.ue)), ''],
                        ['FH CC', avg(ms.map(m => m.forehand?.cc_in)), '%'],
                      ].map(([l, v, u], i) => v != null && (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                          <span style={{ color: '#444' }}>{l}</span>
                          <span style={{ fontFamily: 'monospace', color }}>{v}{u}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any }}>
                {historyMatches.map((m: any, i: number) => (
                  <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 4, background: m.score?.winner === 'JD' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', color: m.score?.winner === 'JD' ? G : R, border: `1px solid ${m.score?.winner === 'JD' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                    {m.score?.winner === 'JD' ? 'W' : 'L'} · {fmtDate(m.date)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opponent Tendencies — data panel from recorded opp_shots */}
          {isKnown && (() => {
            const osm = historyMatches.filter((m: any) => m.opp_shots != null)
            if (osm.length === 0) return null
            const oS1  = avg(osm.map((m: any) => m.opp_shots?.serve?.first?.pct_ad))
            const oS1Spd = avg(osm.map((m: any) => m.opp_shots?.serve?.first?.spd_ad))
            const oS2  = avg(osm.map((m: any) => m.opp_shots?.serve?.second?.pct_ad))
            const oFhCC = avg(osm.map((m: any) => m.opp_shots?.forehand?.cc_in))
            const oFhDTL = avg(osm.map((m: any) => m.opp_shots?.forehand?.dtl_in))
            const oBhCC = avg(osm.map((m: any) => m.opp_shots?.backhand?.cc_in))
            const oBhDTL = avg(osm.map((m: any) => m.opp_shots?.backhand?.dtl_in))
            const oFhSpd = avg(osm.map((m: any) => m.opp_shots?.forehand?.spd_cc))
            const oBhSpd = avg(osm.map((m: any) => m.opp_shots?.backhand?.spd_cc))
            const oWinners = avg(osm.map((m: any) => m.opp_shots?.stats?.winners))
            const oUE     = avg(osm.map((m: any) => m.opp_shots?.stats?.ue))
            const oBpWon  = avg(osm.map((m: any) => m.opp_shots?.stats?.bp_won_pct))
            const oTopspin = avg(osm.map((m: any) => m.opp_shots?.distribution?.topspin_pct))
            const oSlice   = avg(osm.map((m: any) => m.opp_shots?.distribution?.slice_pct))

            const Row = ({ l, v, note }: { l: string; v: string | null; note?: string }) =>
              v == null ? null : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: 11, color: '#555', minWidth: 130 }}>{l}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e8d5b0' }}>{v}</span>
                    {note && <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{note}</span>}
                  </div>
                </div>
              )

            return (
              <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    {oppName} — Recorded Tendencies
                  </div>
                  <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace' }}>from {osm.length} match{osm.length > 1 ? 'es' : ''}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>Serve</div>
                    <Row l="1st Serve %" v={oS1 != null ? `${oS1}%` : null} note={oS1 != null ? (oS1 < 55 ? '← lots of 2nd serves' : oS1 > 70 ? '← reliable, read early' : undefined) : undefined} />
                    <Row l="1st Serve Speed" v={oS1Spd != null ? `${oS1Spd} km/h` : null} note={oS1Spd != null ? (oS1Spd < 110 ? '← step in & attack' : oS1Spd > 150 ? '← block deep' : undefined) : undefined} />
                    <Row l="2nd Serve %" v={oS2 != null ? `${oS2}%` : null} />
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>Groundstrokes</div>
                    <Row l="FH CC In %" v={oFhCC != null ? `${oFhCC}%` : null} note={oFhCC != null && oFhCC < 65 ? '← misses it often' : undefined} />
                    <Row l="FH DTL In %" v={oFhDTL != null ? `${oFhDTL}%` : null} />
                    <Row l="FH Speed CC" v={oFhSpd != null ? `${oFhSpd} km/h` : null} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>Stats</div>
                    <Row l="Winners / match" v={oWinners != null ? `${oWinners}` : null} />
                    <Row l="Unforced Errors" v={oUE != null ? `${oUE}` : null} note={oUE != null ? (oUE > 35 ? '← error-prone' : oUE < 20 ? '← disciplined' : undefined) : undefined} />
                    <Row l="BP Won %" v={oBpWon != null ? `${oBpWon}%` : null} note={oBpWon != null && oBpWon < 35 ? '← struggles on BP' : undefined} />
                    {(oTopspin != null || oSlice != null) && <>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>Backhand</div>
                      <Row l="BH CC In %" v={oBhCC != null ? `${oBhCC}%` : null} note={oBhCC != null && oBhCC < 65 ? '← push wide to BH' : undefined} />
                      <Row l="BH DTL In %" v={oBhDTL != null ? `${oBhDTL}%` : null} />
                      <Row l="BH Speed CC" v={oBhSpd != null ? `${oBhSpd} km/h` : null} />
                    </>}
                    {(oTopspin != null || oSlice != null) && <>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#333', fontFamily: 'monospace', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>Spin Mix</div>
                      <Row l="Topspin %" v={oTopspin != null ? `${oTopspin}%` : null} />
                      <Row l="Slice %" v={oSlice != null ? `${oSlice}%` : null} />
                    </>}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Field Notes — what worked / what didn't in past H2H matches */}
          {isKnown && (() => {
            const notedMatches = historyMatches
              .filter((m: any) => m.what_worked?.length || m.what_didnt?.length)
              .slice(-3)
            if (notedMatches.length === 0) return null
            return (
              <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: '#444', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 14 }}>
                  Field Notes vs {oppName}
                </div>
                {notedMatches.reverse().map((m: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < notedMatches.length - 1 ? 14 : 0, paddingBottom: i < notedMatches.length - 1 ? 14 : 0, borderBottom: i < notedMatches.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', marginBottom: 6 }}>
                      {fmtDate(m.date)} · {m.score?.winner === 'JD' ? <span style={{ color: G }}>W</span> : <span style={{ color: R }}>L</span>} {m.score?.sets}
                    </div>
                    {m.what_worked?.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        {m.what_worked.map((w: string, j: number) => (
                          <div key={j} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#666', lineHeight: 1.5 }}>
                            <span style={{ color: G, flexShrink: 0 }}>✓</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.what_didnt?.length > 0 && (
                      <div>
                        {m.what_didnt.map((w: string, j: number) => (
                          <div key={j} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#666', lineHeight: 1.5 }}>
                            <span style={{ color: R, flexShrink: 0 }}>✗</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Focus cards */}
          {focusCards.map(c => <FocusCard key={c.n} {...c} />)}

          {/* Match plan */}
          <div style={{ background: '#141414', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginTop: 6 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#333', textTransform: 'uppercase', marginBottom: 14 }}>
              Match Plan — {oppName || 'Opponent'}{utrValid ? ` UTR ${utr.toFixed(1)}` : ''}
            </div>
            {buildPlan().map(({ l, v }, i, arr) => <PlanRow key={i} l={l} v={v} last={i === arr.length - 1} />)}
          </div>
        </>
      )}
    </div>
  )
}
