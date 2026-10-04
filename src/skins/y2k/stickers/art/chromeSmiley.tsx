import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

const FACE = 'M16 50 A34 34 0 0 1 84 50 A34 34 0 0 1 16 50 Z'
const SMILE = 'M32 57 C 39 69.5, 61 69.5, 68 57'
const SMILE_LIGHT = 'M35 63.4 C 42 72, 58 72, 65 63.4'
const INK = '#171b27'
const GLINT = sparklePath(30, 27, 5.5)

/** Liquid-chrome smiley with engraved features. */
export function ChromeSmiley({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={FACE} />
      </DieCut>
      <ChromeBody id={k.id('face')} d={FACE} box={[16, 16, 84, 84]} horizon={0.44}>
        <path d="M25 37 C 26 29, 32 23, 40 21" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={3} strokeLinecap="round" />
        <ellipse cx="39.5" cy="40" rx="4.4" ry="7.2" fill={INK} />
        <ellipse cx="60.5" cy="40" rx="4.4" ry="7.2" fill={INK} />
        <circle cx="38.2" cy="36.5" r="1.6" fill="#fff" />
        <circle cx="59.2" cy="36.5" r="1.6" fill="#fff" />
        <path d={SMILE_LIGHT} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.3} strokeLinecap="round" />
        <path d={SMILE} fill="none" stroke={INK} strokeWidth={4.2} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeSmiley.viewBox = [5, 5, 92, 93] as const
