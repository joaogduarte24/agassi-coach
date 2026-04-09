/**
 * Mourinho one-liner verdict generator for the Hero card.
 *
 * Picks one of ~12 templates based on player profile signals — keeps the tone
 * direct, confident, slightly cocky. Uses real signal data to fill blanks
 * (top weakness label, top strength label, clutch state, biggest correlation).
 *
 * Returns a single sentence. Falls back to a generic line if signals are too
 * thin.
 */
import type { SignalSet } from './types'

type VerdictInputs = {
  profile: SignalSet['jdProfile']
  topCorrelation: SignalSet['correlations'][0] | undefined
  topStroke: SignalSet['strokes'][0] | undefined
  worstStroke: SignalSet['strokes'][0] | undefined
}

const FALLBACK = 'Too early to read you. Play more matches and the picture will sharpen.'

/**
 * Templates organized by archetype. Each takes the input signals and returns
 * a one-liner OR null (meaning "not enough data to use this template").
 */
const TEMPLATES: Array<(i: VerdictInputs) => string | null> = [
  // Glass jaw — strong overall but a clear leak that costs matches
  ({ profile, topCorrelation, worstStroke }) => {
    if (!profile?.weapon?.label || profile.weapon.label === 'Unknown' || !worstStroke) return null
    const weak = worstStroke.label.toLowerCase()
    const wpn = profile.weapon.label.toLowerCase()
    return `A puncher with a glass jaw — when the ${wpn} lands, you bully them; when the ${weak} cracks, you give the match away.`
  },

  // Counter-puncher — clutch + strong return
  ({ profile, topCorrelation }) => {
    if (!profile?.clutch || profile.clutch.delta < 5) return null
    return `You let them play, then you mug them — the deeper the match goes, the more dangerous you get.`
  },

  // First-strike — serve dominant
  ({ topCorrelation, profile }) => {
    if (!topCorrelation || !topCorrelation.label?.toLowerCase().includes('serve')) return null
    return `When the first serve lands, the match is yours. When it doesn't, it's a coin flip.`
  },

  // Aggression — high winners high UE
  ({ profile }) => {
    if (!profile?.aggression || profile.aggression.index < 3) return null
    return `You don't grind, you swing. It's brave, it's brutal, and it's working — most days.`
  },

  // Liability — top stroke is a fix
  ({ worstStroke }) => {
    if (!worstStroke || worstStroke.tag !== 'liability') return null
    return `Your ${worstStroke.label.toLowerCase()} is the door opponents walk through. Close it and you change tier.`
  },

  // Hidden weapon — top stroke is underused
  ({ topStroke }) => {
    if (!topStroke || topStroke.tag !== 'hidden_weapon') return null
    return `Your ${topStroke.label.toLowerCase()} is your best shot and you barely use it. Trust it more — that's the unlock.`
  },

  // Lopsided — one wing dominates
  ({ profile }) => {
    if (!profile?.weapon?.label || profile.weapon.label === 'Unknown' || !profile?.weakness?.label || profile.weakness.label === 'Unknown') return null
    return `One wing wins matches, the other loses them. ${profile.weapon.label} on, ${profile.weakness.label} off — and you're a different player.`
  },

  // Pure correlation lead
  ({ topCorrelation }) => {
    if (!topCorrelation || topCorrelation.lift == null || topCorrelation.lift < 30) return null
    return `${topCorrelation.insight} That's not a coincidence — that's the pattern of your matches.`
  },

  // Generic strong but inconsistent
  ({ profile }) => {
    if (!profile) return null
    return `You have the tools. The question every match is whether they show up at the same time.`
  },
]

export function generateVerdict(signals: SignalSet): string {
  const inputs: VerdictInputs = {
    profile: signals.jdProfile,
    topCorrelation: signals.correlations[0],
    topStroke: signals.strokes[0],
    worstStroke: signals.strokes.find(s => s.tag === 'liability') || signals.strokes[signals.strokes.length - 1],
  }

  for (const tpl of TEMPLATES) {
    try {
      const out = tpl(inputs)
      if (out) return out
    } catch {
      // Templates may throw on bad data — keep trying.
    }
  }

  return FALLBACK
}
