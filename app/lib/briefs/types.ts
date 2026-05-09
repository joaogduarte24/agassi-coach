import type { Match } from '@/app/types'

export interface BriefBullet {
  headline: string
  text: string
  caveat: string | null   // tap-to-reveal: source date + raw stat
}

export interface BriefSrCard {
  instruction: string
  stat: string
  target: string
}

export interface BriefServeReturn {
  returning: { deuce: BriefSrCard; ad: BriefSrCard }
  serving: { deuce: BriefSrCard; ad: BriefSrCard }
  guardrail: string
}

export interface BriefWarmupDrill {
  drill: string
  stat: string  // the data anchor: "his deuce 1st-in was 61% — you will see plenty of 2nd serves"
}

export interface BriefMentalRead {
  headline: string       // 2-3 word display, e.g. "VARIANCE, NOT LEVEL"
  text: string           // body, the move
  derivation: string     // the data path: "Counterpuncher · winners 24 = errors 24 — high-variance shotmaker signal"
}

export interface BriefInMatchRule {
  trigger: string        // e.g. "After losing serve"
  action: string         // e.g. "Next service game: 2 body serves, first ball CC to his BH"
}

export interface BriefEvidenceClaim {
  claim: string                    // surfaced statement
  data: string                     // raw numbers behind it
  matchIds: string[]               // matches that support this claim
  gap?: boolean                    // true when a gap is documented (e.g. slice% missing)
}

export type BriefConfidence = 'strong' | 'single_match' | 'limited' | 'blank'

export interface Brief {
  opponent: string
  surface: string | null
  styleTag: string | null
  headlineTrait: string | null
  isLefty: boolean
  confidence: BriefConfidence       // computed but never surfaced; used to gate plan generation
  matchesUsed: number

  expect: BriefBullet[]
  do: BriefBullet[]
  intent: string                    // top-of-DO banner — the cross-cutting mantra
  inMatchRule: BriefInMatchRule
  serveReturn: BriefServeReturn
  warmupDrills: BriefWarmupDrill[]
  mentalRead: BriefMentalRead
  evidence: BriefEvidenceClaim[]

  generatedAt: string
}

export interface GenerateBriefInput {
  opponentName: string
  allMatches: Match[]
}
