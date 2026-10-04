import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/**
 * Puffy star: outer tips r 36 around (50,53); concave sides are quadratic
 * curves whose midpoints sit at r 21, so the arms look inflated.
 */
const STAR =
  'M50 17 Q57.58 42.56 84.24 41.88 Q62.27 56.99 71.16 82.12 Q50 65.9 28.84 82.12 ' +
  'Q37.73 56.99 15.76 41.88 Q42.42 42.56 50 17 Z'

/*
 * Bevel facets: ten wedges from the centre, split along each arm's axis,
 * clipped to the star. Shade = how much each half-arm faces a top-left light.
 */
const C = '50,53'
const DARK = '#151927'
const WEDGES: ReadonlyArray<{ pts: string; fill: string; o: number }> = [
  { pts: `${C} 50,7 77.04,15.79`, fill: DARK, o: 0.22 },
  { pts: `${C} 22.96,15.79 50,7`, fill: '#fff', o: 0.4 },
  { pts: `${C} 93.75,38.79 93.75,67.21`, fill: DARK, o: 0.32 },
  { pts: `${C} 77.04,15.79 93.75,38.79`, fill: '#fff', o: 0.4 },
  { pts: `${C} 77.04,90.21 50,99`, fill: DARK, o: 0.08 },
  { pts: `${C} 93.75,67.21 77.04,90.21`, fill: DARK, o: 0.18 },
  { pts: `${C} 22.96,90.21 6.25,67.21`, fill: '#fff', o: 0.35 },
  { pts: `${C} 50,99 22.96,90.21`, fill: DARK, o: 0.32 },
  { pts: `${C} 6.25,38.79 22.96,15.79`, fill: '#fff', o: 0.35 },
  { pts: `${C} 6.25,67.21 6.25,38.79`, fill: DARK, o: 0.3 },
]
const GLINT = sparklePath(41, 44, 6)

/** Puffy 3D liquid-chrome star with bevelled arms. */
export function ChromeStar({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={STAR} />
      </DieCut>
      <ChromeBody id={k.id('star')} d={STAR} box={[15.76, 17, 84.24, 82.12]} horizon={0.5}>
        {WEDGES.map((w, i) => (
          <polygon key={i} points={w.pts} fill={w.fill} fillOpacity={w.o} />
        ))}
        {/* specular streaks */}
        <path d="M47.5 26 C 46.6 31, 45.6 35, 44 39" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeOpacity={0.95} />
        <path d="M23 43.6 C 28 44, 32 44.4, 36 45.4" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeOpacity={0.75} />
        <path d="M33 73 C 38 67, 43 63.5, 48 62" fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" strokeOpacity={0.45} />
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeStar.viewBox = [0, 0, 100, 100] as const
