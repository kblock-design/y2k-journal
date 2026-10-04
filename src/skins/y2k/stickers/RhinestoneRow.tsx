import type { JSX } from 'react'
import { sparklePath } from './svg'
import './stickers.css'

type Tone = { base: string; light: string; dark: string; table: string }

/** clear, pink, lilac — cycled along the row. */
const TONES: readonly Tone[] = [
  { base: '#dfe6fb', light: '#ffffff', dark: '#a3aed8', table: '#f3f6ff' },
  { base: '#ff5fae', light: '#ffb6dc', dark: '#c9157a', table: '#ff8cc6' },
  { base: '#b48af0', light: '#e6d3ff', dark: '#7c4dcc', table: '#cdb0fa' },
]

/* Round brilliant seen from above, in a 20 x 20 box centred on (10,10). */
const CX = 10
const CY = 10
const R_STONE = 7.4
const R_TABLE = 3.8
const LIGHT_DIR = (225 * Math.PI) / 180 // light from the top-left (screen coords)

const rad = (deg: number) => (deg * Math.PI) / 180
const r2 = (n: number) => Math.round(n * 100) / 100
const at = (r: number, deg: number) => `${r2(CX + r * Math.cos(rad(deg)))},${r2(CY + r * Math.sin(rad(deg)))}`
const lit = (deg: number) => Math.cos(rad(deg) - LIGHT_DIR)

const OUT_DEG = Array.from({ length: 8 }, (_, i) => -90 + i * 45)
const TAB_DEG = OUT_DEG.map((d) => d + 22.5)

/** Kite facets touching the girdle: (outer k, table k, outer k+1). */
const KITES = OUT_DEG.map((d, i) => ({
  pts: `${at(R_STONE, d)} ${at(R_TABLE, TAB_DEG[i])} ${at(R_STONE, OUT_DEG[(i + 1) % 8])}`,
  b: lit(d + 22.5),
}))
/** Star facets pointing out: (table k-1, outer k, table k). */
const STARS = OUT_DEG.map((d, i) => ({
  pts: `${at(R_TABLE, TAB_DEG[(i + 7) % 8])} ${at(R_STONE, d)} ${at(R_TABLE, TAB_DEG[i])}`,
  b: lit(d),
}))
const TABLE = TAB_DEG.map((d) => at(R_TABLE, d)).join(' ')
const GLINT = sparklePath(7, 6.6, 2.8)

function kiteFill(t: Tone, b: number) {
  return b > 0.3 ? t.light : b < -0.3 ? t.dark : t.base
}
function starFill(t: Tone, b: number) {
  return b > 0.3 ? t.base : b < -0.3 ? t.light : t.table
}

function Rhinestone({ tone }: { tone: Tone }) {
  return (
    <svg className="rhinestone" viewBox="0 0 20 20" focusable="false" aria-hidden="true">
      <circle cx="10" cy="10.6" r="9.3" fill="#6e1248" fillOpacity={0.22} />
      <circle cx="10" cy="10" r="9.3" fill="#d4d5e6" stroke="#9c9fbd" strokeWidth={0.6} />
      <circle cx="10" cy="10" r="8.2" fill="#f7f7fc" />
      <circle cx="10" cy="10" r={R_STONE + 0.2} fill={tone.base} />
      <g stroke="#fff" strokeOpacity={0.35} strokeWidth={0.25} strokeLinejoin="round">
        {KITES.map((f, i) => (
          <polygon key={`k${i}`} points={f.pts} fill={kiteFill(tone, f.b)} />
        ))}
        {STARS.map((f, i) => (
          <polygon key={`s${i}`} points={f.pts} fill={starFill(tone, f.b)} />
        ))}
      </g>
      <polygon points={TABLE} fill={tone.table} stroke="#fff" strokeOpacity={0.7} strokeWidth={0.35} strokeLinejoin="round" />
      <path d={GLINT} fill="#fff" />
      <circle cx="12.9" cy="13" r="0.7" fill="#fff" fillOpacity={0.8} />
    </svg>
  )
}

export type RhinestoneRowProps = { count?: number; className?: string }

/** A strip of faceted rhinestones (clear / pink / lilac) spread across its container. Decorative. */
export function RhinestoneRow({ count = 12, className }: RhinestoneRowProps): JSX.Element {
  const n = Math.max(1, Math.floor(count))
  return (
    <div className={`rhinestone-row${className ? ` ${className}` : ''}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <Rhinestone key={i} tone={TONES[i % TONES.length]} />
      ))}
    </div>
  )
}
