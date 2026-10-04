import { describe, expect, it } from 'vitest'
import type { PetHealth, PetStage } from '../../../logic/pet'
import {
  BADGES,
  CANVAS_H,
  CANVAS_W,
  CREATURES,
  EYE_W,
  EYES,
  GHOST,
  LCD_ICONS,
  MOUTHS,
  badgeLayer,
  frameLayers,
  type Grid,
  type Layer,
} from './sprites'

const STAGES: PetStage[] = ['egg', 'baby', 'teen', 'adult']
const HEALTHS: PetHealth[] = ['happy', 'sad', 'sick', 'critical', 'dead']

function expectRectangular(name: string, grid: Grid) {
  const w = grid[0].length
  grid.forEach((row, i) => {
    expect(row.length, `${name} row ${i} "${row}"`).toBe(w)
    expect(row, `${name} row ${i}`).toMatch(/^[#.]+$/)
  })
}

function pixels(layer: Layer): string[] {
  const out: string[] = []
  layer.grid.forEach((source, y) => {
    const row = layer.mirror ? [...source].reverse().join('') : source
    ;[...row].forEach((c, x) => {
      if (c === '#') out.push(`${layer.x + x},${layer.y + y}`)
    })
  })
  return out
}

function isMirrorSymmetric(grid: Grid): boolean {
  return grid.every((row) => row === [...row].reverse().join(''))
}

describe('pet sprite grids', () => {
  it('every grid is rectangular and only uses # and .', () => {
    for (const stage of STAGES) {
      CREATURES[stage].frames.forEach((g, i) => expectRectangular(`${stage}[${i}]`, g))
      const [a, b] = CREATURES[stage].frames
      expect(a[0].length, `${stage} frame widths`).toBe(b[0].length)
      expect(a[0].length % 2, `${stage} width must be even to centre`).toBe(0)
    }
    GHOST.forEach((g, i) => expectRectangular(`ghost[${i}]`, g))
    for (const [k, g] of Object.entries(EYES)) {
      expectRectangular(`eye ${k}`, g)
      expect(g[0].length).toBe(EYE_W)
    }
    for (const [k, g] of Object.entries(MOUTHS)) {
      expectRectangular(`mouth ${k}`, g)
      expect(g[0].length % 2).toBe(0)
    }
    for (const [k, frames] of Object.entries(BADGES)) {
      frames.forEach((g, i) => {
        expectRectangular(`badge ${k}[${i}]`, g)
        expect(g.length).toBe(7)
        expect(g[0].length).toBe(7)
      })
    }
    for (const [k, g] of Object.entries(LCD_ICONS)) expectRectangular(`icon ${k}`, g)
  })

  it('symmetric sprites are symmetric', () => {
    GHOST.forEach((g) => expect(isMirrorSymmetric(g)).toBe(true))
    CREATURES.adult.frames.forEach((g) => expect(isMirrorSymmetric(g)).toBe(true))
    expect(isMirrorSymmetric(BADGES.happy[0])).toBe(true)
    expect(isMirrorSymmetric(BADGES.sick[0])).toBe(true)
    expect(isMirrorSymmetric(BADGES.critical[0])).toBe(true)
    for (const g of Object.values(LCD_ICONS)) expect(isMirrorSymmetric(g)).toBe(true)
  })

  it('every stage x health stays on the canvas, and faces never overlap the body', () => {
    for (const stage of STAGES) {
      for (const health of HEALTHS) {
        for (const frame of [0, 1] as const) {
          const layers = frameLayers(stage, health, frame)
          const all = layers.flatMap(pixels)
          for (const p of all) {
            const [x, y] = p.split(',').map(Number)
            // one spare pixel above for hops, one below for droops
            expect(x >= 0 && x < CANVAS_W && y >= 1 && y < CANVAS_H - 1, `${stage}/${health}/${frame} ${p}`).toBe(true)
          }
          const body = new Set(pixels(layers[0]))
          for (const p of layers.slice(1).flatMap(pixels)) {
            expect(body.has(p), `${stage}/${health}/${frame} face pixel ${p} sits on the outline`).toBe(false)
            // ...and sits inside it: outline pixels on both sides of the same row.
            const [x, y] = p.split(',').map(Number)
            const row = [...body].map((q) => q.split(',').map(Number)).filter(([, qy]) => qy === y)
            expect(row.some(([qx]) => qx < x) && row.some(([qx]) => qx > x), `${stage}/${health}/${frame} face pixel ${p} outside body`).toBe(true)
          }
          // The badge never touches the creature, even when it hops up a pixel.
          const badge = badgeLayer(stage, health, frame)
          if (badge) {
            const badgeSet = new Set(pixels(badge))
            for (const p of all) {
              const [x, y] = p.split(',').map(Number)
              expect(badgeSet.has(`${x},${y - 1}`), `${stage}/${health} badge overlap at ${p}`).toBe(false)
            }
          }
        }
      }
    }
  })
})
