import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

const HEART =
  'M50 82 C 31 69, 13 56, 13 35 C 13 22, 22 13, 33 13 C 41 13, 47 17.5, 50 24 ' +
  'C 53 17.5, 59 13, 67 13 C 78 13, 87 22, 87 35 C 87 56, 69 69, 50 82 Z'
const GLINT = sparklePath(33, 22, 6.5)

/** Puffy liquid-chrome heart. */
export function ChromeHeart({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={HEART} />
      </DieCut>
      <ChromeBody id={k.id('heart')} d={HEART} box={[13, 13, 87, 82]} horizon={0.48}>
        <path
          d="M21.5 27 C 24 20, 33 17.5, 36 21 C 38.5 24.5, 31 30.5, 25.5 32 C 21.5 33, 20 30.5, 21.5 27 Z"
          fill="#fff"
          fillOpacity={0.92}
        />
        <ellipse cx="71" cy="21" rx="6" ry="2.4" transform="rotate(18 71 21)" fill="#fff" fillOpacity={0.75} />
        <path d="M20 52 C 27 62, 37 70, 47 76" fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.8} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeHeart.viewBox = [2, 2, 98, 94] as const
