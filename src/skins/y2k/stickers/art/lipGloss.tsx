import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

const TUBE = 'M13 41 H35 L36 85 Q36 91 30 91 H18 Q12 91 12 85 Z'
const GLOSS = 'M15.5 45 H32.5 L33.3 84.5 Q33.3 88 29.8 88 H18.2 Q14.7 88 14.7 84.5 Z'
const LABEL_HEART =
  'M24 65 C 22 63.6, 20.9 62.5, 20.9 61.4 C 20.9 60.4, 21.6 59.8, 22.4 59.8 C 23.1 59.8, 23.7 60.3, 24 60.9 ' +
  'C 24.3 60.3, 24.9 59.8, 25.6 59.8 C 26.4 59.8, 27.1 60.4, 27.1 61.4 C 27.1 62.5, 26 63.6, 24 65 Z'

/** Clear lip-gloss tube full of pink glitter gloss, hot-pink cap, chrome collar. */
export function LipGloss({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('cap')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff5fae" />
          <stop offset="0.28" stopColor="#ffd0ea" />
          <stop offset="0.5" stopColor="#ff7cc0" />
          <stop offset="0.8" stopColor="#e0278a" />
          <stop offset="1" stopColor="#b5106a" />
        </linearGradient>
        <linearGradient id={k.id('chrome')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9ea3c4" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#c9cde0" />
          <stop offset="1" stopColor="#7d82a6" />
        </linearGradient>
        <linearGradient id={k.id('tube')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe3f1" />
          <stop offset="0.25" stopColor="#fff7fb" />
          <stop offset="0.7" stopColor="#ffd6ea" />
          <stop offset="1" stopColor="#f5b3d6" />
        </linearGradient>
        <linearGradient id={k.id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9fd0" />
          <stop offset="0.6" stopColor="#ff4fa3" />
          <stop offset="1" stopColor="#e0278a" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffe0f1', '#b3005e', '#ffffff']} size={5} />
      </defs>
      <DieCut>
        <rect x="13" y="7" width="22" height="29" rx="5" />
        <rect x="11.5" y="35" width="25" height="6" rx="2" />
        <path d={TUBE} />
      </DieCut>

      {/* tube */}
      <path d={TUBE} fill={k.url('tube')} stroke="#e58bbd" strokeWidth={0.8} strokeLinejoin="round" />
      <path d={GLOSS} fill={k.url('gloss')} />
      <path d={GLOSS} fill={k.url('glitter')} />
      <rect x="22.6" y="42" width="2.8" height="26" rx="1.4" fill="#fff" fillOpacity={0.45} />
      <rect x="16.5" y="56" width="15" height="17" rx="1.5" fill="#fff" fillOpacity={0.88} />
      <path d={LABEL_HEART} fill="#ff4fa3" />
      <g fill="#ff7ab9">
        <rect x="19" y="67" width="10" height="1" rx="0.5" />
        <rect x="20.5" y="69.5" width="7" height="1" rx="0.5" />
      </g>
      <rect x="14.2" y="44" width="2" height="40" rx="1" fill="#fff" fillOpacity={0.75} />
      <path d="M34 44 L34.8 84" stroke="#e07ab3" strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />

      {/* collar */}
      <rect x="11.5" y="35" width="25" height="6" rx="2" fill={k.url('chrome')} stroke="#7d82a6" strokeWidth={0.5} />

      {/* cap */}
      <rect x="13" y="7" width="22" height="29" rx="5" fill={k.url('cap')} />
      <g stroke="#b5106a" strokeOpacity={0.5} strokeWidth={0.6}>
        <path d="M14 28.5 H34" />
        <path d="M14 31 H34" />
        <path d="M14 33.5 H34" />
      </g>
      <rect x="16" y="10" width="2.2" height="16" rx="1.1" fill="#fff" fillOpacity={0.65} />
      <ellipse cx="24" cy="9.6" rx="6" ry="1.2" fill="#fff" fillOpacity={0.4} />
    </>
  )
}

LipGloss.viewBox = [0, 0, 48, 100] as const
