import { DieCut, GlitterPattern } from '../parts'
import { keys, pixelPath, type ArtProps } from '../svg'

/** 7x6 pixel heart for the screen. */
const PIXEL_HEART = pixelPath(
  [
    [1, 0], [3, 0], [3, 1], [4, 1], [4, 0], [6, 0], [6, 1], [7, 1], [7, 3], [6, 3], [6, 4], [5, 4],
    [5, 5], [4, 5], [4, 6], [3, 6], [3, 5], [2, 5], [2, 4], [1, 4], [1, 3], [0, 3], [0, 1], [1, 1],
  ],
  27.1,
  25,
  1.4,
)

const KEY_X = [17.5, 28, 38.5] as const
const KEY_Y = [70.5, 75, 79.5, 84] as const

/** Generic open pink flip phone with a pixel-heart screen. */
export function FlipPhone({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('shell')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb3da" />
          <stop offset="0.35" stopColor="#ff6fb8" />
          <stop offset="0.65" stopColor="#ff4aa3" />
          <stop offset="1" stopColor="#d92f86" />
        </linearGradient>
        <linearGradient id={k.id('hinge')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd6ec" />
          <stop offset="0.5" stopColor="#e5559e" />
          <stop offset="1" stopColor="#ffc4e3" />
        </linearGradient>
        <linearGradient id={k.id('lcd')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2f9" />
          <stop offset="1" stopColor="#ffc9e6" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffe0f1', '#b3005e', '#ffffff']} size={5} />
      </defs>
      <DieCut>
        <rect x="12" y="8" width="40" height="42" rx="12" />
        <rect x="10" y="46" width="44" height="9" rx="4.5" />
        <rect x="12" y="52" width="40" height="38" rx="10" />
      </DieCut>

      {/* lid */}
      <rect x="12" y="8" width="40" height="42" rx="12" fill={k.url('shell')} />
      <rect x="12" y="8" width="40" height="42" rx="12" fill={k.url('glitter')} />
      <rect x="12" y="8" width="40" height="42" rx="12" fill="none" stroke="#b81f6f" strokeOpacity={0.6} strokeWidth={0.9} />
      <rect x="27" y="10.6" width="10" height="1.6" rx="0.8" fill="#a3195f" fillOpacity={0.7} />
      <rect x="16" y="14" width="32" height="31" rx="6" fill="#3b1235" />
      <rect x="19" y="17" width="26" height="25" rx="3" fill={k.url('lcd')} />
      <g fill="#d4237f">
        <rect x="21" y="19.8" width="1" height="1.2" />
        <rect x="22.6" y="19.2" width="1" height="1.8" />
        <rect x="24.2" y="18.6" width="1" height="2.4" />
        <rect x="39.1" y="19.4" width="2.4" height="0.8" />
      </g>
      <rect x="38.5" y="18.8" width="4" height="2" rx="0.4" fill="none" stroke="#d4237f" strokeWidth={0.6} />
      <path d={PIXEL_HEART} fill="#ff2e93" />
      <rect x="28.5" y="26.4" width="1.4" height="1.4" fill="#fff" fillOpacity={0.9} />
      <rect x="23" y="35.5" width="18" height="1.3" rx="0.6" fill="#e05aa0" fillOpacity={0.5} />
      <rect x="26" y="38.1" width="12" height="1.3" rx="0.6" fill="#e05aa0" fillOpacity={0.35} />
      <path d="M22 17 H31 L19 31 V20 Q19 17 22 17 Z" fill="#fff" fillOpacity={0.35} />
      <rect x="13.4" y="20" width="1.6" height="24" rx="0.8" fill="#fff" fillOpacity={0.55} />

      {/* keypad half */}
      <rect x="12" y="52" width="40" height="38" rx="10" fill={k.url('shell')} />
      <rect x="12" y="52" width="40" height="38" rx="10" fill="none" stroke="#b81f6f" strokeOpacity={0.6} strokeWidth={0.9} />
      <g fill="#ffe3f1">
        <rect x="16.5" y="58" width="8" height="3.6" rx="1.8" />
        <rect x="39.5" y="58" width="8" height="3.6" rx="1.8" />
      </g>
      <circle cx="32" cy="62.5" r="5.6" fill="#ffe3f1" stroke="#c93686" strokeWidth={0.8} />
      <circle cx="32" cy="62.5" r="2.2" fill="#ff4fa3" />
      <g fill="#fff2f9" stroke="#d64d94" strokeWidth={0.5}>
        {KEY_Y.map((y) =>
          KEY_X.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="3.4" rx="1.7" />),
        )}
      </g>
      <rect x="14.2" y="60" width="1.6" height="20" rx="0.8" fill="#fff" fillOpacity={0.5} />

      {/* hinge with rhinestone caps */}
      <rect x="10" y="46" width="44" height="9" rx="4.5" fill={k.url('hinge')} stroke="#b81f6f" strokeOpacity={0.6} strokeWidth={0.6} />
      <rect x="16" y="47.6" width="32" height="1.4" rx="0.7" fill="#fff" fillOpacity={0.6} />
      <g stroke="#c9c9de" strokeWidth={0.6}>
        <circle cx="14.5" cy="50.5" r="2" fill="#fff" />
        <circle cx="49.5" cy="50.5" r="2" fill="#fff" />
      </g>
      <circle cx="14.5" cy="50.5" r="1.1" fill="#ffc2e3" />
      <circle cx="49.5" cy="50.5" r="1.1" fill="#d6c2ff" />
    </>
  )
}

FlipPhone.viewBox = [0, 0, 64, 100] as const
