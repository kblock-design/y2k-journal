import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* All four wings in one path (left pair, then the right pair mirrored about x = 50). */
const WINGS =
  'M48 38 C 42 22, 30 12, 19 14 C 9 16, 9 30, 15 38 C 21 46, 34 47, 48 43 Z ' +
  'M48 46 C 38 48, 25 54, 23 64 C 21 74, 30 80, 38 75 C 45 70, 48 58, 48 48 Z ' +
  'M52 38 C 58 22, 70 12, 81 14 C 91 16, 91 30, 85 38 C 79 46, 66 47, 52 43 Z ' +
  'M52 46 C 62 48, 75 54, 77 64 C 79 74, 70 80, 62 75 C 55 70, 52 58, 52 48 Z'
/* Raised inner panels, engraved into each wing. */
const PANELS =
  'M45 38.5 C 40 27, 31 20, 23 20.5 C 16 21, 15.5 29, 19.5 34.5 C 24.5 40.5, 34 41.5, 45 40.5 Z ' +
  'M45 49 C 37 51, 29 56, 28 63 C 27 70, 32 73, 37 70 C 42 66, 44.5 58, 45 50 Z ' +
  'M55 38.5 C 60 27, 69 20, 77 20.5 C 84 21, 84.5 29, 80.5 34.5 C 75.5 40.5, 66 41.5, 55 40.5 Z ' +
  'M55 49 C 63 51, 71 56, 72 63 C 73 70, 68 73, 63 70 C 58 66, 55.5 58, 55 50 Z'
const BODY =
  'M50 24 C 52.6 24, 54 25.6, 54 28 V 72 C 54 74.4, 52.4 76, 50 76 ' +
  'C 47.6 76, 46 74.4, 46 72 V 28 C 46 25.6, 47.4 24, 50 24 Z'
const ANTENNAE = 'M48.5 26 C 46 20, 43 16.5, 39 15 M51.5 26 C 54 20, 57 16.5, 61 15'
const GLINT = sparklePath(22, 24, 5)

/** Liquid-chrome butterfly with a chrome bar body and beaded antennae. */
export function ChromeButterfly({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('bead')} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#b9bfcd" />
          <stop offset="1" stopColor="#3c4153" />
        </radialGradient>
      </defs>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={WINGS} />
        <path d={BODY} />
        <path d={ANTENNAE} fill="none" />
        <circle cx="39" cy="15" r="3" />
        <circle cx="61" cy="15" r="3" />
      </DieCut>

      {/* antennae: dark wire with a bright core, chrome beads */}
      <path d={ANTENNAE} fill="none" stroke="#262a38" strokeWidth={3.2} strokeLinecap="round" />
      <path d={ANTENNAE} fill="none" stroke="#d4d8e3" strokeWidth={1.3} strokeLinecap="round" />
      <g stroke="#262a38" strokeWidth={1}>
        <circle cx="39" cy="15" r="3" fill={k.url('bead')} />
        <circle cx="61" cy="15" r="3" fill={k.url('bead')} />
      </g>

      <ChromeBody id={k.id('wings')} d={WINGS} box={[11, 13, 89, 77]} horizon={0.44}>
        <path d={PANELS} fill="#fff" fillOpacity={0.12} stroke="#1b1f2c" strokeOpacity={0.35} strokeWidth={1} />
        <ellipse cx="25" cy="22" rx="6" ry="2.2" transform="rotate(-22 25 22)" fill="#fff" fillOpacity={0.9} />
        <ellipse cx="75" cy="22" rx="6" ry="2.2" transform="rotate(22 75 22)" fill="#fff" fillOpacity={0.55} />
        <path d="M27 66 C 27.5 70.5, 30 73, 34 72.5" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
      </ChromeBody>
      <ChromeBody id={k.id('body')} d={BODY} box={[46, 24, 54, 76]} horizon={0.5}>
        <path d="M48.3 29 V 45" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.2} strokeLinecap="round" />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeButterfly.viewBox = [0, 2, 101, 89] as const
