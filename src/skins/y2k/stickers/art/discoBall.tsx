import { DieCut } from '../parts'
import { keys, phase, sparklePath, type ArtProps } from '../svg'

/* Ball centre (50,55), radius 33, hanging from a little chrome cap on a string. */
const CX = 50
const CY = 55
const R = 33
const ROWS = 9

const r2 = (n: number) => Math.round(n * 100) / 100

/** Mirror shades, dark -> light, and a few iridescent tints. */
const SHADES = ['#6f7396', '#9ea3c4', '#c4c8de', '#e6e8f5', '#ffffff'] as const
const TINTS = ['#ffc2e6', '#d6c2ff', '#bfeeff'] as const

type Tile = { x: number; y: number; w: number; h: number; fill: string }

/**
 * Rows of mirror tiles, fewer per row towards the poles so the ball reads as a sphere.
 * Each row is as wide as its widest edge; the circle clip trims the overhang.
 */
function buildTiles(): Tile[] {
  const tiles: Tile[] = []
  const h = (2 * R) / ROWS
  for (let j = 0; j < ROWS; j++) {
    const y0 = CY - R + j * h
    const y1 = y0 + h
    const near = y0 <= CY && y1 >= CY ? 0 : Math.min(Math.abs(y0 - CY), Math.abs(y1 - CY))
    const half = Math.sqrt(R * R - near * near)
    const n = Math.max(2, Math.round((2 * half) / 7.5))
    const w = (2 * half) / n
    for (let i = 0; i < n; i++) {
      const x0 = CX - half + i * w
      const nx = (x0 + w / 2 - CX) / R
      const ny = (y0 + h / 2 - CY) / R
      const tint = (i * 3 + j * 5) % 13
      let fill: string
      if (tint < TINTS.length) {
        fill = TINTS[tint]
      } else {
        // Lit from the top-left, with a little per-tile jitter so it sparkles.
        const lit = -(nx * 0.55 + ny * 0.85)
        const jitter = ((i * 7 + j * 3) % 3) - 1
        fill = SHADES[Math.min(4, Math.max(0, Math.round(2 + lit * 2 + jitter * 0.7)))]
      }
      tiles.push({ x: r2(x0), y: r2(y0), w: r2(w), h: r2(h), fill })
    }
  }
  return tiles
}

const TILES = buildTiles()
const GLINT = sparklePath(37, 38, 10)
const GLINT_SMALL = sparklePath(65, 71, 5)

/** Chrome mirror ball with iridescent tiles and a twinkling glint. */
export function DiscoBall({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <radialGradient id={k.id('base')} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c4c8de" />
          <stop offset="1" stopColor="#5d6085" />
        </radialGradient>
        <radialGradient id={k.id('shade')} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#fff" stopOpacity={0.45} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.8" stopColor="#23264a" stopOpacity={0.12} />
          <stop offset="1" stopColor="#23264a" stopOpacity={0.4} />
        </radialGradient>
        <linearGradient id={k.id('cap')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a8fb5" />
          <stop offset="0.35" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#c4c7dd" />
          <stop offset="1" stopColor="#6f7396" />
        </linearGradient>
        <clipPath id={k.id('clip')}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>
      <DieCut>
        <path d="M50 7 V16" fill="none" />
        <rect x="44" y="15" width="12" height="9" rx="1.5" />
        <circle cx={CX} cy={CY} r={R} />
      </DieCut>

      {/* string + cap */}
      <path d="M50 7 V16" stroke="#6e1248" strokeWidth={1.6} strokeLinecap="round" />
      <rect x="44" y="15" width="12" height="9" rx="1.5" fill={k.url('cap')} stroke="#5d6085" strokeWidth={0.9} />

      {/* ball */}
      <circle cx={CX} cy={CY} r={R} fill={k.url('base')} />
      <g clipPath={k.url('clip')} stroke="#5d6085" strokeOpacity={0.55} strokeWidth={0.6}>
        {TILES.map((t, i) => (
          <rect key={i} x={t.x} y={t.y} width={t.w} height={t.h} fill={t.fill} fillOpacity={0.82} />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={R} fill={k.url('shade')} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#5d6085" strokeWidth={1.3} />
      <path
        d="M24.5 44 A28 28 0 0 1 40 28.5"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.8}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d={GLINT_SMALL} fill="#fff" fillOpacity={0.9} />
      <circle cx="31" cy="64" r="1.6" fill="#fff" fillOpacity={0.85} />
      <g className="sticker__twinkle" style={{ animationDelay: phase(id, 3.6) }}>
        <path d={GLINT} fill="#fff" />
      </g>
    </>
  )
}

DiscoBall.viewBox = [8, 0, 84, 98] as const
