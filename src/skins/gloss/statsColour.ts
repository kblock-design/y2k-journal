import type { CSSProperties } from 'react'

const clamp01 = (t: number): number => (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0)

/**
 * Heat colour for t in 0..1 in the Silver colourway: pale silver (#f2f1f5) to soft hot-pink
 * (#f39ac4), the same ends as --heat-lo / --heat-hi in gloss.css. Near-black ink stays ≥ 8:1
 * across the whole ramp. Out-of-range or non-finite input is clamped / treated as 0.
 */
export function heatColour(t: number): string {
  const x = clamp01(t)
  const from = [0xf2, 0xf1, 0xf5]
  const to = [0xf3, 0x9a, 0xc4]
  const c = from.map((v, i) => Math.round(v + (to[i] - v) * x))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/**
 * Inline style for a heat cell: `--heat-at` (0–100%) places it on the active colourway's
 * --heat-lo → --heat-hi ramp (stats.css / colourways.css); `--heat-rgb` is the Silver ramp,
 * used as is in Silver and as the fallback where color-mix() is unsupported.
 */
export function heatStyle(t: number): CSSProperties {
  const x = clamp01(t)
  return { '--heat-rgb': heatColour(x), '--heat-at': `${Math.round(x * 1000) / 10}%` } as CSSProperties
}
