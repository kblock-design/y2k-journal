import { brilliantCut, type Pt, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

/** Square girdle with points at the corners and mid-edges, so the crown shows chevrons. */
const GIRDLE: readonly Pt[] = [
  [18, 18], [50, 18], [82, 18], [82, 50], [82, 82], [50, 82], [18, 82], [18, 50],
]
const RAMP: Ramp = ['#ffe1e6', '#ff8ea2', '#f2435f', '#c8173c', '#930826', '#5c0015']
const SHAPE = brilliantCut(GIRDLE, [50, 50], 0.52, RAMP)
const GLINT = sparklePath(36, 35, 7)
const SPARK = sparklePath(68, 68, 4)

/** Princess-cut ruby. */
export function GemPrincess({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#ffe8ec', '#ff8095', '#e02a4a']}
      edge="#560014"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

GemPrincess.viewBox = [12, 12, 77, 78] as const
