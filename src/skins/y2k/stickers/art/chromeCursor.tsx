import { ChromeBody, CHROME_EDGE, DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* Classic arrow pointer: tip (22,10), left edge down to (22,80), tail out to (50..60, 90). */
const ARROW = 'M22 10 L22 80 L38.5 65 L50 90 L60 85.5 L48.5 61 L71 61 Z'
const GLINT = sparklePath(30, 25, 5)

/** Bevelled liquid-chrome mouse pointer. */
export function ChromeCursor({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <DieCut w={9 + CHROME_EDGE}>
        <path d={ARROW} />
      </DieCut>
      <ChromeBody id={k.id('arrow')} d={ARROW} box={[22, 10, 71, 90]} horizon={0.5}>
        <g fill="none" stroke="#fff" strokeLinecap="round">
          <path d="M25.6 18 V 66" strokeOpacity={0.85} strokeWidth={2.2} />
          <path d="M27 17 L52 43" strokeOpacity={0.55} strokeWidth={1.6} />
          <path d="M45 70 L51.5 84" strokeOpacity={0.45} strokeWidth={1.3} />
        </g>
      </ChromeBody>
      <path d={GLINT} fill="#fff" />
    </>
  )
}

ChromeCursor.viewBox = [11, 0, 73, 103] as const
