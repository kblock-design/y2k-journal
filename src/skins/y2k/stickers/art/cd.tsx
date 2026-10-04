import { DieCut, HoloStops } from '../parts'
import { keys, type ArtProps } from '../svg'

/* Disc centre (50,49), radius 40. Wedges are the rainbow light-catch. */
const WEDGE_A = 'M50 49 L63.68 11.41 A40 40 0 0 1 86.25 32.1 Z'
const WEDGE_A2 = 'M50 49 L36.32 86.59 A40 40 0 0 1 13.75 65.9 Z'
const WEDGE_B = 'M50 49 L15.36 29 A40 40 0 0 1 30 14.36 Z'
const WEDGE_B2 = 'M50 49 L84.64 69 A40 40 0 0 1 70 83.64 Z'
const HEART_DOODLE =
  'M64 75 C 60 72, 58 69.5, 58 67.5 C 58 65.5, 59.6 64.5, 61 64.5 C 62.3 64.5, 63.4 65.4, 64 66.6 ' +
  'C 64.6 65.4, 65.7 64.5, 67 64.5 C 68.4 64.5, 70 65.5, 70 67.5 C 70 69.5, 68 72, 64 75 Z'

/** Holographic burned CD with a pink heart doodle. */
export function Cd({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('silver')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.3" stopColor="#f7f7fc" />
          <stop offset="1" stopColor="#c4c7dd" />
        </radialGradient>
        <linearGradient id={k.id('holo')} x1="0" y1="0" x2="1" y2="1">
          <HoloStops />
        </linearGradient>
        <linearGradient id={k.id('rainbow')} x1="0" y1="0" x2="1" y2="1">
          <HoloStops colors={['#ff7cc8', '#c78bff', '#7fb2ff', '#7ff0d6', '#fff07a', '#ff9a8a']} />
        </linearGradient>
      </defs>
      <DieCut>
        <circle cx="50" cy="49" r="40" />
      </DieCut>
      <circle cx="50" cy="49" r="40" fill={k.url('silver')} />
      <circle cx="50" cy="49" r="40" fill={k.url('holo')} fillOpacity={0.5} />
      <path d={WEDGE_A} fill={k.url('rainbow')} fillOpacity={0.9} />
      <path d={WEDGE_A2} fill={k.url('rainbow')} fillOpacity={0.9} />
      <path d={WEDGE_B} fill={k.url('holo')} fillOpacity={0.85} />
      <path d={WEDGE_B2} fill={k.url('holo')} fillOpacity={0.85} />
      {/* grooves */}
      <g fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={0.8}>
        <circle cx="50" cy="49" r="33" />
        <circle cx="50" cy="49" r="26" />
        <circle cx="50" cy="49" r="20" />
      </g>
      <circle cx="50" cy="49" r="40" fill="none" stroke="#a9acc7" strokeWidth={1.2} />
      <path d="M18.82 31 A36 36 0 0 1 35.93 15.86" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" />
      {/* doodle */}
      <path d={HEART_DOODLE} fill="#ff2e93" fillOpacity={0.3} stroke="#ff2e93" strokeWidth={1.4} strokeLinejoin="round" />
      {/* hub */}
      <circle cx="50" cy="49" r="15" fill="#eef0f8" fillOpacity={0.92} stroke="#b8bbd4" strokeWidth={0.8} />
      <circle cx="50" cy="49" r="10" fill="#dfe2ef" stroke="#c3c6dc" strokeWidth={0.6} />
      <circle cx="50" cy="49" r="5" fill="#fff" stroke="#aeb2cc" strokeWidth={1} />
      <path d="M41 43 A11 11 0 0 1 47 38.4" fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
    </>
  )
}

Cd.viewBox = [0, 0, 100, 100] as const
