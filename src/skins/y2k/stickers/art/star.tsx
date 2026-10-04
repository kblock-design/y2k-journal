import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

/** Five-point star (outer r 36, inner r 18.5, centre 50,53); fattened by a round-joined stroke. */
const STAR =
  'M50 17 L60.87 38.03 L84.24 41.88 L67.59 58.72 L71.16 82.12 L50 71.5 ' +
  'L28.84 82.12 L32.41 58.72 L15.76 41.88 L39.13 38.03 Z'

const PUFF = 8

/** Chubby lilac glitter star with pink flecks. */
export function Star({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('fill')} gradientUnits="userSpaceOnUse" x1="22" y1="12" x2="78" y2="88">
          <stop offset="0" stopColor="#f1e2ff" />
          <stop offset="0.35" stopColor="#c39bff" />
          <stop offset="0.7" stopColor="#9a6bf2" />
          <stop offset="1" stopColor="#7246d6" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#f6ecff', '#4b1f9e', '#ffc4ea']} />
      </defs>
      <DieCut w={9 + PUFF}>
        <path d={STAR} />
      </DieCut>
      <g strokeLinejoin="round">
        <path d={STAR} fill="#5b2fb8" stroke="#5b2fb8" strokeWidth={PUFF + 1.6} opacity={0.55} />
        <path d={STAR} fill={k.url('fill')} stroke={k.url('fill')} strokeWidth={PUFF} />
        <path d={STAR} fill={k.url('glitter')} stroke={k.url('glitter')} strokeWidth={PUFF} />
      </g>
      {/* gloss */}
      <ellipse cx="29" cy="43.5" rx="7" ry="2.4" transform="rotate(-6 29 43.5)" fill="#fff" fillOpacity={0.8} />
      <path d="M48.5 24 L45.8 33" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeOpacity={0.85} />
      <circle cx="72" cy="45.5" r="1.8" fill="#fff" fillOpacity={0.7} />
    </>
  )
}

Star.viewBox = [0, 0, 100, 100] as const
