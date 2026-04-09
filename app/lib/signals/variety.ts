/**
 * Variety helper — how many distinct, viable shot patterns does JD use?
 *
 * Reads `signals.strokes` (StrokeSignal[]) which already tags each of the 4
 * stroke combinations (FH CC, FH DTL, BH CC, BH DTL) by usage / effectiveness.
 *
 * A stroke counts as "in the toolbox" if usage >= 8% AND pctIn >= 65%.
 * (Below either threshold = either too rare to matter or too unreliable to
 * count as a real weapon.)
 *
 * Returns a verdict from "Narrow" (0–1 viable strokes) to "Full toolbox" (4).
 */
import type { StrokeSignal } from './types'

export type VarietyResult = {
  viable: number                // 0..4
  total: number                 // always 4 (4 stroke combos tracked)
  viableStrokes: string[]       // labels of the strokes that count
  label: 'Narrow' | 'Limited' | 'Balanced' | 'Full toolbox'
  insight: string
}

const USAGE_FLOOR = 8   // %
const ACCURACY_FLOOR = 65 // %

export function computeVariety(strokes: StrokeSignal[]): VarietyResult {
  if (strokes.length === 0) {
    return {
      viable: 0,
      total: 4,
      viableStrokes: [],
      label: 'Narrow',
      insight: 'Not enough stroke data yet',
    }
  }

  const viable = strokes.filter(s => s.usage >= USAGE_FLOOR && s.pctIn >= ACCURACY_FLOOR)
  const labels = viable.map(s => s.label)

  let label: VarietyResult['label']
  if (viable.length >= 4) label = 'Full toolbox'
  else if (viable.length === 3) label = 'Balanced'
  else if (viable.length === 2) label = 'Limited'
  else label = 'Narrow'

  const insight = viable.length === 0
    ? 'No stroke clears 8% use + 65% in'
    : viable.length === 4
      ? 'All 4 patterns reliable'
      : `${viable.length} of 4 patterns reliable`

  return {
    viable: viable.length,
    total: 4,
    viableStrokes: labels,
    label,
    insight,
  }
}
