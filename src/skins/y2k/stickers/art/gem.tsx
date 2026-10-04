import { brilliantCut, type Pt, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

/** Faceted heart girdle, clockwise from the top notch. */
const GIRDLE: readonly Pt[] = [
  [50, 26], [58, 16], [70, 12], [82, 16], [89, 26], [89, 39], [82, 53], [66, 69],
  [50, 84], [34, 69], [18, 53], [11, 39], [11, 26], [18, 16], [30, 12], [42, 16],
]
const RAMP: Ramp = ['#ffd6ec', '#ffa8d5', '#ff85c2', '#ff5aab', '#d41c7c', '#a80a60']
const SHAPE = brilliantCut(GIRDLE, [50, 46], 0.5, RAMP)
const GLINT = sparklePath(31, 24, 7)
const SPARK = sparklePath(70, 52, 4)

/** Heart-cut pink rhinestone with a twinkling glint. */
export function Gem({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#ffe6f3', '#ffa3d3', '#ff6fb8']}
      edge="#9c0a58"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

Gem.viewBox = [0, 0, 100, 94] as const
