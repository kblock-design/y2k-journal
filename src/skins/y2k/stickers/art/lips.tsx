import { DieCut } from '../parts'
import { keys, type ArtProps } from '../svg'

const MOUTH =
  'M10 38 C 18 30, 28 18, 38 17 C 44 16.5, 47 19, 50 22 C 53 19, 56 16.5, 62 17 ' +
  'C 72 18, 82 30, 90 38 C 82 50, 68 60, 50 60 C 32 60, 18 50, 10 38 Z'
const UPPER =
  'M10 38 C 18 30, 28 18, 38 17 C 44 16.5, 47 19, 50 22 C 53 19, 56 16.5, 62 17 ' +
  'C 72 18, 82 30, 90 38 C 78 38.5, 66 40, 50 40.5 C 34 40, 22 38.5, 10 38 Z'
const LOWER = 'M10 38 C 22 38.5, 34 40, 50 40.5 C 66 40, 78 38.5, 90 38 C 82 50, 68 60, 50 60 C 32 60, 18 50, 10 38 Z'
const SEAM = 'M11 38 C 22 38.5, 34 40, 50 40.5 C 66 40, 78 38.5, 89 38'

/** Glossy hot-pink lips. */
export function Lips({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('upper')} gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="0" y2="41">
          <stop offset="0" stopColor="#ff5c9c" />
          <stop offset="1" stopColor="#c8004f" />
        </linearGradient>
        <linearGradient id={k.id('lower')} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="60">
          <stop offset="0" stopColor="#ff7ab1" />
          <stop offset="0.5" stopColor="#ff2f7d" />
          <stop offset="1" stopColor="#b3004c" />
        </linearGradient>
      </defs>
      <DieCut>
        <path d={MOUTH} />
      </DieCut>
      <path d={UPPER} fill={k.url('upper')} />
      <path d={LOWER} fill={k.url('lower')} />
      <path d={SEAM} fill="none" stroke="#7d0034" strokeWidth={1.6} strokeLinecap="round" />
      <path d={MOUTH} fill="none" stroke="#9a0040" strokeOpacity={0.4} strokeWidth={1.2} strokeLinejoin="round" />
      {/* gloss */}
      <path d="M35 47.5 C 42 45, 55 45, 63 47.5 C 58 51, 41 51, 35 47.5 Z" fill="#fff" fillOpacity={0.85} />
      <path d="M26 29 C 30 24, 35 21.5, 40 22 C 36 25, 31 28, 26 29 Z" fill="#fff" fillOpacity={0.6} />
      <path d="M60 22.5 C 64 22, 69 24, 72 27" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="68" cy="51" r="1.6" fill="#fff" fillOpacity={0.8} />
      <circle cx="30" cy="49" r="1.1" fill="#fff" fillOpacity={0.6} />
    </>
  )
}

/** Wide and short: viewBox starts at y=5 to centre the mouth. */
Lips.viewBox = [0, 5, 100, 68] as const
