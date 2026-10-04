import type { Phase } from '../../logic/cycle'
import type { Tone } from './shapes'

/**
 * Phase → pastel. Pink for the period (the colour people already read as "period", kept soft),
 * blue for the fresh follicular stretch, butter yellow for the short bright ovulation window,
 * sage green for the slower luteal wind-down. Four different hues, so they stay apart even
 * as the lighter "predicted" tints.
 */
export const PHASE_TONE: Record<Phase, Tone> = {
  menstrual: 'pink',
  follicular: 'blue',
  ovulation: 'yellow',
  luteal: 'green',
}
