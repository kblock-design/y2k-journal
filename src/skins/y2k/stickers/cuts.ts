// Cut-gemstone geometry: turns a girdle outline into shaded facets for <Stone> (stone.tsx).
// Light comes from the top-left, like the rest of the set.

export type Pt = readonly [number, number]
/** Facet colours, lightest first (6 steps). */
export type Ramp = readonly [string, string, string, string, string, string]

export interface StoneShape {
  outline: string
  facets: readonly { pts: string; fill: string }[]
  table: string
  /** Pavilion reflections seen through the table: triangles from the centre to each table edge. */
  reflections: readonly string[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
const toPoints = (list: readonly Pt[]) => list.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ')

/** Unit vector towards the light (top-left). */
const LX = -0.55
const LY = -0.83

/** How squarely a facet at `p` faces the light, seen from the stone's centre: -1..1. */
function facing(p: Pt, c: Pt): number {
  const dx = p[0] - c[0]
  const dy = p[1] - c[1]
  const len = Math.hypot(dx, dy) || 1
  return (dx * LX + dy * LY) / len
}

/** Ramp colour for a brightness value (about -1.2 dark .. 1.2 bright). */
function tone(ramp: Ramp, v: number): string {
  const i = Math.round(((1.2 - v) / 2.4) * 5)
  return ramp[Math.min(5, Math.max(0, i))]
}

const centroid = (list: readonly Pt[]): Pt => [
  list.reduce((s, p) => s + p[0], 0) / list.length,
  list.reduce((s, p) => s + p[1], 0) / list.length,
]

/** `poly` pulled towards `c` by factor s (0..1). */
export function shrink(poly: readonly Pt[], c: Pt, s: number): Pt[] {
  return poly.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s] as const)
}

/** n points around an ellipse, starting at `startDeg` (−90 = top), clockwise. */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n: number, startDeg = -90): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = ((startDeg + (360 * i) / n) * Math.PI) / 180
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as const
  })
}

function reflections(table: readonly Pt[], c: Pt): string[] {
  return table.map((p, i) => toPoints([c, p, table[(i + 1) % table.length]]))
}

/**
 * Brilliant-style crown: the band between girdle and table (table = girdle shrunk by
 * `tableScale` towards `c`, so `c` must see every girdle point) is split, edge by edge,
 * into four triangles around the band's midpoint: an outer one, an inner one and two side
 * ones, one lighter and one darker, which gives the pinwheel sparkle.
 */
export function brilliantCut(girdle: readonly Pt[], c: Pt, tableScale: number, ramp: Ramp): StoneShape {
  const table = shrink(girdle, c, tableScale)
  const facets: { pts: string; fill: string }[] = []
  girdle.forEach((g0, i) => {
    const n = (i + 1) % girdle.length
    const g1 = girdle[n]
    const t0 = table[i]
    const t1 = table[n]
    const m = centroid([g0, g1, t1, t0])
    const lit = facing(m, c)
    facets.push({ pts: toPoints([g0, g1, m]), fill: tone(ramp, lit) })
    facets.push({ pts: toPoints([g1, t1, m]), fill: tone(ramp, lit * 0.7 - 0.45) })
    facets.push({ pts: toPoints([t1, t0, m]), fill: tone(ramp, lit * 0.5 + 0.25) })
    facets.push({ pts: toPoints([t0, g0, m]), fill: tone(ramp, lit * 0.7 + 0.45) })
  })
  return { outline: toPoints(girdle), facets, table: toPoints(table), reflections: reflections(table, c) }
}

/**
 * Step cut: concentric rings (outermost first, the last one is the table) joined by
 * trapezoid steps. Alternate steps flip their shading, like the hall-of-mirrors look of
 * an emerald cut.
 */
export function stepCut(rings: readonly (readonly Pt[])[], c: Pt, ramp: Ramp): StoneShape {
  const facets: { pts: string; fill: string }[] = []
  for (let j = 0; j < rings.length - 1; j++) {
    const outer = rings[j]
    const inner = rings[j + 1]
    outer.forEach((a0, i) => {
      const n = (i + 1) % outer.length
      const quad = [a0, outer[n], inner[n], inner[i]] as const
      const lit = facing(centroid(quad), c)
      const v = j % 2 ? -lit * 0.6 + 0.1 : lit
      facets.push({ pts: toPoints(quad), fill: tone(ramp, v) })
    })
  }
  const table = rings[rings.length - 1]
  return { outline: toPoints(rings[0]), facets, table: toPoints(table), reflections: reflections(table, c) }
}

/** Octagon = rectangle with 45° corners cut by `cut`. */
export function octagon(x0: number, y0: number, x1: number, y1: number, cut: number): Pt[] {
  return [
    [x0 + cut, y0], [x1 - cut, y0], [x1, y0 + cut], [x1, y1 - cut],
    [x1 - cut, y1], [x0 + cut, y1], [x0, y1 - cut], [x0, y0 + cut],
  ]
}
