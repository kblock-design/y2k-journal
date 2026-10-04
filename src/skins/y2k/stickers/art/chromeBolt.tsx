import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* Zigzag bolt: top edge 50..78 at y 12, shelves at y 41 and y 56, tip at (36,94). */
const BOLT = 'M50 12 L78 12 L61 41 L78 41 L36 94 L47 56 L28 56 Z'
const GLINT = sparklePath(66, 22, 5)

/** Chunky bevelled liquid-chrome lightning bolt. */
export function ChromeBolt({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={BOLT} />
      </DieCut>
      <ChromeBody id={k.id('bolt')} d={BOLT} box={[28, 12, 78, 94]} horizon={0.44}>
        <g fill="none" stroke="#fff" strokeLinecap="round">
          <path d="M52 15.5 L74 15.5" strokeOpacity={0.9} strokeWidth={1.8} />
          <path d="M49.5 17 L33 51" strokeOpacity={0.75} strokeWidth={1.8} />
          <path d="M60 52 L43 80" strokeOpacity={0.45} strokeWidth={1.4} />
        </g>
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeBolt.viewBox = [17, 2, 74, 106] as const
