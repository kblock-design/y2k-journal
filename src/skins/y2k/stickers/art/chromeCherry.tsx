import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

const STEMS = 'M34 55 C 37 39, 46 25, 56 18 M60 58 C 61 42, 59 29, 56 18'
const LEAF = 'M57 18 C 64 9, 77 9, 84 15 C 77 22.5, 64 24, 57 18 Z'
const LEFT = 'M16 70 A16 16 0 0 1 48 70 A16 16 0 0 1 16 70 Z'
const RIGHT = 'M46 73 A15 15 0 0 1 76 73 A15 15 0 0 1 46 73 Z'
const GLINT = sparklePath(24, 61, 5)

/** Twin liquid-chrome cherries on wire stems with a chrome leaf. */
export function ChromeCherry({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={STEMS} fill="none" />
        <path d={LEAF} />
        <path d={LEFT} />
        <path d={RIGHT} />
      </DieCut>

      {/* wire stems */}
      <g fill="none" strokeLinecap="round">
        <path d={STEMS} stroke="#262a38" strokeWidth={4.6} />
        <path d={STEMS} stroke="#cfd4e0" strokeWidth={2.4} />
        <path d={STEMS} stroke="#fff" strokeOpacity={0.8} strokeWidth={0.8} transform="translate(-0.5 -0.3)" />
      </g>
      <ChromeBody id={k.id('leaf')} d={LEAF} box={[57, 10.9, 84, 21.6]} horizon={0.5}>
        <path d="M60 17.5 C 66 15.5, 74 14.8, 81 15" fill="none" stroke="#1b1f2c" strokeOpacity={0.45} strokeWidth={0.9} strokeLinecap="round" />
      </ChromeBody>
      <ChromeBody id={k.id('l')} d={LEFT} box={[16, 54, 48, 86]} horizon={0.5}>
        <ellipse cx="25" cy="62" rx="4" ry="6.2" transform="rotate(35 25 62)" fill="#fff" fillOpacity={0.9} />
        <path d="M44.2 74.5 A13 13 0 0 1 36.5 82.2" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
      </ChromeBody>
      <ChromeBody id={k.id('r')} d={RIGHT} box={[46, 58, 76, 88]} horizon={0.5}>
        <ellipse cx="54.5" cy="65.5" rx="3.6" ry="5.6" transform="rotate(35 54.5 65.5)" fill="#fff" fillOpacity={0.85} />
        <path d="M72.3 77.2 A12 12 0 0 1 65.2 84.3" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeCherry.viewBox = [5, 0, 92, 102] as const
