import { brilliantCut, type Pt, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { HOLO, sparklePath, type ArtProps } from '../svg'

/* Chubby five-point star around (50,54): tips r 38, inner corners r 19. */
const GIRDLE: readonly Pt[] = Array.from({ length: 10 }, (_, i) => {
  const t = ((-90 + 36 * i) * Math.PI) / 180
  const r = i % 2 ? 19 : 38
  return [50 + r * Math.cos(t), 54 + r * Math.sin(t)] as const
})
const RAMP: Ramp = ['#ffffff', '#f3ecff', '#d9d4f5', '#aeb3dc', '#7d82b6', '#4f527f']
const SHAPE = brilliantCut(GIRDLE, [50, 54], 0.42, RAMP)
const GLINT = sparklePath(43, 46, 6.5)
const SPARK = sparklePath(63, 66, 3.5)

/** Star-cut aurora crystal: clear with holographic fire. */
export function GemStar({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#ffffff', '#f2eaff', '#d2dcff']}
      edge="#4b4e7a"
      glint={GLINT}
      spark={SPARK}
      fire={HOLO}
    />
  )
}

GemStar.viewBox = [8, 10, 85, 83] as const
