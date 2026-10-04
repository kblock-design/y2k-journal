import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

const r2 = (n: number) => Math.round(n * 100) / 100

/** Five-point star centred on (cx, cy): tip radius R, inner radius r, one tip straight up. */
function starPath(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180
    const rad = i % 2 ? r : R
    pts.push(`${r2(cx + rad * Math.cos(a))} ${r2(cy + rad * Math.sin(a))}`)
  }
  return `M${pts.join(' L')} Z`
}

/* Lenses centred at (29,47) and (71,47); tips reach x 10..90, y 27..63. */
const LEFT = starPath(29, 47, 20, 10)
const RIGHT = starPath(71, 47, 20, 10)
const LENS_L = starPath(29, 47, 13.4, 6.7)
const LENS_R = starPath(71, 47, 13.4, 6.7)
const BRIDGE = 'M45 41 Q50 35.5 55 41'

/** Hot-pink glitter star sunglasses with gradient lenses. */
export function StarShades({ id }: ArtProps) {
  const k = keys(id)
  const lens = (cx: number) => (
    <>
      <ellipse cx={cx - 4} cy="43.5" rx="4.4" ry="1.4" transform={`rotate(-35 ${cx - 4} 43.5)`} fill="#fff" fillOpacity={0.8} />
      <circle cx={cx + 4.5} cy="51" r="1.1" fill="#fff" fillOpacity={0.6} />
    </>
  )
  return (
    <>
      <defs>
        <linearGradient id={k.id('frame')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffa3d8" />
          <stop offset="0.5" stopColor="#ff3d9f" />
          <stop offset="1" stopColor="#d1137a" />
        </linearGradient>
        <linearGradient id={k.id('lens')} gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="60">
          <stop offset="0" stopColor="#3d0a35" />
          <stop offset="0.5" stopColor="#9c1777" />
          <stop offset="1" stopColor="#ff8fd0" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffd3ec', '#9e0052', '#ffffff']} />
      </defs>
      <DieCut>
        <path d={LEFT} />
        <path d={RIGHT} />
        <path d={BRIDGE} fill="none" />
      </DieCut>

      <path d={BRIDGE} fill="none" stroke="#a3004f" strokeWidth={4.2} strokeLinecap="round" />
      <path d={BRIDGE} fill="none" stroke="#ff6fb8" strokeWidth={2.4} strokeLinecap="round" />

      <g strokeLinejoin="round">
        <path d={LEFT} fill={k.url('frame')} />
        <path d={RIGHT} fill={k.url('frame')} />
        <path d={LEFT} fill={k.url('glitter')} />
        <path d={RIGHT} fill={k.url('glitter')} />
        <path d={LEFT} fill="none" stroke="#a3004f" strokeWidth={1.3} />
        <path d={RIGHT} fill="none" stroke="#a3004f" strokeWidth={1.3} />
        <path d={LENS_L} fill={k.url('lens')} stroke="#6e1248" strokeWidth={1} />
        <path d={LENS_R} fill={k.url('lens')} stroke="#6e1248" strokeWidth={1} />
      </g>
      {lens(29)}
      {lens(71)}

      {/* rhinestones on the top tips */}
      <g fill="#fff" stroke="#c9c9de" strokeWidth={0.6}>
        <circle cx="29" cy="31" r="1.9" />
        <circle cx="71" cy="31" r="1.9" />
      </g>
      <circle cx="29" cy="31" r="0.9" fill="#d6c2ff" />
      <circle cx="71" cy="31" r="0.9" fill="#ffc2e3" />
    </>
  )
}

StarShades.viewBox = [0, 18, 100, 58] as const
