import { brilliantCut, ellipsePts, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { sparklePath, type ArtProps } from '../svg'

const RAMP: Ramp = ['#e3ecff', '#97b4ff', '#5a82f5', '#3157d6', '#1d3aa3', '#0f2268']
const SHAPE = brilliantCut(ellipsePts(50, 50, 29, 37, 16), [50, 50], 0.54, RAMP)
const GLINT = sparklePath(39, 35, 7)
const SPARK = sparklePath(63, 68, 4)

/** Oval-cut sapphire. */
export function GemOval({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#eaf0ff', '#8fadff', '#4a72ea']}
      edge="#0e2060"
      glint={GLINT}
      spark={SPARK}
    />
  )
}

GemOval.viewBox = [15, 7, 71, 89] as const
