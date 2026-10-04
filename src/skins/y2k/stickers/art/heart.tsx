import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

const HEART =
  'M50 84 C 30 70, 10 56, 10 34 C 10 20, 20 11, 32 11 C 41 11, 47 16, 50 23 ' +
  'C 53 16, 59 11, 68 11 C 80 11, 90 20, 90 34 C 90 56, 70 70, 50 84 Z'

/** Hot-pink glitter heart. */
export function Heart({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('fill')} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffa3d8" />
          <stop offset="0.45" stopColor="#ff3d9f" />
          <stop offset="1" stopColor="#c4006a" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffd3ec', '#9e0052', '#ffffff']} />
      </defs>
      <DieCut>
        <path d={HEART} />
      </DieCut>
      <path d={HEART} fill={k.url('fill')} />
      <path d={HEART} fill={k.url('glitter')} />
      <path d={HEART} fill="none" stroke="#a3004f" strokeOpacity={0.4} strokeWidth={1.4} />
      {/* rim light + gloss */}
      <path
        d="M80 44 C 78 56, 67 66, 57 72.5"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.45}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M23 21 C 29 16.5, 38 18, 36.5 24.5 C 34.5 30, 25 34, 21.5 30.5 C 19.2 28, 20 23.5, 23 21 Z"
        fill="#fff"
        fillOpacity={0.85}
      />
      <circle cx="73" cy="21" r="3" fill="#fff" fillOpacity={0.75} />
    </>
  )
}

Heart.viewBox = [0, 0, 100, 94] as const
