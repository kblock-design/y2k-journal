import { DieCut, HoloStops } from '../parts'
import { keys, type ArtProps } from '../svg'

/* 72 x 76 disk with the top-right corner clipped. */
const BODY = 'M18 12 H76 L86 22 V84 Q86 88 82 88 H18 Q14 88 14 84 V16 Q14 12 18 12 Z'
const LABEL_HEART =
  'M66 80 C 62.5 77.5, 61 75.6, 61 74 C 61 72.6, 62.1 71.6, 63.4 71.6 C 64.5 71.6, 65.5 72.3, 66 73.3 ' +
  'C 66.5 72.3, 67.5 71.6, 68.6 71.6 C 69.9 71.6, 71 72.6, 71 74 C 71 75.6, 69.5 77.5, 66 80 Z'

/** Periwinkle floppy disk with a chrome shutter and a doodled label. */
export function Floppy({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('body')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c3d0ff" />
          <stop offset="0.5" stopColor="#8f9dff" />
          <stop offset="1" stopColor="#7462e6" />
        </linearGradient>
        <linearGradient id={k.id('holo')} x1="0" y1="0" x2="1" y2="1">
          <HoloStops />
        </linearGradient>
        <linearGradient id={k.id('shutter')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b9bcd3" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#d6d8e8" />
          <stop offset="1" stopColor="#9ea3c4" />
        </linearGradient>
      </defs>
      <DieCut>
        <path d={BODY} />
      </DieCut>

      <path d={BODY} fill={k.url('body')} />
      <path d={BODY} fill={k.url('holo')} fillOpacity={0.25} />
      <path d="M14 42 L44 12 H54 L14 52 Z" fill="#fff" fillOpacity={0.2} />
      <path d={BODY} fill="none" stroke="#4b3cb4" strokeWidth={1.2} strokeLinejoin="round" />

      {/* chrome shutter */}
      <rect x="30" y="12" width="40" height="26" rx="1.5" fill={k.url('shutter')} stroke="#6f7396" strokeWidth={0.9} />
      <rect x="55" y="16" width="9" height="18" rx="1" fill="#2e2466" />
      <path d="M33 16 V34" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.4} strokeLinecap="round" />

      {/* label */}
      <rect x="22" y="46" width="56" height="38" rx="2.5" fill="#fff7fb" stroke="#4b3cb4" strokeOpacity={0.5} strokeWidth={0.8} />
      <path d="M22 54 V48.5 Q22 46 24.5 46 H75.5 Q78 46 78 48.5 V54 Z" fill="#ff7ac8" />
      <path d="M26 50 H42 M47 50 H54" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" />
      <g stroke="#c3cfff" strokeWidth={0.9}>
        <path d="M26 63 H74" />
        <path d="M26 70 H74" />
        <path d="M26 77 H57" />
      </g>
      <path
        d="M28 61 q2 -3 4 0 t4 0 t4 0 t4 0 t4 0"
        fill="none"
        stroke="#d6127a"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={LABEL_HEART} fill="#ff2e93" />

      {/* write-protect tab */}
      <rect x="17" y="79" width="3.5" height="5" rx="0.6" fill="#2e2466" fillOpacity={0.75} />
    </>
  )
}

Floppy.viewBox = [0, 0, 100, 100] as const
