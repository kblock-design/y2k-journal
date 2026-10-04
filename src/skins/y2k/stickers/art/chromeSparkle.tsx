import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* A big four-point sparkle centred (48,52) and a small one riding its top-right. */
const MAIN = sparklePath(48, 52, 36, 0.14, 0.32)
const MINI = sparklePath(74, 26, 10, 0.14, 0.32)
const GLINT = sparklePath(42, 46, 5)

/** Puffy liquid-chrome twinkle with a little sister. */
export function ChromeSparkle({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={MAIN} />
        <path d={MINI} />
        {/* bridges the two into one die-cut */}
        <circle cx="64" cy="36" r="5" />
      </DieCut>
      <ChromeBody id={k.id('main')} d={MAIN} box={[12, 16, 84, 88]} horizon={0.52}>
        <path d="M46.6 24 C 46 32, 45 38, 42.5 45" fill="none" stroke="#fff" strokeOpacity={0.92} strokeWidth={2.2} strokeLinecap="round" />
        <path d="M20 50.5 C 28 50, 35 49.2, 41 48" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.8} strokeLinecap="round" />
      </ChromeBody>
      <ChromeBody id={k.id('mini')} d={MINI} box={[64, 16, 84, 36]} horizon={0.52}>
        <path d="M73.4 19 C 73.2 21.5, 72.8 23.5, 71.6 25" fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={1.3} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeSparkle.viewBox = [2, 6, 94, 95] as const
