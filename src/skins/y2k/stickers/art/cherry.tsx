import { DieCut } from '../parts'
import { keys, type ArtProps } from '../svg'

const STEM_L = 'M33 54 C 36 38, 46 24, 56 17'
const STEM_R = 'M60 58 C 61 42, 59 28, 56 17'
const LEAF = 'M56 17 C 64 8, 78 8, 85 14 C 78 22, 64 24, 56 17 Z'

/** Twin glossy cherries with a leaf. */
export function Cherry({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('fruit')} cx="0.38" cy="0.32" r="0.72">
          <stop offset="0" stopColor="#ffb3c8" />
          <stop offset="0.3" stopColor="#ff3d78" />
          <stop offset="0.68" stopColor="#e0004f" />
          <stop offset="1" stopColor="#9a0035" />
        </radialGradient>
        <linearGradient id={k.id('leaf')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9f58a" />
          <stop offset="0.5" stopColor="#6cc63f" />
          <stop offset="1" stopColor="#3f9a2a" />
        </linearGradient>
      </defs>
      <DieCut>
        <path d={STEM_L} fill="none" />
        <path d={STEM_R} fill="none" />
        <path d={LEAF} />
        <circle cx="32" cy="70" r="17" />
        <circle cx="60" cy="73" r="16" />
      </DieCut>

      {/* stems + leaf */}
      <g fill="none" stroke="#5f8f2c" strokeWidth={2.8} strokeLinecap="round">
        <path d={STEM_L} />
        <path d={STEM_R} />
      </g>
      <path d={LEAF} fill={k.url('leaf')} stroke="#3f8a24" strokeOpacity={0.6} strokeWidth={0.9} strokeLinejoin="round" />
      <path d="M57.5 17 C 66 15, 75 14, 83 14" fill="none" stroke="#3f8a24" strokeOpacity={0.8} strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx="68" cy="12.8" rx="5" ry="1.3" transform="rotate(-6 68 12.8)" fill="#fff" fillOpacity={0.55} />

      {/* left cherry */}
      <circle cx="32" cy="70" r="17" fill={k.url('fruit')} stroke="#8a0030" strokeOpacity={0.5} strokeWidth={0.9} />
      <path d="M29.5 54.8 Q33 56.6 36.5 54.8" fill="none" stroke="#8a0030" strokeOpacity={0.6} strokeWidth={0.8} strokeLinecap="round" />
      <ellipse cx="25" cy="62" rx="4.2" ry="6.4" transform="rotate(35 25 62)" fill="#fff" fillOpacity={0.85} />
      <path d="M44.22 74.45 A13 13 0 0 1 36.45 82.22" fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" />

      {/* right cherry */}
      <circle cx="60" cy="73" r="16" fill={k.url('fruit')} stroke="#8a0030" strokeOpacity={0.5} strokeWidth={0.9} />
      <path d="M57 58.6 Q60 60.4 63 58.6" fill="none" stroke="#8a0030" strokeOpacity={0.6} strokeWidth={0.8} strokeLinecap="round" />
      <ellipse cx="54" cy="66" rx="3.8" ry="6" transform="rotate(35 54 66)" fill="#fff" fillOpacity={0.85} />
      <path d="M71.28 77.1 A12 12 0 0 1 64.1 84.28" fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" />
    </>
  )
}

Cherry.viewBox = [0, 0, 100, 100] as const
