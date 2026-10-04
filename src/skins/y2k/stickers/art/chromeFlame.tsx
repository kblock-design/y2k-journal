import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* Three-tongue flame: small left tongue (30,30), main tip (50,8), small right tongue (76,34). */
const FLAME =
  'M50 92 C 32 92, 20 80, 20 64 C 20 50, 28 42, 30 30 C 36 38, 37 44, 38 50 ' +
  'C 42 38, 50 26, 50 8 C 60 20, 70 34, 70 48 C 74 44, 76 40, 76 34 ' +
  'C 82 44, 82 56, 80 66 C 78 81, 66 92, 50 92 Z'
/** A smaller raised flame inside the first. */
const INNER =
  'M50 84 C 40 84, 33 77, 33 68 C 33 60, 41 56, 44 50 C 47 55, 48.5 58, 50 62 ' +
  'C 52 54, 56 46, 56 38 C 63 48, 67 58, 66 68 C 65 78, 58 84, 50 84 Z'
const GLINT = sparklePath(53, 27, 4.5)

/** Liquid-chrome flame with a raised inner flame. */
export function ChromeFlame({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={FLAME} />
      </DieCut>
      <ChromeBody id={k.id('outer')} d={FLAME} box={[20, 8, 81, 92]} horizon={0.55}>
        <path d="M50.5 20 C 48.5 28, 46.5 35, 44.5 42" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeLinecap="round" />
        <path d="M30.5 37 C 28 44, 25.5 52, 25 60" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
      </ChromeBody>
      <ChromeBody id={k.id('inner')} d={INNER} box={[33, 38, 66.2, 84]} horizon={0.5}>
        <path d="M39 60 C 37 64, 36.5 68, 37.5 72" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.5} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeFlame.viewBox = [9, -2, 85, 107] as const
