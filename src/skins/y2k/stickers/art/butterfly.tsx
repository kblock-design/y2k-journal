import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

/* Left half only; the right half is the same group mirrored about x = 50. */
const UPPER = 'M48 38 C 42 22, 30 12, 19 14 C 9 16, 9 30, 15 38 C 21 46, 34 47, 48 43 Z'
const LOWER = 'M48 46 C 38 48, 25 54, 23 64 C 21 74, 30 80, 38 75 C 45 70, 48 58, 48 48 Z'
const UPPER_IN = 'M45 38.5 C 40 27, 31 20, 23 20.5 C 16 21, 15.5 29, 19.5 34.5 C 24.5 40.5, 34 41.5, 45 40.5 Z'
const LOWER_IN = 'M45 49 C 37 51, 29 56, 28 63 C 27 70, 32 73, 37 70 C 42 66, 44.5 58, 45 50 Z'
const ANTENNA = 'M48.5 25 C 46 20, 43 16.5, 39 15'
const MIRROR = 'matrix(-1 0 0 1 100 0)'

/** Pink glitter butterfly. */
export function Butterfly({ id }: ArtProps) {
  const k = keys(id)

  const silhouette = (
    <>
      <path d={UPPER} />
      <path d={LOWER} />
      <path d={ANTENNA} fill="none" />
      <circle cx="39" cy="15" r="2.4" />
    </>
  )

  const half = (
    <>
      <path d={UPPER} fill={k.url('wing')} />
      <path d={LOWER} fill={k.url('wing')} />
      <path d={UPPER_IN} fill="#ffc6e6" fillOpacity={0.6} />
      <path d={LOWER_IN} fill="#ffc6e6" fillOpacity={0.6} />
      <path d={UPPER} fill={k.url('glitter')} />
      <path d={LOWER} fill={k.url('glitter')} />
      <g fill="none" stroke="#a10d5c" strokeWidth={1.6} strokeLinejoin="round">
        <path d={UPPER} />
        <path d={LOWER} />
      </g>
      <g fill="#fff">
        <circle cx="18" cy="19" r="1.6" />
        <circle cx="14.5" cy="27.5" r="1.3" />
        <circle cx="16" cy="34.5" r="1.1" />
        <circle cx="25.5" cy="70" r="1.3" />
        <circle cx="30" cy="75" r="1.1" />
      </g>
      <ellipse cx="27" cy="21.5" rx="5" ry="1.8" transform="rotate(-18 27 21.5)" fill="#fff" fillOpacity={0.6} />
      <path d={ANTENNA} fill="none" stroke="#6b1446" strokeWidth={2} strokeLinecap="round" />
      <circle cx="39" cy="15" r="2.4" fill="#ff4fa8" stroke="#6b1446" strokeWidth={1} />
    </>
  )

  return (
    <>
      <defs>
        <radialGradient id={k.id('wing')} gradientUnits="userSpaceOnUse" cx="50" cy="44" r="44">
          <stop offset="0" stopColor="#ffe3f2" />
          <stop offset="0.3" stopColor="#ff9fd2" />
          <stop offset="0.7" stopColor="#ff4aa6" />
          <stop offset="1" stopColor="#c8137a" />
        </radialGradient>
        <linearGradient id={k.id('body')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8306f" />
          <stop offset="1" stopColor="#4a0d33" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffe0f1', '#9c0d5a', '#ffffff']} />
      </defs>
      <DieCut>
        {silhouette}
        <g transform={MIRROR}>{silhouette}</g>
        <rect x="47" y="27" width="6" height="47" rx="3" />
        <circle cx="50" cy="27" r="4.2" />
      </DieCut>
      {half}
      <g transform={MIRROR}>{half}</g>
      {/* body */}
      <rect x="47" y="27" width="6" height="47" rx="3" fill={k.url('body')} />
      <circle cx="50" cy="27" r="4.2" fill={k.url('body')} />
      <path d="M48.6 33 V68" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.1} strokeLinecap="round" />
      <circle cx="48.7" cy="25.6" r="1.1" fill="#fff" fillOpacity={0.7} />
    </>
  )
}

Butterfly.viewBox = [0, 0, 100, 90] as const
