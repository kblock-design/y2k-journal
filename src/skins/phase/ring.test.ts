import { describe, expect, it } from 'vitest'
import { cycleStatus } from '../../logic/cycle'
import type { Phase } from '../../logic/cycle'
import { addDays } from '../../logic/dates'
import { emptyLog } from '../../core/format'
import type { DayLog, Flow, Settings } from '../../types'
import {
  arcPath,
  currentCyclePhases,
  estimatedCyclePhases,
  phaseRuns,
  polar,
  ringGeometry,
  segmentShape,
} from './ring'

const SETTINGS: Settings = { reminderTime: '20:00', defaultCycleLength: 28, defaultPeriodLength: 5, startedOn: '2026-01-01', moodTracking: 'advanced' }

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)
const order = (phases: (Phase | null)[]) => phaseRuns(phases).map((r) => r.phase)

describe('ring geometry', () => {
  it('28-day cycle: four arcs sized by their days, summing to the full circle', () => {
    const geo = ringGeometry(estimatedCyclePhases(28, 5), 1, 28)!
    expect(geo.totalDays).toBe(28)
    expect(geo.segments.map((s) => [s.phase, s.startDay, s.days])).toEqual([
      ['menstrual', 1, 5],
      ['follicular', 6, 7],
      ['ovulation', 13, 3],
      ['luteal', 16, 13],
    ])
    expect(sum(geo.segments.map((s) => s.sweep))).toBeCloseTo(360, 9)
    expect(geo.segments[0].startAngle).toBe(0)
    expect(geo.segments[1].sweep).toBeCloseTo((7 / 28) * 360, 9)
    // Contiguous: each segment starts where the previous one ends.
    for (let i = 1; i < geo.segments.length; i++) {
      const prev = geo.segments[i - 1]
      expect(geo.segments[i].startAngle).toBeCloseTo(prev.startAngle + prev.sweep, 9)
    }
    expect(geo.overdue).toBe(false)
  })

  it('places the today marker in the middle of its day slice', () => {
    const phases = estimatedCyclePhases(28, 5)
    expect(ringGeometry(phases, 1, 28)!.markerAngle).toBeCloseTo(360 / 56, 9)
    expect(ringGeometry(phases, 14, 28)!.markerAngle).toBeCloseTo((13.5 / 28) * 360, 9)
    expect(ringGeometry(phases, 28, 28)!.markerAngle).toBeCloseTo(360 - 360 / 56, 9)
  })

  it('short cycle: no follicular stretch, still a full circle', () => {
    const phases = estimatedCyclePhases(15, 5)
    expect(order(phases)).toEqual(['menstrual', 'ovulation', 'luteal'])
    const geo = ringGeometry(phases, 7, 15)!
    expect(sum(geo.segments.map((s) => s.sweep))).toBeCloseTo(360, 9)
    expect(geo.segments.find((s) => s.phase === 'ovulation')!.sweep).toBeCloseTo(24, 9)
  })

  it('long cycle: every phase present, full circle, marker on the right day', () => {
    const phases = estimatedCyclePhases(60, 5)
    expect(order(phases)).toEqual(['menstrual', 'follicular', 'ovulation', 'luteal'])
    const geo = ringGeometry(phases, 45, 60)!
    expect(sum(geo.segments.map((s) => s.sweep))).toBeCloseTo(360, 9)
    expect(geo.segments.map((s) => s.days)).toEqual([5, 39, 3, 13])
    expect(geo.markerAngle).toBeCloseTo((44.5 / 60) * 360, 9)
  })

  it('a late period stretches the ring so today stays on it', () => {
    const phases: Phase[] = [...estimatedCyclePhases(28, 5), 'luteal', 'luteal', 'luteal', 'luteal']
    const geo = ringGeometry(phases, 32, 28)!
    expect(geo.overdue).toBe(true)
    expect(geo.totalDays).toBe(32)
    expect(sum(geo.segments.map((s) => s.sweep))).toBeCloseTo(360, 9)
    expect(geo.markerAngle).toBeCloseTo((31.5 / 32) * 360, 9)
    expect(geo.markerAngle).toBeLessThan(360)
  })

  it('unknown cycle: nothing to draw', () => {
    expect(ringGeometry(estimatedCyclePhases(28, 5), null, 28)).toBeNull()
    expect(ringGeometry([], 3, 28)).toBeNull()
    expect(ringGeometry(estimatedCyclePhases(28, 5), Number.NaN, 28)).toBeNull()
  })

  it('unknown days form their own (grey) run', () => {
    const geo = ringGeometry([null, null, 'luteal', 'luteal'], 2, 4)!
    expect(geo.segments.map((s) => [s.phase, s.sweep])).toEqual([
      [null, 180],
      ['luteal', 180],
    ])
  })

  it('drawn arcs stay inside their segment; tiny segments become dots; a single phase is a full ring', () => {
    const opts = { capDeg: 7, gapDeg: 4, ringRadius: 126, strokeWidth: 32, only: false }
    const arc = segmentShape({ startAngle: 90, sweep: 90 }, opts)
    expect(arc).toEqual({ kind: 'arc', start: 99, end: 171 })
    const dot = segmentShape({ startAngle: 0, sweep: 6 }, opts)
    expect(dot.kind).toBe('dot')
    if (dot.kind === 'dot') {
      expect(dot.angle).toBe(3)
      expect(dot.radius).toBeLessThanOrEqual(16)
      expect(dot.radius).toBeGreaterThan(0)
    }
    expect(segmentShape({ startAngle: 0, sweep: 360 }, { ...opts, only: true })).toEqual({ kind: 'full' })
  })

  it('SVG helpers: angles run clockwise from 12 o’clock', () => {
    expect(polar(100, 100, 50, 0)).toEqual([100, 50])
    expect(polar(100, 100, 50, 90)).toEqual([150, 100])
    expect(polar(100, 100, 50, 180)).toEqual([100, 150])
    expect(arcPath(100, 100, 50, 0, 90)).toBe('M100 50A50 50 0 0 1 150 100')
    expect(arcPath(100, 100, 50, 0, 270)).toContain(' 0 1 1 ')
    expect(arcPath(100, 100, 50, 0, 360).match(/A/g)).toHaveLength(2)
    expect(arcPath(100, 100, 50, 0, 360)).not.toMatch(/NaN/)
  })

  it('current cycle phases match the app’s own cycle status', () => {
    const logs: DayLog[] = []
    const flow = (d: string): Flow => (d >= '2026-09-28' && d <= '2026-10-01' ? 'medium' : 'none')
    for (let d = '2026-09-25'; d <= '2026-10-03'; d = addDays(d, 1)) logs.push({ ...emptyLog(d), flow: flow(d) })
    const today = '2026-10-03'
    const status = cycleStatus(logs, today, SETTINGS)
    expect(status.cycleDay).toBe(6)
    const phases = currentCyclePhases(logs, SETTINGS, today, status.cycleDay!, status.cycleLength)
    expect(phases).toHaveLength(28)
    expect(phases[status.cycleDay! - 1]).toBe(status.phase)
    expect(order(phases)).toEqual(['menstrual', 'follicular', 'ovulation', 'luteal'])
    expect(phases.slice(0, 4).every((p) => p === 'menstrual')).toBe(true)
  })
})
