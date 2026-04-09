/**
 * Template-based coach reads for §4 (strokes), §6 (swings), §7 (big moments).
 * v1.2 ships with templates. v1.3 upgrades to AI-generated via /api/coaching-read.
 */
import type { StrokeSignal, Signal, SignalSet } from './types'

// ─── §4 Strokes coach read ─────────────────────────────────────────────────

export function strokesCoachRead(strokes: StrokeSignal[]): string {
  const weapons = strokes.filter(s => s.tag === 'hidden_weapon' || s.tag === 'reliable')
  const fixes = strokes.filter(s => s.tag === 'liability' || s.tag === 'overused')
  const topWeapon = weapons[0]
  const topFix = fixes[0]

  if (!topWeapon && !topFix) return 'Not enough stroke data to read yet. Log more matches with SwingVision.'

  const parts: string[] = []

  if (topWeapon) {
    const usage = topWeapon.usage
    if (usage != null && usage < 20) {
      parts.push(`Your ${topWeapon.label.toLowerCase()} is your best shot and you barely use it — ${topWeapon.pctIn}% in at only ${usage}% usage. Trust it more.`)
    } else if (usage != null) {
      parts.push(`Your ${topWeapon.label.toLowerCase()} is carrying you — ${topWeapon.pctIn}% in, ${usage}% of your shots.`)
    } else {
      parts.push(`Your ${topWeapon.label.toLowerCase()} is carrying you — ${topWeapon.pctIn}% in.`)
    }
  }

  if (topFix) {
    parts.push(`The ${topFix.label.toLowerCase()} is bleeding points at ${topFix.pctIn}% in. ${topFix.pctIn < 60 ? 'Only go there on short balls above the net.' : 'Tighten the margin before using it under pressure.'}`)
  }

  if (topWeapon && topFix) {
    parts.push(`This week: build rallies through ${topWeapon.label.split(' ')[0]} ${topWeapon.label.split(' ')[1]?.toLowerCase() || ''}, limit ${topFix.label.split(' ')[0]} ${topFix.label.split(' ')[1]?.toLowerCase() || ''} to opportunistic shots.`)
  }

  return parts.join(' ')
}

// ─── §6 Swings coach read ───────────────────────────────────────────────────

export function swingsCoachRead(correlations: Signal[], journal: Signal[]): string {
  const all = [...correlations, ...journal].sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))
  const top = all[0]
  const second = all[1]

  if (!top) return 'Not enough match data to identify patterns yet.'

  const parts: string[] = []

  // Lead with the biggest lever
  if (top.label.toLowerCase().includes('serve')) {
    parts.push("Your serve is the master switch — when it's on, everything opens up.")
  } else if (top.label.toLowerCase().includes('ue') || top.label.toLowerCase().includes('error')) {
    parts.push("Error control is your biggest lever — when the UE count drops, your win rate doubles.")
  } else if (top.label.toLowerCase().includes('recovery')) {
    parts.push("Your body is talking — recovery score predicts your results more than any stat on court.")
  } else if (top.label.toLowerCase().includes('bp')) {
    parts.push("Break points are where your matches are decided — convert there and the rest follows.")
  } else {
    parts.push(`${top.label} is your biggest swing factor.`)
  }

  // Add the surprise (journal or context if available)
  if (second && second.category === 'journal') {
    parts.push(`But don't overlook the off-court side — ${second.label.toLowerCase()} shifts your win rate almost as much.`)
  } else if (second) {
    parts.push(`${second.label} is your second lever — address both and you change tier.`)
  }

  return parts.join(' ')
}

// ─── §7 Big moments coach read ─────────────────────────────────────────────

type BigMoment = { label: string; good: boolean; record: string }

export function bigMomentsCoachRead(moments: BigMoment[]): string {
  const strong = moments.filter(m => m.good)
  const weak = moments.filter(m => !m.good)

  if (strong.length === 0 && weak.length === 0) return 'Not enough pressure-situation data to read yet.'

  const parts: string[] = []

  if (strong.length > 0) {
    const labels = strong.map(m => m.label.toLowerCase()).join(' and ')
    parts.push(`You rise on ${labels}`)
  }

  if (weak.length > 0) {
    const labels = weak.map(m => m.label.toLowerCase()).join(' and ')
    if (parts.length > 0) {
      parts.push(`— but ${labels} expose you.`)
    } else {
      parts.push(`${weak[0].label} and ${weak.length > 1 ? weak[1].label.toLowerCase() : 'tight moments'} are where you leak.`)
    }
  } else {
    parts[0] += '.'
  }

  if (weak.some(m => m.label.toLowerCase().includes('tiebreak'))) {
    parts.push('The mental edge disappears when points matter equally.')
  } else if (weak.some(m => m.label.toLowerCase().includes('tight'))) {
    parts.push('When margins are thin, you need a default play — not a decision.')
  }

  return parts.join(' ')
}
