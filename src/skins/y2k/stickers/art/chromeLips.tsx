import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

const MOUTH =
  'M14 38 C 21.2 30.8, 30.2 20, 39.2 19.1 C 44.6 18.65, 47.3 20.9, 50 23.6 ' +
  'C 52.7 20.9, 55.4 18.65, 60.8 19.1 C 69.8 20, 78.8 30.8, 86 38 ' +
  'C 78.8 48.8, 66.2 57.8, 50 57.8 C 33.8 57.8, 21.2 48.8, 14 38 Z'
const SEAM = 'M15 38 C 24.8 38.45, 35.6 39.8, 50 40.25 C 64.4 39.8, 75.2 38.45, 85 38'
/** The lower lip's top edge catching the light just under the seam. */
const SEAM_LIGHT = 'M18 40 C 26 40.4, 36 41.6, 50 42 C 64 41.6, 74 40.4, 82 40'
const GLINT = sparklePath(61, 47, 4.5)

/** Pouty liquid-chrome lips. */
export function ChromeLips({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={MOUTH} />
      </DieCut>
      <ChromeBody id={k.id('lips')} d={MOUTH} box={[14, 18.6, 86, 57.8]} horizon={0.32}>
        <path d={SEAM} fill="none" stroke="#1a1e2b" strokeWidth={2.4} strokeLinecap="round" />
        <path d={SEAM_LIGHT} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.1} strokeLinecap="round" />
        {/* gloss */}
        <path d="M36 47.5 C 42 45.2, 56 45.2, 63 47.5 C 58 51, 41 51, 36 47.5 Z" fill="#fff" fillOpacity={0.92} />
        <path d="M26 30 C 30 25.5, 34.5 23, 39.5 22.8" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeLinecap="round" />
        <path d="M60.5 23 C 64.5 22.8, 69 25, 72 28" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

/** Wide and short. */
ChromeLips.viewBox = [3, 8, 96, 63] as const
