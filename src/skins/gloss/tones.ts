import type { Phase } from '../../logic/cycle'

export type Tone = 'pink' | 'sky' | 'butter' | 'mint'

/**
 * Phase → holographic pastel. Four hues roughly a quarter-turn apart on the colour wheel
 * (rose, ice blue, butter, mint), so they stay apart even as the lighter predicted tints.
 */
export const PHASE_TONE: Record<Phase, Tone> = {
  menstrual: 'pink',
  follicular: 'sky',
  ovulation: 'butter',
  luteal: 'mint',
}
