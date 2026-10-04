import { octagon, stepCut, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

/* Landscape emerald cut 72 x 50 with 11-unit corners; each step is an even inset. */
const STEPS = [0, 5.5, 11, 16].map((d) => octagon(14 + d, 24 + d, 86 - d, 74 - d, 11 - d * (2 - Math.SQRT2)))
const RAMP: Ramp = ['#d9ffe9', '#7fe3a8', '#2fbf74', '#138a50', '#0a6239', '#053b22']
const SHAPE = stepCut(STEPS, [50, 49], RAMP)
const GLINT = sparklePath(34, 37, 7)
const SPARK = sparklePath(70, 62, 3.5)

/** Emerald-cut green stone with mirrored steps. */
export function GemEmerald({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#c9ffe1', '#5fd395', '#1f9c5c']}
      edge="#04331d"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

/** Wide and short. */
GemEmerald.viewBox = [8, 18, 86, 65] as const
