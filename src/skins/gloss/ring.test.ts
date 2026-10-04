import { describe, expect, it } from 'vitest'
import type { Phase } from '../../logic/cycle'
import { lastSevenDays, nextPeriodLine } from './home'
import {
  arcPath,
  capDegrees,
  DISC,
  discBoxes,
  discGeometry,
  estimatedCyclePhases,
  lcdDigits,
  phaseRuns,
  polar,
  segmentShape,
  wedgePath,
} from './ring'
import { heatColour } from './statsColour'

const M: Phase = 'menstrual'
const F: Phase = 'follicular'
const O: Phase = 'ovulation'
const L: Phase = 'luteal'

describe('phaseRuns / discGeometry', () => {
  it('groups consecutive phases', () => {
    expect(phaseRuns([M, M, F, F, F, O, L, L])).toEqual([
      { phase: M, startDay: 1, days: 2 },
      { phase: F, startDay: 3, days: 3 },
      { phase: O, startDay: 6, days: 1 },
      { phase: L, startDay: 7, days: 2 },
    ])
    expect(phaseRuns([])).toEqual([])
  })

  it('splits a 28-day cycle into four arcs that close the circle exactly', () => {
    const phases = estimatedCyclePhases(28, 5)
    const geo = discGeometry(phases, 6, 28)!
    expect(geo.totalDays).toBe(28)
    expect(geo.segments.map((s) => s.phase)).toEqual([M, F, O, L])
    expect(geo.segments[0].startAngle).toBe(0)
    const total = geo.segments.reduce((n, s) => n + s.sweep, 0)
    expect(total).toBeCloseTo(360, 10)
    const last = geo.segments[geo.segments.length - 1]
    expect(last.startAngle + last.sweep).toBe(360)
    // Today = day 6: the middle of its slice.
    expect(geo.markerAngle).toBeCloseTo((5.5 * 360) / 28, 10)
    expect(geo.overdue).toBe(false)
  })

  it('is null for an unknown cycle and flags a late one', () => {
    expect(discGeometry([M, F], null, 28)).toBeNull()
    expect(discGeometry([M, F], 0, 28)).toBeNull()
    expect(discGeometry([M, F], Number.NaN, 28)).toBeNull()
    expect(discGeometry([], 3, 28)).toBeNull()
    const late = discGeometry(estimatedCyclePhases(28, 5).concat([L, L, L]), 31, 28)!
    expect(late.overdue).toBe(true)
    expect(late.markerAngle).toBeCloseTo((30.5 * 360) / 31, 10)
    expect(late.markerAngle).toBeLessThan(360)
  })
})

describe('SVG helpers', () => {
  it('polar: 0° is straight up, 90° is right', () => {
    expect(polar(160, 160, 124, 0)).toEqual([160, 36])
    expect(polar(160, 160, 124, 90)).toEqual([284, 160])
    expect(polar(160, 160, 124, 180)).toEqual([160, 284])
  })

  it('arcPath uses the large-arc flag past 180° and draws a full turn as two halves', () => {
    expect(arcPath(160, 160, 124, 0, 90)).toBe('M160 36A124 124 0 0 1 284 160')
    expect(arcPath(160, 160, 124, 0, 270)).toContain(' 0 1 1 ')
    const full = arcPath(160, 160, 124, 0, 360)
    expect(full.match(/A/g)).toHaveLength(2)
    expect(full).not.toMatch(/NaN/)
  })

  it('wedgePath starts at the centre and handles a full turn', () => {
    expect(wedgePath(160, 160, 160, 0, 90)).toBe('M160 160L160 0A160 160 0 0 1 320 160Z')
    expect(wedgePath(160, 160, 160, 0, 360)).not.toMatch(/NaN/)
  })

  it('segmentShape: inset arcs, dots for tiny runs, full ring for a single run', () => {
    const capDeg = capDegrees(DISC.stroke, DISC.r)
    const opts = { capDeg, gapDeg: DISC.gapDeg, ringRadius: DISC.r, strokeWidth: DISC.stroke, only: false }
    const arc = segmentShape({ startAngle: 0, sweep: 90 }, opts)
    expect(arc.kind).toBe('arc')
    if (arc.kind === 'arc') {
      expect(arc.start).toBeCloseTo(capDeg + DISC.gapDeg / 2, 1)
      expect(arc.end).toBeCloseTo(90 - capDeg - DISC.gapDeg / 2, 1)
    }
    // One day of a 45-day cycle (8°) is too short for a capped arc: a dot that fits its slice.
    const sweep = 360 / 45
    const dot = segmentShape({ startAngle: 100, sweep }, opts)
    expect(dot.kind).toBe('dot')
    if (dot.kind === 'dot') {
      expect(dot.radius).toBeGreaterThanOrEqual(2)
      expect(dot.radius).toBeLessThanOrEqual(DISC.stroke / 2)
      const room = (((sweep - DISC.gapDeg) * Math.PI) / 180) * DISC.r
      expect(dot.radius * 2).toBeLessThanOrEqual(room + 0.01)
    }
    expect(segmentShape({ startAngle: 0, sweep: 360 }, { ...opts, only: true }).kind).toBe('full')
  })
})

describe('disc layout', () => {
  it('keeps every layer inside the next one out', () => {
    const half = DISC.size / 2
    expect(DISC.c).toBe(half)
    // LCD corners sit inside the hub.
    const lcdHalfW = (DISC.lcdW * DISC.size) / 2
    const lcdHalfH = (DISC.lcdH * DISC.size) / 2
    expect(Math.hypot(lcdHalfW, lcdHalfH)).toBeLessThan(DISC.hub - 4)
    // Hub rim (r + 3, 3 wide) clears the recessed band (stroke + 6 wide).
    expect(DISC.hub + 3 + 1.5).toBeLessThan(DISC.r - (DISC.stroke + 6) / 2)
    // Band and today's bead (with its halo) stay on the plate.
    expect(DISC.r + (DISC.stroke + 6) / 2).toBeLessThan(DISC.plate)
    expect(DISC.r + DISC.bead + 4.5).toBeLessThan(DISC.plate)
    expect(DISC.plate).toBeLessThan(half)
  })

  it('derives the plate and LCD boxes from the same numbers', () => {
    expect(discBoxes()).toEqual({
      plate: { inset: '1.25%' },
      hub: { left: '31%', right: '31%', top: '36.5%', bottom: '36.5%' },
    })
  })
})

describe('small helpers', () => {
  it('lcdDigits pads and never shows junk', () => {
    expect(lcdDigits(6)).toBe('06')
    expect(lcdDigits(33)).toBe('33')
    expect(lcdDigits(102)).toBe('102')
    expect(lcdDigits(0)).toBe('00')
    expect(lcdDigits(null)).toBe('--')
    expect(lcdDigits(Number.NaN)).toBe('--')
    expect(lcdDigits(Number.POSITIVE_INFINITY)).toBe('--')
  })

  it('nextPeriodLine covers future, tomorrow, today and late', () => {
    expect(nextPeriodLine(23, '2026-10-26')).toMatch(/^Next period in 23 days · /)
    expect(nextPeriodLine(1, '2026-10-04')).toBe('Next period expected tomorrow')
    expect(nextPeriodLine(0, '2026-10-03')).toBe('Period expected today')
    expect(nextPeriodLine(-1, '2026-10-02')).toBe('Period 1 day late')
    expect(nextPeriodLine(-4, '2026-09-29')).toBe('Period 4 days late')
    expect(nextPeriodLine(null, null)).toBeNull()
  })

  it('lastSevenDays ends today, oldest first', () => {
    const week = lastSevenDays(
      [
        { date: '2026-10-03' } as never,
        { date: '2026-10-01' } as never,
      ],
      '2026-10-03',
    )
    expect(week).toHaveLength(7)
    expect(week[0].date).toBe('2026-09-27')
    expect(week[0].letter).toBe('S') // Sunday
    expect(week[6]).toMatchObject({ date: '2026-10-03', isToday: true, logged: true, letter: 'S' })
    expect(week.filter((d) => d.logged).map((d) => d.date)).toEqual(['2026-10-01', '2026-10-03'])
  })

  it('heatColour clamps and stays a valid colour', () => {
    expect(heatColour(0)).toBe('rgb(242, 241, 245)')
    expect(heatColour(1)).toBe('rgb(243, 154, 196)')
    expect(heatColour(2)).toBe(heatColour(1))
    expect(heatColour(-1)).toBe(heatColour(0))
    expect(heatColour(Number.NaN)).toBe(heatColour(0))
  })
})
