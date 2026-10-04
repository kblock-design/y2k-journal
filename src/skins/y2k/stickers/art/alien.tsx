import { DieCut, GlitterPattern, HoloStops } from '../parts'
import { keys, type ArtProps } from '../svg'

/* Wide domed head tapering to a soft chin. */
const HEAD = 'M50 90 C 35 89, 16 68, 14 45 C 12 22, 30 9, 50 9 C 70 9, 88 22, 86 45 C 84 68, 65 89, 50 90 Z'

/** Lime glitter alien head with big glossy almond eyes. */
export function Alien({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('skin')} cx="0.42" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#efffd0" />
          <stop offset="0.35" stopColor="#a8f57a" />
          <stop offset="0.75" stopColor="#5fd65a" />
          <stop offset="1" stopColor="#2fa84a" />
        </radialGradient>
        <linearGradient id={k.id('holo')} x1="0" y1="0" x2="1" y2="1">
          <HoloStops />
        </linearGradient>
        <linearGradient id={k.id('eye')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1030" />
          <stop offset="1" stopColor="#120418" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#f4ffe0', '#1f7a3a', '#ffffff']} />
      </defs>
      <DieCut>
        <path d={HEAD} />
      </DieCut>

      <path d={HEAD} fill={k.url('skin')} />
      <path d={HEAD} fill={k.url('holo')} fillOpacity={0.2} />
      <path d={HEAD} fill={k.url('glitter')} />
      <path d={HEAD} fill="none" stroke="#1f7a3a" strokeWidth={1.4} />

      {/* eyes */}
      <g fill={k.url('eye')} stroke="#ff7ac8" strokeOpacity={0.55} strokeWidth={1}>
        <ellipse cx="34" cy="50" rx="12" ry="7" transform="rotate(30 34 50)" />
        <ellipse cx="66" cy="50" rx="12" ry="7" transform="rotate(-30 66 50)" />
      </g>
      <g fill="#fff">
        <ellipse cx="31" cy="46" rx="3.6" ry="2" transform="rotate(30 31 46)" fillOpacity={0.9} />
        <ellipse cx="69" cy="46" rx="3.6" ry="2" transform="rotate(-30 69 46)" fillOpacity={0.9} />
        <circle cx="39" cy="54" r="1.2" fillOpacity={0.7} />
        <circle cx="61" cy="54" r="1.2" fillOpacity={0.7} />
      </g>

      {/* cheeks + smile */}
      <g fill="#ff7ab8" fillOpacity={0.5}>
        <ellipse cx="26" cy="64" rx="4" ry="2.2" />
        <ellipse cx="74" cy="64" rx="4" ry="2.2" />
      </g>
      <path d="M45 73 Q50 76.5 55 73" fill="none" stroke="#1f5a2e" strokeWidth={1.6} strokeLinecap="round" />

      {/* gloss */}
      <path d="M26 30 C 30 21, 39 15, 49 14 C 41 18, 34 24, 31 33 C 30 36, 25 35, 26 30 Z" fill="#fff" fillOpacity={0.7} />
      <circle cx="70" cy="22" r="2.2" fill="#fff" fillOpacity={0.55} />
    </>
  )
}

Alien.viewBox = [6, 0, 88, 100] as const
