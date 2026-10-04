import type { ComponentType } from 'react'

/** Every art component receives a per-instance id prefix for its defs. */
export type ArtProps = { id: string }

/** viewBox as (minX, minY, width, height). */
export type ViewBox = readonly [number, number, number, number]

/** A sticker drawing: a component carrying its own viewBox as a static property. */
export type StickerArt = ComponentType<ArtProps> & { viewBox: ViewBox }

/** Scoped id helpers: k.id('fill') -> "<prefix>-fill", k.url('fill') -> "url(#<prefix>-fill)". */
export function keys(prefix: string) {
  return {
    id: (s: string) => `${prefix}-${s}`,
    url: (s: string) => `url(#${prefix}-${s})`,
  }
}

/** Holographic multi-stop colours (pink -> lilac -> periwinkle -> mint -> butter -> pink). */
export const HOLO = ['#ff9ad5', '#d3a6ff', '#9fc0ff', '#a8f5e4', '#fff3a6', '#ff9ad5'] as const

const r2 = (n: number) => Math.round(n * 100) / 100

/** Four-point twinkle with concave curved sides, centred on (cx, cy), tip radius r. */
export function sparklePath(cx: number, cy: number, r: number, waist = 0.1, pull = 0.35): string {
  const a = r2(r * waist)
  const b = r2(r * pull)
  const p = (x: number, y: number) => `${r2(x)} ${r2(y)}`
  return (
    `M${p(cx, cy - r)} ` +
    `C${p(cx + a, cy - b)} ${p(cx + b, cy - a)} ${p(cx + r, cy)} ` +
    `C${p(cx + b, cy + a)} ${p(cx + a, cy + b)} ${p(cx, cy + r)} ` +
    `C${p(cx - a, cy + b)} ${p(cx - b, cy + a)} ${p(cx - r, cy)} ` +
    `C${p(cx - b, cy - a)} ${p(cx - a, cy - b)} ${p(cx, cy - r)} Z`
  )
}

/** Polygon path from grid points (pixel art), scaled by u and offset by (ox, oy). */
export function pixelPath(pts: ReadonlyArray<readonly [number, number]>, ox: number, oy: number, u: number): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(ox + x * u)} ${r2(oy + y * u)}`).join(' ') + ' Z'
}

/** Stable negative animation delay from an instance id, so copies don't twinkle in sync. */
export function phase(id: string, period: number): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return `${-r2(((Math.abs(h) % 997) / 997) * period)}s`
}
