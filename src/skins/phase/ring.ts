// Geometry for the Home cycle ring: one rounded arc per run of same-phase days, sized by
// how many days of the cycle that phase covers, plus a marker on today's day.
//
// Pure (no React, no DOM) so it can be unit-tested. Angles are degrees clockwise from
// 12 o'clock; day d (1-based) owns the slice [(d − 1)·k, d·k) where k = 360 / totalDays.

import { phaseForCycleDay, phaseOn } from '../../logic/cycle'
import type { Phase } from '../../logic/cycle'
import { addDays } from '../../logic/dates'
import type { DayLog, ISODate, Settings } from '../../types'

/** A run of consecutive cycle days in the same phase (null = unknown). */
export interface RingRun {
  phase: Phase | null
  /** 1-based cycle day the run starts on. */
  startDay: number
  days: number
}

export interface RingSegment extends RingRun {
  /** Degrees clockwise from 12 o'clock. */
  startAngle: number
  /** Degrees; all sweeps add up to exactly 360. */
  sweep: number
}

export interface RingGeometry {
  /** Days the ring stands for: the cycle length, or more when the period is late. */
  totalDays: number
  segments: RingSegment[]
  /** Centre of today's slice, in degrees clockwise from 12 o'clock. */
  markerAngle: number
  /** Today is past the estimated cycle length (period late); the ring was stretched to fit today. */
  overdue: boolean
}

/** Groups per-day phases into runs, in order. */
export function phaseRuns(dayPhases: readonly (Phase | null)[]): RingRun[] {
  const runs: RingRun[] = []
  dayPhases.forEach((phase, i) => {
    const last = runs[runs.length - 1]
    if (last && last.phase === phase) last.days++
    else runs.push({ phase, startDay: i + 1, days: 1 })
  })
  return runs
}

/**
 * Ring for a cycle whose days have the given phases. `cycleDay` is today's 1-based day;
 * `cycleLength` the estimated length (only used to flag a late period). Returns null when
 * the cycle is unknown (no period logged: `cycleDay` null) or there are no days to draw.
 */
export function ringGeometry(
  dayPhases: readonly (Phase | null)[],
  cycleDay: number | null,
  cycleLength: number,
): RingGeometry | null {
  if (cycleDay === null || !Number.isFinite(cycleDay) || cycleDay < 1 || dayPhases.length === 0) return null
  const totalDays = dayPhases.length
  const perDay = 360 / totalDays
  const runs = phaseRuns(dayPhases)
  const segments = runs.map((r, i): RingSegment => {
    const startAngle = (r.startDay - 1) * perDay
    // The last segment closes the circle exactly (no floating-point sliver or overlap).
    const end = i === runs.length - 1 ? 360 : (r.startDay - 1 + r.days) * perDay
    return { ...r, startAngle, sweep: end - startAngle }
  })
  const markerDay = Math.min(cycleDay, totalDays)
  return {
    totalDays,
    segments,
    markerAngle: (markerDay - 0.5) * perDay,
    overdue: cycleDay > cycleLength,
  }
}

/**
 * Estimated phases of a whole cycle of `cycleLength` days whose period lasts `periodDays`,
 * using the same rule as the rest of the app. For previews (no period logged yet) and tests.
 */
export function estimatedCyclePhases(cycleLength: number, periodDays: number): Phase[] {
  const out: Phase[] = []
  for (let d = 1; d <= cycleLength; d++) out.push(phaseForCycleDay(d, cycleLength, periodDays))
  return out
}

/**
 * Phases of the current cycle, day by day, exactly as the calendar shows them (past days as
 * estimated, later days as predicted). Covers max(cycleLength, cycleDay) days so a late period
 * still has today on the ring.
 */
export function currentCyclePhases(
  logs: DayLog[],
  settings: Settings,
  today: ISODate,
  cycleDay: number,
  cycleLength: number,
): (Phase | null)[] {
  const start = addDays(today, -(cycleDay - 1))
  const total = Math.max(cycleLength, cycleDay)
  const out: (Phase | null)[] = []
  for (let d = 1; d <= total; d++) out.push(phaseOn(logs, addDays(start, d - 1), settings, today))
  return out
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

const rad = (deg: number) => (deg * Math.PI) / 180
const r2 = (n: number) => Math.round(n * 100) / 100

/** Point on a circle, `angle` in degrees clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  const a = rad(angle - 90)
  return [r2(cx + r * Math.cos(a)), r2(cy + r * Math.sin(a))]
}

/** Open arc path from `start` to `end` degrees (clockwise). A full turn is drawn as two halves. */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = end - start
  if (sweep >= 359.99) {
    const [x1, y1] = polar(cx, cy, r, start)
    const [x2, y2] = polar(cx, cy, r, start + 180)
    return `M${x1} ${y1}A${r} ${r} 0 1 1 ${x2} ${y2}A${r} ${r} 0 1 1 ${x1} ${y1}`
  }
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  return `M${x1} ${y1}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** Pie slice from the centre, `start` to `end` degrees (for clipping the "so far" part). */
export function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  return `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}Z`
}

/** How one segment is drawn: a round-capped arc, a dot when too short for one, or a full ring. */
export type SegmentShape =
  | { kind: 'arc'; start: number; end: number }
  | { kind: 'dot'; angle: number; radius: number }
  | { kind: 'full' }

/**
 * Fits a segment between its neighbours: the drawn arc is shortened so its round caps
 * (half the stroke width, `capDeg` degrees at the ring's radius) stop `gapDeg / 2` short of
 * each end. Segments too short for that become a dot, shrunk if needed so it never touches
 * a neighbour.
 */
export function segmentShape(
  seg: Pick<RingSegment, 'startAngle' | 'sweep'>,
  opts: { capDeg: number; gapDeg: number; ringRadius: number; strokeWidth: number; only: boolean },
): SegmentShape {
  if (opts.only) return { kind: 'full' }
  const inset = opts.capDeg + opts.gapDeg / 2
  const start = seg.startAngle + inset
  const end = seg.startAngle + seg.sweep - inset
  if (end - start >= 0.5) return { kind: 'arc', start: r2(start), end: r2(end) }
  const room = rad(Math.max(0, seg.sweep - opts.gapDeg)) * opts.ringRadius
  return {
    kind: 'dot',
    angle: r2(seg.startAngle + seg.sweep / 2),
    radius: r2(Math.max(2, Math.min(opts.strokeWidth / 2, room / 2))),
  }
}
