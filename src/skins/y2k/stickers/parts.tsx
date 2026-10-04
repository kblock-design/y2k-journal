import type { ReactNode } from 'react'
import { HOLO, keys } from './svg'

const SHADOW = '#6e1248'
const RIM = '#efc3da'

/**
 * Die-cut backing: renders the silhouette children three times —
 * a soft offset drop shadow, a thin pink rim, then the thick white border.
 * Children should be plain shapes with no fill/stroke of their own
 * (use fill="none" on open paths such as stems/antennae).
 * Reach beyond the silhouette (w = 9): ~5.3 units up/left, ~6.9 right, ~8.1 down.
 */
export function DieCut({ children, w = 9 }: { children: ReactNode; w?: number }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <g transform="translate(1.6 2.8)" opacity={0.28} fill={SHADOW} stroke={SHADOW} strokeWidth={w + 1.5}>
        {children}
      </g>
      <g fill={RIM} stroke={RIM} strokeWidth={w + 1.6}>
        {children}
      </g>
      <g fill="#fff" stroke="#fff" strokeWidth={w}>
        {children}
      </g>
    </g>
  )
}

/**
 * Glitter: a small repeating tile of dots and one tiny twinkle on a transparent
 * background. Layer it over a gradient-filled copy of the same shape.
 * colors = [light fleck, dark fleck, bright fleck].
 */
export function GlitterPattern({
  id,
  colors,
  size = 7,
}: {
  id: string
  colors: readonly [string, string, string]
  size?: number
}) {
  const [a, b, c] = colors
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size}>
      <g transform={size === 7 ? undefined : `scale(${size / 7})`}>
        <circle cx="1" cy="1.3" r="0.55" fill={a} />
        <circle cx="4.6" cy="0.9" r="0.38" fill={b} />
        <circle cx="3" cy="3.6" r="0.5" fill={c} />
        <circle cx="6" cy="4.3" r="0.42" fill={a} />
        <circle cx="1.6" cy="5.8" r="0.4" fill={b} />
        <circle cx="4.9" cy="6.3" r="0.5" fill={a} />
        <path d="M5.4 1.5 L5.6 2.1 L6.2 2.3 L5.6 2.5 L5.4 3.1 L5.2 2.5 L4.6 2.3 L5.2 2.1 Z" fill="#fff" />
      </g>
    </pattern>
  )
}

/**
 * Stroke width of the dark outline that ChromeBody draws around its silhouette (half of it
 * lies outside). A chrome sticker's DieCut uses w = 9 + CHROME_EDGE, which reaches ~10 units
 * up/left, ~11.7 right and ~12.9 down from the silhouette.
 */
export const CHROME_EDGE = 9.4
const CHROME_BEVEL = 7
const CHROME_OUTLINE = '#262a38'

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Liquid-chrome finish for one closed silhouette, lit from the top-left like every sticker:
 * a dark outline and a bevel (stroked outside the shape, its gradient inverted against the
 * face), a mirrored face (sky white -> grey -> bright just above a wavy near-black horizon
 * -> dark ground fading back to white), a puffy top-left glow with darker lower-right edges,
 * a faint holographic sheen and a crisp inner edge line. `children` are extra highlights,
 * clipped to the face.
 */
export function ChromeBody({
  id,
  d,
  box,
  horizon = 0.5,
  children,
}: {
  /** Unique per instance and per body, e.g. k.id('heart'). */
  id: string
  d: string
  /** Silhouette bounds [x0, y0, x1, y1]; the reflections are laid out across it. */
  box: readonly [number, number, number, number]
  /** Where the horizon reflection sits, as a fraction of the box height (0.36..0.6). */
  horizon?: number
  children?: ReactNode
}) {
  const k = keys(id)
  const [x0, y0, x1, y1] = box
  const w = x1 - x0
  const h = y1 - y0
  const H = horizon
  const hy = y0 + h * H
  const a = h * 0.05
  const band =
    `M${r2(x0 - 8)} ${r2(hy + a)} ` +
    `C${r2(x0 + w * 0.3)} ${r2(hy - a * 1.6)} ${r2(x0 + w * 0.62)} ${r2(hy + a * 1.4)} ${r2(x1 + 8)} ${r2(hy - a * 0.6)} ` +
    `V${r2(y1 + 8)} H${r2(x0 - 8)} Z`
  return (
    <>
      <defs>
        <linearGradient id={k.id('face')} gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.14" stopColor="#eef1f8" />
          <stop offset={r2(H * 0.72)} stopColor="#a4abbf" />
          <stop offset={r2(H - 0.015)} stopColor="#f5f7fc" />
          <stop offset={r2(H + 0.07)} stopColor="#545a6f" />
          <stop offset={r2(H + (1 - H) * 0.62)} stopColor="#c2c7d5" />
          <stop offset="0.94" stopColor="#f6f7fb" />
          <stop offset="1" stopColor="#d6d0e2" />
        </linearGradient>
        <linearGradient id={k.id('rim')} gradientUnits="userSpaceOnUse" x1="0" y1={y0 - 5} x2="0" y2={y1 + 5}>
          <stop offset="0" stopColor="#5d6377" />
          <stop offset="0.22" stopColor="#e4e7ef" />
          <stop offset={r2(H - 0.05)} stopColor="#3a3f51" />
          <stop offset={r2(H + 0.03)} stopColor="#fbfcff" />
          <stop offset={r2(H + (1 - H) * 0.55)} stopColor="#8b91a4" />
          <stop offset="1" stopColor="#3c4153" />
        </linearGradient>
        <linearGradient id={k.id('band')} gradientUnits="userSpaceOnUse" x1="0" y1={r2(hy - a)} x2="0" y2={r2(hy + h * 0.38)}>
          <stop offset="0" stopColor="#141824" stopOpacity={0.92} />
          <stop offset="0.3" stopColor="#2a2f40" stopOpacity={0.7} />
          <stop offset="1" stopColor="#4b5165" stopOpacity={0} />
        </linearGradient>
        <radialGradient
          id={k.id('vol')}
          gradientUnits="userSpaceOnUse"
          cx={r2(x0 + w * 0.34)}
          cy={r2(y0 + h * 0.28)}
          r={r2(Math.max(w, h) * 0.85)}
        >
          <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="0.32" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.72" stopColor="#151927" stopOpacity={0} />
          <stop offset="1" stopColor="#151927" stopOpacity={0.38} />
        </radialGradient>
        <linearGradient id={k.id('holo')} x1="0" y1="0" x2="1" y2="1">
          <HoloStops />
        </linearGradient>
        <clipPath id={k.id('clip')}>
          <path d={d} />
        </clipPath>
      </defs>
      <g strokeLinejoin="round">
        <path d={d} fill={CHROME_OUTLINE} stroke={CHROME_OUTLINE} strokeWidth={CHROME_EDGE} />
        <path d={d} fill={k.url('rim')} stroke={k.url('rim')} strokeWidth={CHROME_BEVEL} />
      </g>
      <path d={d} fill={k.url('face')} />
      <g clipPath={k.url('clip')}>
        <path d={band} fill={k.url('band')} />
        <path d={d} fill={k.url('vol')} />
        <path d={d} fill={k.url('holo')} fillOpacity={0.1} />
        {children}
      </g>
      <path d={d} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={0.9} strokeLinejoin="round" />
    </>
  )
}

/** Evenly spaced <stop>s for a holographic gradient. */
export function HoloStops({ colors = HOLO }: { colors?: readonly string[] }) {
  return (
    <>
      {colors.map((c, i) => (
        <stop key={i} offset={i / (colors.length - 1)} stopColor={c} />
      ))}
    </>
  )
}
