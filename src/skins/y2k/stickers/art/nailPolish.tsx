import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

const HEART =
  'M55 80 C 49 76, 46.5 73, 46.5 70 C 46.5 67.6, 48.4 66, 50.6 66 C 52.6 66, 54.2 67.2, 55 68.8 ' +
  'C 55.8 67.2, 57.4 66, 59.4 66 C 61.6 66, 63.5 67.6, 63.5 70 C 63.5 73, 61 76, 55 80 Z'
const RIDGES = [43, 48, 53, 58] as const

/** Hot-pink glitter nail polish with a ridged chrome cap. */
export function NailPolish({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('cap')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a8fb5" />
          <stop offset="0.25" stopColor="#f4f5fb" />
          <stop offset="0.5" stopColor="#c4c7dd" />
          <stop offset="0.72" stopColor="#ffffff" />
          <stop offset="1" stopColor="#7c80a8" />
        </linearGradient>
        <linearGradient id={k.id('polish')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ff9ad5" />
          <stop offset="0.5" stopColor="#ff2e93" />
          <stop offset="1" stopColor="#b8005f" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffd3ec', '#7a003f', '#ffffff']} size={6} />
      </defs>
      <DieCut>
        <rect x="38" y="8" width="24" height="32" rx="3.5" />
        <rect x="41" y="38" width="18" height="10" rx="2" />
        <rect x="24" y="46" width="52" height="46" rx="13" />
      </DieCut>

      {/* neck */}
      <rect x="41" y="38" width="18" height="10" rx="2" fill="#efe8f7" stroke="#8a8fb5" strokeWidth={0.8} />

      {/* bottle */}
      <rect x="24" y="46" width="52" height="46" rx="13" fill={k.url('polish')} />
      <rect x="24" y="46" width="52" height="46" rx="13" fill={k.url('glitter')} />
      <rect x="27" y="49" width="46" height="40" rx="10.5" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1} />
      <rect x="24" y="46" width="52" height="46" rx="13" fill="none" stroke="#9c0a58" strokeWidth={1.2} />
      <path d={HEART} fill="#fff" fillOpacity={0.85} />
      <rect x="30" y="54" width="4" height="28" rx="2" fill="#fff" fillOpacity={0.6} />
      <rect x="36" y="54" width="1.6" height="12" rx="0.8" fill="#fff" fillOpacity={0.4} />

      {/* cap */}
      <rect x="38" y="8" width="24" height="32" rx="3.5" fill={k.url('cap')} stroke="#5d6085" strokeWidth={1} />
      <g stroke="#6f7396" strokeOpacity={0.35} strokeWidth={0.8}>
        {RIDGES.map((x) => (
          <path key={x} d={`M${x} 11 V37`} />
        ))}
      </g>
      <rect x="40.5" y="11" width="2" height="26" rx="1" fill="#fff" fillOpacity={0.8} />
    </>
  )
}

NailPolish.viewBox = [12, 0, 76, 102] as const
