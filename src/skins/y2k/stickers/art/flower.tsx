import { DieCut } from '../parts'
import { keys, type ArtProps } from '../svg'

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const

/** Eight-petal pink daisy with a sunny smiley centre. */
export function Flower({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('petal')} gradientUnits="userSpaceOnUse" cx="50" cy="50" r="38">
          <stop offset="0.25" stopColor="#fff1f8" />
          <stop offset="0.55" stopColor="#ffa6d6" />
          <stop offset="0.85" stopColor="#ff5aae" />
          <stop offset="1" stopColor="#f0388f" />
        </radialGradient>
        <radialGradient id={k.id('centre')} cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" stopColor="#fff7a8" />
          <stop offset="0.5" stopColor="#ffd21f" />
          <stop offset="1" stopColor="#f29a00" />
        </radialGradient>
      </defs>
      <DieCut>
        {ANGLES.map((a) => (
          <ellipse key={a} cx="50" cy="30" rx="12.5" ry="18" transform={`rotate(${a} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="15" />
      </DieCut>
      {ANGLES.map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <ellipse cx="50" cy="30" rx="12.5" ry="18" fill={k.url('petal')} stroke="#e0357f" strokeWidth={1.3} />
          <ellipse cx="46.5" cy="22" rx="2.6" ry="5.5" fill="#fff" fillOpacity={0.7} />
        </g>
      ))}
      {/* centre */}
      <circle cx="50" cy="50" r="15" fill={k.url('centre')} stroke="#e08a00" strokeWidth={1.3} />
      <ellipse cx="44.5" cy="43" rx="5" ry="2.6" transform="rotate(-28 44.5 43)" fill="#fff" fillOpacity={0.7} />
      <g fill="#5a2a00">
        <ellipse cx="45" cy="48" rx="1.6" ry="2.4" />
        <ellipse cx="55" cy="48" rx="1.6" ry="2.4" />
      </g>
      <path d="M43.5 52.5 Q50 58.5 56.5 52.5" fill="none" stroke="#5a2a00" strokeWidth={1.8} strokeLinecap="round" />
      <ellipse cx="41" cy="53.5" rx="2.4" ry="1.4" fill="#ff7ab8" fillOpacity={0.6} />
      <ellipse cx="59" cy="53.5" rx="2.4" ry="1.4" fill="#ff7ab8" fillOpacity={0.6} />
    </>
  )
}

Flower.viewBox = [0, 0, 100, 100] as const
