import { brilliantCut, ellipsePts, type Ramp } from '../cuts'
import { Stone } from '../stone'
import { HOLO, sparklePath, type ArtProps } from '../svg'

const RAMP: Ramp = ['#ffffff', '#eef4ff', '#cfdcf2', '#a5b6d6', '#7183ab', '#46557d']
const SHAPE = brilliantCut(ellipsePts(50, 50, 36, 36, 16), [50, 50], 0.56, RAMP)
const GLINT = sparklePath(36, 33, 7)
const SPARK = sparklePath(66, 64, 4)

/** Round brilliant diamond with rainbow fire. */
export function GemRound({ id }: ArtProps) {
  return (
    <Stone
      id={id}
      shape={SHAPE}
      ramp={RAMP}
      tableColors={['#ffffff', '#e8f0ff', '#bfd0ee']}
      edge="#4a5a82"
      glint={GLINT}
      spark={SPARK}
      fire={HOLO}
    />
  )
}

GemRound.viewBox = [8, 8, 86, 87] as const
