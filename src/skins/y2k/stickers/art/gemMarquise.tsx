import { brilliantCut, type Pt, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

/*
 * Marquise: two circular arcs meeting in points at (50,10) and (50,90), 44 wide.
 * Each arc's circle has radius R = 47.36 with its centre D = 25.36 across the axis.
 */
const D = 25.36
const R = 47.36
const PHI = Math.atan2(40, D)
const ARC: Pt[] = Array.from({ length: 7 }, (_, i) => {
  const p = -PHI + (2 * PHI * i) / 6
  return [50 - D + R * Math.cos(p), 50 + R * Math.sin(p)] as const
})
/** Down the right arc (tip to tip), then back up the mirrored left arc. */
const GIRDLE: readonly Pt[] = [...ARC, ...ARC.slice(1, -1).map(([x, y]) => [100 - x, 100 - y] as const)]
const RAMP: Ramp = ['#f4e9ff', '#d2b0ff', '#ad7bf5', '#8a50dd', '#6532b3', '#40197a']
const SHAPE = brilliantCut(GIRDLE, [50, 50], 0.5, RAMP)
const GLINT = sparklePath(44, 37, 7)
const SPARK = sparklePath(56, 70, 3.5)

/** Marquise-cut amethyst. */
export function GemMarquise({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#f6edff', '#c9a1ff', '#9a63ec']}
      edge="#3b1470"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

GemMarquise.viewBox = [22, 4, 57, 95] as const
