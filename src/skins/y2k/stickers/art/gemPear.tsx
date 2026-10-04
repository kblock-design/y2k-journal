import { brilliantCut, type Pt, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

/* Teardrop: x = 50 + 34·sin t·sin(t/2), y = 50 − 40·cos t, so the point is at the top (50,10). */
const GIRDLE: readonly Pt[] = Array.from({ length: 14 }, (_, i) => {
  const t = (2 * Math.PI * i) / 14
  return [50 + 34 * Math.sin(t) * Math.sin(t / 2), 50 - 40 * Math.cos(t)] as const
})
const RAMP: Ramp = ['#e6fffd', '#9ff3ee', '#4fdcd8', '#1fb0b5', '#0f7f8c', '#0a5562']
const SHAPE = brilliantCut(GIRDLE, [50, 60], 0.5, RAMP)
const GLINT = sparklePath(41, 50, 7)
const SPARK = sparklePath(62, 76, 4)

/** Pear-cut aquamarine. */
export function GemPear({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#e9fffe', '#8cebe8', '#38c5c8']}
      edge="#0a4f5a"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

GemPear.viewBox = [18, 4, 66, 95] as const
