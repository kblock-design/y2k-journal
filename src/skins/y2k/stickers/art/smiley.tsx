import { DieCut } from '../parts'
import { keys, type ArtProps } from '../svg'

/** Classic glossy yellow smiley: oval eyes with catchlights, open grin, pink cheeks. */
export function Smiley({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('face')} cx="0.4" cy="0.35" r="0.68">
          <stop offset="0" stopColor="#fff7a8" />
          <stop offset="0.45" stopColor="#ffe23d" />
          <stop offset="0.85" stopColor="#ffc400" />
          <stop offset="1" stopColor="#f2a100" />
        </radialGradient>
      </defs>
      <DieCut>
        <circle cx="50" cy="49" r="40" />
      </DieCut>
      <circle cx="50" cy="49" r="40" fill={k.url('face')} stroke="#e39a00" strokeWidth={1.5} />
      {/* cheeks */}
      <ellipse cx="24.5" cy="57" rx="5.5" ry="3.3" fill="#ff6fb0" fillOpacity={0.55} />
      <ellipse cx="75.5" cy="57" rx="5.5" ry="3.3" fill="#ff6fb0" fillOpacity={0.55} />
      {/* eyes */}
      <g fill="#3a1030">
        <ellipse cx="38" cy="40" rx="4.2" ry="7" />
        <ellipse cx="62" cy="40" rx="4.2" ry="7" />
      </g>
      <g fill="#fff">
        <circle cx="39.3" cy="36.6" r="1.6" />
        <circle cx="63.3" cy="36.6" r="1.6" />
      </g>
      {/* grin + tongue */}
      <path d="M30 54 Q50 78 70 54 Q50 62 30 54 Z" fill="#3a1030" strokeLinejoin="round" stroke="#3a1030" strokeWidth={1.2} />
      <path d="M42 63 Q50 59 58 63 Q50 67 42 63 Z" fill="#ff6fae" />
      {/* gloss */}
      <path
        d="M22 38 C 24 24, 36 15, 50 14 C 40 18, 30 26, 27 40 C 26 44, 21 43, 22 38 Z"
        fill="#fff"
        fillOpacity={0.75}
      />
      <circle cx="74" cy="27" r="2.4" fill="#fff" fillOpacity={0.6} />
    </>
  )
}

Smiley.viewBox = [0, 0, 100, 100] as const
