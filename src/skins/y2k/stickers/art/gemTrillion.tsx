import { brilliantCut, type Pt, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

/* Point-up triangle whose sides bow outward by 3 units (two girdle points per side). */
const CORNERS: readonly Pt[] = [[50, 14], [87, 78], [13, 78]]
const BOW = 3
const GIRDLE: readonly Pt[] = CORNERS.flatMap(([ax, ay], i) => {
  const [bx, by] = CORNERS[(i + 1) % 3]
  const len = Math.hypot(bx - ax, by - ay)
  // Outward normal of a clockwise edge (y points down).
  const nx = (by - ay) / len
  const ny = -(bx - ax) / len
  return [1 / 3, 2 / 3].reduce<Pt[]>(
    (out, f) => [...out, [ax + (bx - ax) * f + nx * BOW, ay + (by - ay) * f + ny * BOW] as const],
    [[ax, ay]],
  )
})
const RAMP: Ramp = ['#fff8d6', '#ffe48a', '#ffc53d', '#f29b12', '#c46f05', '#7e4300']
const SHAPE = brilliantCut(GIRDLE, [50, 57], 0.5, RAMP)
const GLINT = sparklePath(43, 48, 7)
const SPARK = sparklePath(64, 68, 3.5)

/** Trillion-cut citrine. */
export function GemTrillion({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#fffbe3', '#ffdf73', '#f7b52a']}
      edge="#6e3a00"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

GemTrillion.viewBox = [7, 8, 87, 82] as const
