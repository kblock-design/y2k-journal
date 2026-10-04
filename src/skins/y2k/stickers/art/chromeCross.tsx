import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/** Chunky plus, arms 22 wide; the bevel stroke rounds its corners. */
const PLUS = 'M39 14 H61 V39 H86 V61 H61 V86 H39 V61 H14 V39 H39 Z'
const GLINT = sparklePath(43, 43, 5.5)

/** Puffy liquid-chrome plus. */
export function ChromeCross({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={PLUS} />
      </DieCut>
      <ChromeBody id={k.id('plus')} d={PLUS} box={[14, 14, 86, 86]} horizon={0.46}>
        <g fill="none" stroke="#fff" strokeLinecap="round">
          <path d="M42.6 18.5 V 36" strokeOpacity={0.88} strokeWidth={2} />
          <path d="M18.5 42.6 H 36" strokeOpacity={0.7} strokeWidth={1.8} />
          <path d="M42.6 66 V 81" strokeOpacity={0.4} strokeWidth={1.3} />
        </g>
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeCross.viewBox = [4, 4, 94, 95] as const
